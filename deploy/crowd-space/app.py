from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any

import gradio as gr
import matplotlib
import numpy as np
import pandas as pd
import torch
import torch.nn as nn
import torch.nn.functional as F
from PIL import Image, ImageDraw
from torchvision import transforms

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402


DEVICE = torch.device("cpu")
torch.set_num_threads(1)

ARTIFACTS_DIR = Path(__file__).resolve().parent / "artifacts"
ADVANCED_CHECKPOINT = ARTIFACTS_DIR / "legacy_stage2_advanced_best.pt"
BASELINE_CHECKPOINT = ARTIFACTS_DIR / "baseline_best.pt"
ADVANCED_METRICS = ARTIFACTS_DIR / "legacy_stage2_advanced_best_metrics.json"
BASELINE_METRICS = ARTIFACTS_DIR / "baseline_official_test_metrics.json"
COMPARISON_CSV = ARTIFACTS_DIR / "model_comparison.csv"

IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD = [0.229, 0.224, 0.225]
DOWNSAMPLE_FACTOR = 8


def make_layers(cfg: list[int | str], in_channels: int = 3, batch_norm: bool = False, dilation: bool = False) -> nn.Sequential:
    dilation_rate = 2 if dilation else 1
    layers: list[nn.Module] = []
    for value in cfg:
        if value == "M":
            layers.append(nn.MaxPool2d(kernel_size=2, stride=2))
            continue
        conv = nn.Conv2d(
            in_channels,
            int(value),
            kernel_size=3,
            padding=dilation_rate,
            dilation=dilation_rate,
        )
        if batch_norm:
            layers.extend([conv, nn.BatchNorm2d(int(value)), nn.ReLU(inplace=True)])
        else:
            layers.extend([conv, nn.ReLU(inplace=True)])
        in_channels = int(value)
    return nn.Sequential(*layers)


def make_group_norm(num_channels: int, max_groups: int = 8) -> nn.GroupNorm:
    groups = min(max_groups, num_channels)
    while groups > 1 and num_channels % groups != 0:
        groups -= 1
    return nn.GroupNorm(groups, num_channels)


