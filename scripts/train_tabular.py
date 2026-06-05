#!/usr/bin/env python3
"""Train sklearn tabular model from CSV. Reads JSON config from stdin, prints JSON result to stdout."""
import json
import sys
from pathlib import Path

def main() -> int:
    try:
        cfg = json.load(sys.stdin)
        csv_path = cfg["csvPath"]
        target = cfg["targetColumn"]
        problem_type = cfg.get("problemType", "classification")
        output_dir = Path(cfg["outputDir"])
        output_dir.mkdir(parents=True, exist_ok=True)

        import pandas as pd
        import numpy as np
        from sklearn.model_selection import train_test_split
        from sklearn.preprocessing import LabelEncoder
        from sklearn.compose import ColumnTransformer
        from sklearn.preprocessing import OneHotEncoder, StandardScaler
        from sklearn.pipeline import Pipeline
        from sklearn.impute import SimpleImputer
        from sklearn.metrics import (
            accuracy_score,
            f1_score,
            r2_score,
            mean_absolute_error,
            mean_squared_error,
            classification_report,
        )
        import joblib

        df = pd.read_csv(csv_path)
        if target not in df.columns:
            raise ValueError(f"Target column '{target}' not found")

        y = df[target]
        X = df.drop(columns=[target])

        id_hints = ("id", "uuid", "index", "row_id")
        drop_cols = [c for c in X.columns if any(h in c.lower() for h in id_hints)]
        if drop_cols:
            X = X.drop(columns=drop_cols)

        numeric_cols = X.select_dtypes(include=[np.number]).columns.tolist()
        cat_cols = [c for c in X.columns if c not in numeric_cols]

        numeric_transformer = Pipeline(
            steps=[
                ("imputer", SimpleImputer(strategy="median")),
                ("scaler", StandardScaler()),
            ]
        )
        categorical_transformer = Pipeline(
            steps=[
                ("imputer", SimpleImputer(strategy="most_frequent")),
                ("onehot", OneHotEncoder(handle_unknown="ignore", max_categories=20)),
            ]
        )
        preprocessor = ColumnTransformer(
            transformers=[
                ("num", numeric_transformer, numeric_cols),
                ("cat", categorical_transformer, cat_cols),
            ]
        )

        is_regression = problem_type == "regression" and pd.api.types.is_numeric_dtype(y)

        if is_regression:
            from sklearn.ensemble import RandomForestRegressor

            model = Pipeline(
                steps=[
                    ("prep", preprocessor),
                    ("model", RandomForestRegressor(n_estimators=100, random_state=42)),
                ]
            )
            X_train, X_test, y_train, y_test = train_test_split(
                X, y, test_size=0.2, random_state=42
            )
            model.fit(X_train, y_train)
            preds = model.predict(X_test)
            metrics = {
                "problemType": "regression",
                "r2": round(float(r2_score(y_test, preds)), 4),
                "mae": round(float(mean_absolute_error(y_test, preds)), 4),
                "rmse": round(float(np.sqrt(mean_squared_error(y_test, preds))), 4),
                "trainRows": int(len(X_train)),
                "testRows": int(len(X_test)),
            }
            model_name = "RandomForestRegressor"
        else:
            from sklearn.ensemble import RandomForestClassifier

            le = LabelEncoder()
            y_enc = le.fit_transform(y.astype(str))
            model = Pipeline(
                steps=[
                    ("prep", preprocessor),
                    ("model", RandomForestClassifier(n_estimators=100, random_state=42)),
                ]
            )
            try:
                X_train, X_test, y_train, y_test = train_test_split(
                    X, y_enc, test_size=0.2, random_state=42, stratify=y_enc,
                )
            except ValueError:
                X_train, X_test, y_train, y_test = train_test_split(
                    X, y_enc, test_size=0.2, random_state=42,
                )
            model.fit(X_train, y_train)
            preds = model.predict(X_test)
            metrics = {
                "problemType": "classification",
                "accuracy": round(float(accuracy_score(y_test, preds)), 4),
                "f1Macro": round(float(f1_score(y_test, preds, average="macro")), 4),
                "trainRows": int(len(X_train)),
                "testRows": int(len(X_test)),
                "classes": le.classes_.tolist()[:20],
            }
            report = classification_report(y_test, preds, output_dict=True, zero_division=0)
            metrics["reportSummary"] = {
                k: report[k]
                for k in ("accuracy", "macro avg", "weighted avg")
                if k in report
            }
            model_name = "RandomForestClassifier"
            joblib.dump(le, output_dir / "label_encoder.joblib")

        artifact_path = output_dir / "model.joblib"
        joblib.dump(model, artifact_path)

        result = {
            "success": True,
            "modelType": model_name,
            "metrics": metrics,
            "artifactPath": str(artifact_path),
            "featureColumns": list(X.columns),
        }
        print(json.dumps(result))
        return 0
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))
        return 1


if __name__ == "__main__":
    sys.exit(main())
