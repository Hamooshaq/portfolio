from __future__ import annotations

import json
import math
from functools import lru_cache
from pathlib import Path
from typing import Any

import cv2
import gradio as gr
import numpy as np
import timm
import torch
from PIL import Image
from torchvision import transforms


DEVICE = "cpu"
ARTIFACTS_DIR = Path(__file__).resolve().parent / "artifacts"
META_PATH = ARTIFACTS_DIR / "model_final_meta.json"
CHECKPOINT_PATH = ARTIFACTS_DIR / "model_final.pt"
EVAL_REPORT_PATH = ARTIFACTS_DIR / "eval_report.json"
IMAGENET_MEAN = (0.485, 0.456, 0.406)
IMAGENET_STD = (0.229, 0.224, 0.225)

torch.set_num_threads(1)


def load_json(path: Path, fallback: dict[str, Any]) -> dict[str, Any]:
    if not path.exists():
        return fallback
    return json.loads(path.read_text())


META = load_json(META_PATH, {})
EVAL_REPORT = load_json(EVAL_REPORT_PATH, {})
MODEL_NAME = str(META.get("model_name", "resnet50"))
IMAGE_SIZE = int(META.get("img_size", 224))
DEFAULT_THRESHOLD = float(META.get("threshold", 0.5))
DEFAULT_FRAMES = int(META.get("infer_frames_k", 16))

VAL = META.get("val_best", {})
VAL_ACC = float(VAL.get("best_video_acc", EVAL_REPORT.get("video_acc", float("nan"))))
VAL_F1 = float(VAL.get("best_video_f1", EVAL_REPORT.get("video_f1", float("nan"))))
VAL_AUC = float(VAL.get("best_video_auc", EVAL_REPORT.get("video_auc", float("nan"))))

VAL_TRANSFORM = transforms.Compose(
    [
        transforms.Resize((IMAGE_SIZE, IMAGE_SIZE)),
        transforms.ToTensor(),
        transforms.Normalize(IMAGENET_MEAN, IMAGENET_STD),
    ]
)


@lru_cache(maxsize=1)
def load_model() -> torch.nn.Module:
    if not CHECKPOINT_PATH.exists():
        raise FileNotFoundError(f"Missing checkpoint: {CHECKPOINT_PATH}")
    model = timm.create_model(MODEL_NAME, pretrained=False, num_classes=1)
    state_dict = torch.load(CHECKPOINT_PATH, map_location=DEVICE, weights_only=False)
    model.load_state_dict(state_dict)
    model.to(DEVICE)
    model.eval()
    return model


@lru_cache(maxsize=1)
def load_haar_cascade() -> cv2.CascadeClassifier | None:
    cascade_path = Path(cv2.data.haarcascades) / "haarcascade_frontalface_default.xml"
    if not cascade_path.exists():
        return None
    cascade = cv2.CascadeClassifier(str(cascade_path))
    return None if cascade.empty() else cascade


def crop_biggest_face(image: Image.Image, margin: float = 0.25, min_size: int = 40) -> Image.Image:
    cascade = load_haar_cascade()
    if cascade is None:
        return image

    rgb = np.array(image.convert("RGB"))
    gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
    faces = cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(min_size, min_size))
    if len(faces) == 0:
        return image

    x, y, width, height = max(faces, key=lambda box: box[2] * box[3])
    x_margin = int(width * margin)
    y_margin = int(height * margin)
    x0 = max(0, x - x_margin)
    y0 = max(0, y - y_margin)
    x1 = min(rgb.shape[1], x + width + x_margin)
    y1 = min(rgb.shape[0], y + height + y_margin)
    if x1 <= x0 or y1 <= y0:
        return image
    return Image.fromarray(rgb[y0:y1, x0:x1])


def sample_indices(total_frames: int, frame_count: int) -> list[int]:
    if total_frames <= 0:
        return []
    if total_frames <= frame_count:
        return list(range(total_frames))
    return np.linspace(0, total_frames - 1, frame_count).astype(int).tolist()


def sigmoid(value: float) -> float:
    return 1.0 / (1.0 + math.exp(-value))


