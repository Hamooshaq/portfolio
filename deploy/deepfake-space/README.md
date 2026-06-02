---
title: Mohammad Deepfake Detector
emoji: 🧪
colorFrom: slate
colorTo: red
sdk: gradio
sdk_version: 5.6.0
app_file: app.py
python_version: 3.11
pinned: false
---

# Mohammad Deepfake Detector

A lightweight Hugging Face Space for Mohammad's computer vision experiment.

The app exposes the real inference workflow from the repository:

- upload a video
- sample frames
- optionally crop faces
- run the trained ResNet50 checkpoint
- return `REAL` / `FAKE`, confidence, and frame-level probabilities

The Space intentionally excludes training data, notebooks, and intermediate training artifacts.
