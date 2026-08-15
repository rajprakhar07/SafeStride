# Stub created by F-00 — implemented in F-22
"""
train_model.py — F-22

SafeStride ML Risk Model Training Pipeline.

IMPORTANT:
This script expects a legitimate training dataset.
Do not present generated/demo data as real crime statistics.

Expected CSV columns:
    hour_of_day
    day_of_week
    transport_mode
    route_length_meters
    danger_spot_count
    crowd_density
    historical_incident_density
    lighting_score
    risk_score

The trained model is saved to:
    ai-service/models/risk_model.joblib
"""

from pathlib import Path

import joblib
import pandas as pd

from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder


BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
MODEL_DIR = BASE_DIR / "models"

DATASET_PATH = DATA_DIR / "training_data.csv"
MODEL_PATH = MODEL_DIR / "risk_model.joblib"


FEATURES = [
    "hour_of_day",
    "day_of_week",
    "transport_mode",
    "route_length_meters",
    "danger_spot_count",
    "crowd_density",
    "historical_incident_density",
    "lighting_score",
]

TARGET = "risk_score"


def train():
    print("SafeStride ML Risk Model")
    print("=" * 40)

    if not DATASET_PATH.exists():
        raise FileNotFoundError(
            f"\nTraining dataset not found:\n"
            f"  {DATASET_PATH}\n\n"
            f"Create training_data.csv using legitimate "
            f"historical/community safety data before training."
        )

    df = pd.read_csv(DATASET_PATH)

    required_columns = FEATURES + [TARGET]
    missing = [column for column in required_columns if column not in df.columns]

    if missing:
        raise ValueError(
            f"Dataset is missing required columns: {missing}"
        )

    df = df.dropna(subset=required_columns)

    if len(df) < 20:
        raise ValueError(
            f"Only {len(df)} usable rows found. "
            "At least 20 rows are recommended for an initial model."
        )

    X = df[FEATURES]
    y = df[TARGET].clip(0, 100)

    categorical_features = ["transport_mode"]

    numeric_features = [
        feature
        for feature in FEATURES
        if feature not in categorical_features
    ]

    preprocessor = ColumnTransformer(
        transformers=[
            (
                "categorical",
                OneHotEncoder(handle_unknown="ignore"),
                categorical_features,
            ),
            (
                "numeric",
                "passthrough",
                numeric_features,
            ),
        ]
    )

    model = RandomForestRegressor(
        n_estimators=200,
        random_state=42,
        max_depth=12,
        min_samples_leaf=2,
        n_jobs=-1,
    )

    pipeline = Pipeline(
        steps=[
            ("preprocessor", preprocessor),
            ("model", model),
        ]
    )

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.2,
        random_state=42,
    )

    print(f"Training rows : {len(X_train)}")
    print(f"Testing rows  : {len(X_test)}")
    print()

    pipeline.fit(X_train, y_train)

    predictions = pipeline.predict(X_test)

    mae = mean_absolute_error(y_test, predictions)
    r2 = r2_score(y_test, predictions)

    MODEL_DIR.mkdir(parents=True, exist_ok=True)

    joblib.dump(pipeline, MODEL_PATH)

    print("Training complete.")
    print(f"MAE           : {mae:.2f}")
    print(f"R²            : {r2:.3f}")
    print(f"Model saved   : {MODEL_PATH}")


if __name__ == "__main__":
    train()