class ConvNormAct(nn.Sequential):
    def __init__(
        self,
        in_channels: int,
        out_channels: int,
        kernel_size: int = 3,
        dilation: int = 1,
        activation: bool = True,
    ) -> None:
        padding = ((kernel_size - 1) // 2) * dilation
        layers: list[nn.Module] = [
            nn.Conv2d(
                in_channels,
                out_channels,
                kernel_size=kernel_size,
                padding=padding,
                dilation=dilation,
                bias=False,
            ),
            make_group_norm(out_channels),
        ]
        if activation:
            layers.append(nn.ReLU(inplace=True))
        super().__init__(*layers)


class SqueezeExcite(nn.Module):
    def __init__(self, channels: int, reduction: int = 16) -> None:
        super().__init__()
        hidden = max(8, channels // reduction)
        self.pool = nn.AdaptiveAvgPool2d(1)
        self.fc = nn.Sequential(
            nn.Conv2d(channels, hidden, kernel_size=1),
            nn.ReLU(inplace=True),
            nn.Conv2d(hidden, channels, kernel_size=1),
            nn.Sigmoid(),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return x * self.fc(self.pool(x))


class VGGFrontend(nn.Module):
    def __init__(self) -> None:
        super().__init__()
        self.frontend = make_layers([64, 64, "M", 128, 128, "M", 256, 256, 256, "M", 512, 512, 512])

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.frontend(x)


class CSRNetBaseline(nn.Module):
    def __init__(self) -> None:
        super().__init__()
        self.backbone = VGGFrontend()
        self.backend = make_layers([512, 512, 512, 256, 128, 64], in_channels=512, dilation=True)
        self.head = nn.Conv2d(64, 1, kernel_size=1)
        self.output_activation = nn.Softplus(beta=1.0)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = self.backbone(x)
        x = self.backend(x)
        x = self.head(x)
        return self.output_activation(x)


class MultiScaleContext(nn.Module):
    def __init__(self, in_channels: int = 512, branch_channels: int = 128, rates: tuple[int, ...] = (1, 2, 4, 6)) -> None:
        super().__init__()
        self.branches = nn.ModuleList(
            [ConvNormAct(in_channels, branch_channels, kernel_size=3, dilation=rate) for rate in rates]
        )
        self.image_pool = nn.Sequential(
            nn.AdaptiveAvgPool2d(1),
            ConvNormAct(in_channels, branch_channels, kernel_size=1),
        )
        fused_channels = branch_channels * (len(rates) + 1)
        self.project = nn.Sequential(
            ConvNormAct(fused_channels, 256, kernel_size=1),
            ConvNormAct(256, 256, kernel_size=3, dilation=2),
            SqueezeExcite(256),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        height, width = x.shape[-2:]
        pooled = self.image_pool(x)
        pooled = F.interpolate(pooled, size=(height, width), mode="bilinear", align_corners=False)
        features = [branch(x) for branch in self.branches]
        features.append(pooled)
        return self.project(torch.cat(features, dim=1))


class EnhancedCrowdCounter(nn.Module):
    def __init__(self, dropout: float = 0.1) -> None:
        super().__init__()
        self.backbone = VGGFrontend()
        self.context = MultiScaleContext(in_channels=512, branch_channels=128, rates=(1, 2, 4, 6))
        self.decoder = nn.Sequential(
            ConvNormAct(256, 256, kernel_size=3, dilation=2),
            nn.Dropout2d(dropout) if dropout > 0 else nn.Identity(),
            ConvNormAct(256, 128, kernel_size=3, dilation=2),
            SqueezeExcite(128),
            ConvNormAct(128, 64, kernel_size=3, dilation=1),
            nn.Conv2d(64, 1, kernel_size=1),
        )
        self.output_activation = nn.Softplus(beta=1.0)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = self.backbone(x)
        x = self.context(x)
        x = self.decoder(x)
        return self.output_activation(x)


class LegacyStage2Backend(nn.Module):
    def __init__(self, in_channels: int = 512, branch_channels: int = 128, rates: tuple[int, ...] = (1, 2, 4)) -> None:
        super().__init__()
        self.branches = nn.ModuleList(
            [
                nn.Sequential(
                    ConvNormAct(in_channels, branch_channels, kernel_size=3, dilation=rate),
                    ConvNormAct(branch_channels, branch_channels, kernel_size=3, dilation=rate),
                )
                for rate in rates
            ]
        )
        self.fuse = nn.Sequential(
            ConvNormAct(branch_channels * len(rates), 256, kernel_size=1),
            nn.Dropout2d(0.1),
            ConvNormAct(256, 256, kernel_size=3, dilation=2),
            ConvNormAct(256, 128, kernel_size=3, dilation=2),
            ConvNormAct(128, 64, kernel_size=3, dilation=1),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.fuse(torch.cat([branch(x) for branch in self.branches], dim=1))


class LegacyStage2AdvancedCounter(nn.Module):
    def __init__(self) -> None:
        super().__init__()
        self.backbone = VGGFrontend()
        self.backend = LegacyStage2Backend()
        self.head = nn.Sequential(
            ConvNormAct(64, 64, kernel_size=3, dilation=1),
            nn.Dropout2d(0.1),
            nn.Conv2d(64, 1, kernel_size=1),
        )
        self.output_activation = nn.Softplus(beta=1.0)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = self.backbone(x)
        x = self.backend(x)
        x = self.head(x)
        return self.output_activation(x)


def round_to_multiple(value: int, multiple: int) -> int:
    return max(multiple, int(round(value / multiple) * multiple))


def load_state_dict(path: Path) -> dict[str, torch.Tensor]:
    if not path.exists():
        raise FileNotFoundError(f"Missing checkpoint: {path}")
    checkpoint = torch.load(path, map_location=DEVICE, weights_only=False)
    if "model_state" in checkpoint:
        return checkpoint["model_state"]
    if "state_dict" in checkpoint:
        return checkpoint["state_dict"]
    return checkpoint


@lru_cache(maxsize=1)
def load_advanced_model() -> nn.Module:
    model = LegacyStage2AdvancedCounter()
    model.load_state_dict(load_state_dict(ADVANCED_CHECKPOINT), strict=True)
    model.to(DEVICE).eval()
    return model


@lru_cache(maxsize=1)
def load_baseline_model() -> nn.Module | None:
    if not BASELINE_CHECKPOINT.exists():
        return None
    model = CSRNetBaseline()
    model.load_state_dict(load_state_dict(BASELINE_CHECKPOINT), strict=True)
    model.to(DEVICE).eval()
    return model


def preprocess_image(image: Image.Image, max_side: int = 896) -> tuple[torch.Tensor, tuple[int, int], tuple[int, int]]:
    image = image.convert("RGB")
    original_hw = (image.height, image.width)
    scale = min(1.0, max_side / max(image.height, image.width))
    resized_height = round_to_multiple(max(64, int(round(image.height * scale))), DOWNSAMPLE_FACTOR)
    resized_width = round_to_multiple(max(64, int(round(image.width * scale))), DOWNSAMPLE_FACTOR)
    resized = image.resize((resized_width, resized_height), Image.BILINEAR)
    tensor = transforms.ToTensor()(resized)
    tensor = transforms.Normalize(mean=IMAGENET_MEAN, std=IMAGENET_STD)(tensor)
    return tensor.unsqueeze(0), original_hw, (resized_height, resized_width)


def resize_density(density_map: np.ndarray, output_hw: tuple[int, int]) -> np.ndarray:
    if density_map.shape == output_hw:
        return density_map.astype(np.float32, copy=False)
    tensor = torch.from_numpy(np.asarray(density_map, dtype=np.float32)).unsqueeze(0).unsqueeze(0)
    resized = F.interpolate(tensor, size=output_hw, mode="bilinear", align_corners=False)
    return resized.squeeze(0).squeeze(0).cpu().numpy()


def overlay_density(image: Image.Image, density_map: np.ndarray, alpha: float) -> Image.Image:
    image_np = np.asarray(image.convert("RGB"), dtype=np.float32) / 255.0
    density_display = resize_density(density_map, image_np.shape[:2])
    vmax = max(float(np.percentile(density_display, 99.5)), 1e-6)
    normalized = np.clip(density_display / vmax, 0.0, 1.0)
    heatmap = plt.get_cmap("jet")(normalized)[..., :3]
    overlay = np.clip((1.0 - alpha) * image_np + alpha * heatmap, 0.0, 1.0)
    return Image.fromarray((overlay * 255).astype(np.uint8))


def density_to_image(density_map: np.ndarray) -> Image.Image:
    vmax = max(float(np.percentile(density_map, 99.5)), 1e-6)
    normalized = np.clip(density_map / vmax, 0.0, 1.0)
    heatmap = plt.get_cmap("jet")(normalized)[..., :3]
    return Image.fromarray((heatmap * 255).astype(np.uint8))


def extract_peak_points(density_map: np.ndarray, max_points: int = 300, threshold_quantile: float = 99.7) -> np.ndarray:
    tensor = torch.from_numpy(np.asarray(density_map, dtype=np.float32)).unsqueeze(0).unsqueeze(0)
    pooled = F.max_pool2d(tensor, kernel_size=5, stride=1, padding=2)
    threshold = float(np.percentile(density_map, threshold_quantile)) if np.any(density_map > 0) else 0.0
    peak_mask = (tensor == pooled) & (tensor >= threshold)
    coords = torch.nonzero(peak_mask[0, 0], as_tuple=False).cpu().numpy()
    if len(coords) == 0:
        return np.empty((0, 2), dtype=np.int32)
    scores = density_map[coords[:, 0], coords[:, 1]]
    order = np.argsort(scores)[::-1]
    coords = coords[order[:max_points]]
    return np.stack([coords[:, 1], coords[:, 0]], axis=1).astype(np.int32)


def draw_peaks(image: Image.Image, density_map: np.ndarray) -> Image.Image:
    points = extract_peak_points(density_map)
    result = image.convert("RGB").copy()
    draw = ImageDraw.Draw(result)
    for x, y in points[:300]:
        draw.ellipse((int(x) - 3, int(y) - 3, int(x) + 3, int(y) + 3), outline=(20, 255, 130), width=2)
    return result


def predict_with_model(model: nn.Module, image: Image.Image) -> tuple[float, np.ndarray]:
    input_tensor, original_hw, _ = preprocess_image(image)
    with torch.no_grad():
        prediction = model(input_tensor.to(DEVICE))
    density = prediction.squeeze().cpu().numpy().astype(np.float32)
    display_density = resize_density(density, original_hw)
    return float(density.sum()), display_density


def read_json(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {}
    return json.loads(path.read_text())


def comparison_markdown() -> str:
    advanced_metrics = read_json(ADVANCED_METRICS)
    baseline_metrics = read_json(BASELINE_METRICS)
    comparison = ""
    if COMPARISON_CSV.exists():
        frame = pd.read_csv(COMPARISON_CSV)
        columns = [column for column in ["model", "official_test_mae", "official_test_rmse", "calibration_applied"] if column in frame.columns]
        if columns:
            header = "| " + " | ".join(columns) + " |"
            divider = "| " + " | ".join(["---"] * len(columns)) + " |"
            rows = [
                "| " + " | ".join(str(row[column]) for column in columns) + " |"
                for _, row in frame[columns].iterrows()
            ]
            comparison = "\n".join([header, divider, *rows])
    return f"""
### Model context

Advanced checkpoint metrics:
- MAE: `{advanced_metrics.get("mae", "n/a")}`
- RMSE: `{advanced_metrics.get("rmse", "n/a")}`

Baseline checkpoint metrics:
- MAE: `{baseline_metrics.get("mae", "n/a")}`
- RMSE: `{baseline_metrics.get("rmse", "n/a")}`

{comparison}
"""


def run_prediction(image: Image.Image | None, show_baseline: bool, overlay_alpha: float):
    if image is None:
        return None, None, None, "Upload an image first.", comparison_markdown()

    image = image.convert("RGB")
    advanced_model = load_advanced_model()
    advanced_count, advanced_density = predict_with_model(advanced_model, image)
    overlay = overlay_density(image, advanced_density, alpha=float(overlay_alpha))
    heatmap = density_to_image(advanced_density)
    peaks = draw_peaks(image, advanced_density)

    baseline_line = "Baseline checkpoint not loaded."
    if show_baseline:
        baseline_model = load_baseline_model()
        if baseline_model is not None:
            baseline_count, _ = predict_with_model(baseline_model, image)
            baseline_line = f"CSRNet baseline estimate: {baseline_count:.1f}"

    summary = f"""
### Prediction

- AdvancedCSRNet estimate: **{advanced_count:.1f} people**
- {baseline_line}
- Image size: `{image.width} x {image.height}`
- The heatmap is the model density output resized back to the uploaded image size.
"""
    return overlay, heatmap, peaks, summary, comparison_markdown()


with gr.Blocks(title="Mohammad Crowd Detection") as demo:
    gr.Markdown(
        """
# Crowd Detection Stage 2

Upload a crowd image to run the Stage 2 density-map inference workflow. The advanced model uses multi-scale context and channel attention to estimate crowd count from a generated density map.
"""
    )

    with gr.Row():
        image_input = gr.Image(type="pil", label="Upload crowd image")
        with gr.Column():
            show_baseline = gr.Checkbox(value=False, label="Also run CSRNet baseline")
            overlay_alpha = gr.Slider(0.1, 0.9, value=0.42, step=0.05, label="Heatmap overlay opacity")
            run_button = gr.Button("Estimate crowd", variant="primary")

    with gr.Row():
        overlay_output = gr.Image(label="Density overlay", type="pil")
        heatmap_output = gr.Image(label="Density map", type="pil")
        peaks_output = gr.Image(label="Peak proposals", type="pil")

    prediction_output = gr.Markdown()
    metrics_output = gr.Markdown(value=comparison_markdown())

    run_button.click(
        fn=run_prediction,
        inputs=[image_input, show_baseline, overlay_alpha],
        outputs=[overlay_output, heatmap_output, peaks_output, prediction_output, metrics_output],
    )


if __name__ == "__main__":
    demo.launch()
