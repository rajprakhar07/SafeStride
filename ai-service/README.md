# SafeStride AI Microservice

FastAPI Python service for route risk scoring and journey anomaly detection.

## Setup

```bash
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
uvicorn main:app --reload --port 8000
```

## Health Check

```
GET http://localhost:8000/health
```

## Endpoints (implemented in F-22)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/risk/score-route` | Score a route for safety (0–100) |
| POST | `/anomaly/detect` | Detect anomalies in location ping sequence |

## Model Training

```bash
python data/train_model.py
```

Trained model saved to `models/risk_model.pkl`

## Reference

See `PROJECT_CONTEXT.md` §18 for full risk scoring algorithm design.
