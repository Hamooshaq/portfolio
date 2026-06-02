# Free-Tier Deployment Guide

This portfolio is split into a lightweight Vercel frontend and separately hosted AI systems.

## Frontend: Vercel

Deploy the repository root as a Next.js app.

Build settings:

- Install command: `npm ci`
- Build command: `npm run build`
- Output: Vercel auto-detects Next.js

Environment variables:

```env
GITHUB_USERNAME=Hamooshaq
GITHUB_TOKEN=
NEXT_PUBLIC_CONTACT_EMAIL=mohishaaqq@gmail.com
NEXT_PUBLIC_LINKEDIN_URL=
NEXT_PUBLIC_RESUME_URL=/resume-mohammad.pdf
NEXT_PUBLIC_FORECASTING_APP_URL=
NEXT_PUBLIC_DEEPFAKE_SPACE_URL=
NEXT_PUBLIC_CROWD_SPACE_URL=
```

Fill the three live system URLs after deploying Render and Hugging Face Spaces.

## Forecasting: Render

Use the root `render.yaml` Blueprint.

Service behavior:

- Source folder: `deploy/forecasting-render`
- Runtime: Python 3.11
- Build: `pip install -r requirements.txt`
- Start: `streamlit run app.py --server.address=0.0.0.0 --server.port=$PORT --server.headless=true`
- Plan: Free

After Render gives you a URL, set it in Vercel:

```env
NEXT_PUBLIC_FORECASTING_APP_URL=https://your-render-service.onrender.com
```

## Deepfake: Hugging Face Spaces

Create a new public Gradio Space and upload `deploy/deepfake-space`.

Important:

- Enable Git LFS before pushing because `artifacts/model_final.pt` is a model checkpoint.
- Keep only `app.py`, `requirements.txt`, `README.md`, `.gitattributes`, and `artifacts/*`.
- Do not upload datasets, notebooks, virtual environments, or training folders.

After deployment:

```env
NEXT_PUBLIC_DEEPFAKE_SPACE_URL=https://huggingface.co/spaces/<user>/<space>
```

## Crowd Detection: Hugging Face Spaces

Create a separate public Gradio Space and upload `deploy/crowd-space`.

Important:

- Enable Git LFS before pushing because the CSRNet checkpoints are model files.
- The app lazy-loads the advanced model, and only loads the baseline model when comparison is enabled.
- Do not upload ShanghaiTech zip files, density caches, `.venv`, notebooks, or full output folders.

After deployment:

```env
NEXT_PUBLIC_CROWD_SPACE_URL=https://huggingface.co/spaces/<user>/<space>
```

## Local Verification

Frontend:

```bash
npm run lint
npm run build
```

Forecasting:

```bash
cd deploy/forecasting-render
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
streamlit run app.py
```

Deepfake:

```bash
cd deploy/deepfake-space
pip install -r requirements.txt
python app.py
```

Crowd:

```bash
cd deploy/crowd-space
pip install -r requirements.txt
python app.py
```
