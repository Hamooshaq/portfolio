# Restaurant Inventory Forecasting - Render Deployment

This folder is the lightweight deploy artifact for the Streamlit capstone planner.

## Render settings

- Runtime: Python
- Build command: `pip install -r requirements.txt`
- Start command: `streamlit run app.py --server.address=0.0.0.0 --server.port=$PORT --server.headless=true`
- Plan: Free

## Notes

The app includes only the Streamlit UI, forecasting source package, and required CSV inputs. It does not ship local virtual environments, training caches, or unrelated artifacts.