def predict_frame(model: torch.nn.Module, image: Image.Image, use_crop: bool, margin: float) -> float:
    if use_crop:
        image = crop_biggest_face(image, margin=margin)
    tensor = VAL_TRANSFORM(image.convert("RGB")).unsqueeze(0).to(DEVICE)
    with torch.no_grad():
        logit = float(model(tensor).squeeze().item())
    return sigmoid(logit)


def predict_video(video_path: str, frame_count: int, threshold: float, use_crop: bool, margin: float):
    model = load_model()
    capture = cv2.VideoCapture(video_path)
    if not capture.isOpened():
        return "UNKNOWN", float("nan"), 0, "Could not open uploaded video.", ""

    total_frames = int(capture.get(cv2.CAP_PROP_FRAME_COUNT))
    selected = set(sample_indices(total_frames, frame_count))
    probabilities: list[float] = []
    used_frames: list[int] = []
    frame_index = 0

    while True:
        ok, frame = capture.read()
        if not ok or frame is None:
            break
        if frame_index in selected:
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            probability = predict_frame(model, Image.fromarray(rgb), use_crop=use_crop, margin=margin)
            probabilities.append(float(probability))
            used_frames.append(frame_index)
        frame_index += 1

    capture.release()
    if not probabilities:
        return "UNKNOWN", float("nan"), 0, "No frames could be sampled.", ""

    mean_probability = float(np.mean(probabilities))
    label = "FAKE" if mean_probability >= threshold else "REAL"
    details = "\n".join(
        f"frame {frame:>6}: p(fake)={probability:.4f}"
        for frame, probability in list(zip(used_frames, probabilities))[:64]
    )
    return label, mean_probability, len(probabilities), "Inference completed.", details


def ui_predict(video_file, true_label: str, use_crop: bool, frame_count: int, threshold: float, margin: float):
    if video_file is None:
        return "No file", float("nan"), 0, "N/A", "Upload a video first."

    video_path = video_file if isinstance(video_file, str) else getattr(video_file, "name", None)
    if not video_path:
        return "No file", float("nan"), 0, "N/A", "Could not read uploaded file path."

    label, probability, frames_used, status, details = predict_video(
        video_path,
        frame_count=int(frame_count),
        threshold=float(threshold),
        use_crop=bool(use_crop),
        margin=float(margin),
    )

    correctness = "N/A"
    if true_label != "Unknown" and label in {"REAL", "FAKE"}:
        correctness = "Correct" if true_label == label else "Wrong"

    return label, probability, frames_used, correctness, f"{status}\n\n{details}"


with gr.Blocks(title="Mohammad Deepfake Detector") as demo:
    gr.Markdown(
        f"""
# Deepfake Video Detector

**Model:** `{MODEL_NAME}`  
**Validation:** ACC={VAL_ACC:.4f} · F1={VAL_F1:.4f} · AUC={VAL_AUC:.4f}  
**Defaults:** threshold={DEFAULT_THRESHOLD:.2f} · frames={DEFAULT_FRAMES}

Upload a short video. The model samples frames, optionally crops the largest face, and aggregates frame-level fake probabilities.
"""
    )

    with gr.Row():
        video_input = gr.File(label="Upload video", file_types=[".mp4", ".mov", ".avi", ".mkv"])
        true_label = gr.Dropdown(["Unknown", "REAL", "FAKE"], value="Unknown", label="Optional true label")

    with gr.Row():
        use_crop = gr.Checkbox(value=True, label="Use face crop")
        frame_count = gr.Slider(4, 32, value=DEFAULT_FRAMES, step=1, label="Frames sampled")
        threshold = gr.Slider(0.05, 0.95, value=DEFAULT_THRESHOLD, step=0.01, label="Threshold")
        margin = gr.Slider(0.0, 0.6, value=0.25, step=0.05, label="Face margin")

    run_button = gr.Button("Run detection", variant="primary")

    with gr.Row():
        prediction_output = gr.Textbox(label="Prediction")
        probability_output = gr.Number(label="Confidence: P(fake)")
        frames_output = gr.Number(label="Frames used")
        correctness_output = gr.Textbox(label="Correctness")

    details_output = gr.Textbox(label="Frame-level details", lines=12)

    run_button.click(
        fn=ui_predict,
        inputs=[video_input, true_label, use_crop, frame_count, threshold, margin],
        outputs=[prediction_output, probability_output, frames_output, correctness_output, details_output],
    )


if __name__ == "__main__":
    demo.launch()
