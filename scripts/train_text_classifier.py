#!/usr/bin/env python3
"""Domain-specific text classifier (TF-IDF + LogisticRegression) — lightweight NLP fine-tuning surrogate."""
import json
import sys
from pathlib import Path


def main() -> int:
    try:
        cfg = json.load(sys.stdin)
        csv_path = cfg["csvPath"]
        text_col = cfg["textColumn"]
        label_col = cfg["labelColumn"]
        output_dir = Path(cfg["outputDir"])
        output_dir.mkdir(parents=True, exist_ok=True)

        import pandas as pd
        import numpy as np
        from sklearn.model_selection import train_test_split, cross_val_score, StratifiedKFold
        from sklearn.feature_extraction.text import TfidfVectorizer
        from sklearn.linear_model import LogisticRegression
        from sklearn.pipeline import Pipeline
        from sklearn.metrics import accuracy_score, f1_score, classification_report
        import joblib

        df = pd.read_csv(csv_path)
        if text_col not in df.columns or label_col not in df.columns:
            raise ValueError(
                f"CSV must include text column '{text_col}' and label column '{label_col}'"
            )

        raw_count = len(df)
        df = df[[text_col, label_col]].dropna()
        df[text_col] = df[text_col].astype(str).str.strip().str.lower()
        df = df[df[text_col].str.len() > 3]
        before_dedup = len(df)
        df = df.drop_duplicates(subset=[text_col])

        n_rows = len(df)
        if n_rows < 20:
            raise ValueError(
                f"Need at least 20 unique labeled text rows after cleaning; got {n_rows} "
                f"(raw={raw_count}, after filters={before_dedup}). "
                f"Use more varied text in '{text_col}' or run: npm run ml:samples"
            )

        if df[label_col].nunique() < 2:
            raise ValueError("Label column must have at least 2 classes")

        X = df[text_col]
        y = df[label_col].astype(str)

        # Small datasets: allow rare words; bigrams help domain phrases (ppm, scrubber, etc.)
        min_df = 1 if n_rows < 120 else 2
        max_features = min(8000, max(500, n_rows * 25))

        pipeline = Pipeline(
            [
                (
                    "tfidf",
                    TfidfVectorizer(
                        max_features=max_features,
                        ngram_range=(1, 2),
                        min_df=min_df,
                        sublinear_tf=True,
                        stop_words="english",
                    ),
                ),
                (
                    "clf",
                    LogisticRegression(
                        max_iter=2000,
                        random_state=42,
                        class_weight="balanced",
                        C=2.0,
                        solver="lbfgs",
                    ),
                ),
            ]
        )

        stratify = y if y.value_counts().min() >= 2 else None
        test_size = 0.2 if n_rows >= 50 else 0.25
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=test_size, random_state=42, stratify=stratify
        )
        pipeline.fit(X_train, y_train)
        preds = pipeline.predict(X_test)

        # Cross-validation on training portion for stabler estimate (important for small data)
        cv_folds = min(5, int(y_train.value_counts().min()))
        cv_mean_acc = None
        cv_mean_f1 = None
        if cv_folds >= 2:
            cv = StratifiedKFold(n_splits=cv_folds, shuffle=True, random_state=42)
            cv_acc = cross_val_score(pipeline, X_train, y_train, cv=cv, scoring="accuracy")
            cv_f1 = cross_val_score(pipeline, X_train, y_train, cv=cv, scoring="f1_macro")
            cv_mean_acc = round(float(np.mean(cv_acc)), 4)
            cv_mean_f1 = round(float(np.mean(cv_f1)), 4)

        metrics = {
            "problemType": "text_classification",
            "accuracy": round(float(accuracy_score(y_test, preds)), 4),
            "f1Macro": round(float(f1_score(y_test, preds, average="macro")), 4),
            "cvMeanAccuracy": cv_mean_acc,
            "cvMeanF1": cv_mean_f1,
            "trainRows": int(len(X_train)),
            "testRows": int(len(X_test)),
            "totalRows": n_rows,
            "vocabularySize": len(pipeline.named_steps["tfidf"].vocabulary_),
            "classes": sorted(y.unique().tolist())[:30],
        }
        report = classification_report(y_test, preds, output_dict=True, zero_division=0)
        metrics["reportSummary"] = {
            k: report[k] for k in ("accuracy", "macro avg", "weighted avg") if k in report
        }

        tips = []
        if n_rows < 100:
            tips.append("Collect more labeled inspection reports (500+ rows) for production.")
        if metrics["testRows"] < 15:
            tips.append("Test set is very small — accuracy can swing; trust cvMeanAccuracy more.")
        if cv_mean_acc and cv_mean_acc > metrics["accuracy"] + 0.15:
            tips.append("Hold-out test was harder than CV average — try another random seed or more data.")
        if cv_mean_acc and cv_mean_acc >= 0.75:
            tips.append("Cross-validation looks strong for dataset size.")
        metrics["improvementTips"] = tips

        artifact_path = output_dir / "text_classifier.joblib"
        joblib.dump(pipeline, artifact_path)

        print(
            json.dumps(
                {
                    "success": True,
                    "modelType": "TfidfVectorizer+LogisticRegression",
                    "metrics": metrics,
                    "artifactPath": str(artifact_path),
                    "textColumn": text_col,
                    "labelColumn": label_col,
                }
            )
        )
        return 0
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))
        return 1


if __name__ == "__main__":
    sys.exit(main())
