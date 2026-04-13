from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import pickle

import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, confusion_matrix, precision_recall_fscore_support
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline


RULE_MAP: Dict[str, List[str]] = {
    "Food": ["swiggy", "zomato", "restaurant", "cafe", "food", "delivery"],
    "Transport": ["uber", "ola", "cab", "metro", "bus", "ride", "travel"],
    "Shopping": ["amazon", "amzn", "flipkart", "myntra", "shopping", "purchase"],
    "Entertainment": ["netflix", "spotify", "prime video", "hotstar", "movie", "entertainment"],
    "Housing": ["rent", "house rent", "home rent", "lease", "housing"],
    "Utilities": ["electricity", "water bill", "gas bill", "utility", "power bill", "broadband"],
}


ROBUSTNESS_CASES: List[Dict[str, str]] = [
    {"text": "SWIGGY#Order_982", "expected": "Food"},
    {"text": "Uber Trip @ Night", "expected": "Transport"},
    {"text": "AmaZon mkpl purchase", "expected": "Shopping"},
    {"text": "N3tflix sub renewal", "expected": "Entertainment"},
    {"text": "house-rent transfer", "expected": "Housing"},
    {"text": "electricitybill payment", "expected": "Utilities"},
]


def empty_evaluation_metrics() -> Dict[str, Any]:
    return {
        "evaluation_mode": "unavailable",
        "accuracy": 0.0,
        "precision_macro": 0.0,
        "recall_macro": 0.0,
        "f1_macro": 0.0,
        "labels": [],
        "confusion_matrix": [],
        "class_metrics": [],
        "sample_count": 0,
    }


def build_evaluation_metrics(
    y_true: pd.Series,
    y_pred: pd.Series,
    labels: List[str],
    mode: str,
) -> Dict[str, Any]:
    if y_true.empty:
        return empty_evaluation_metrics()

    precision, recall, f1, support = precision_recall_fscore_support(
        y_true,
        y_pred,
        labels=labels,
        zero_division=0,
    )

    class_metrics = []
    for index, label in enumerate(labels):
        class_metrics.append(
            {
                "label": label,
                "precision": float(precision[index]),
                "recall": float(recall[index]),
                "f1": float(f1[index]),
                "support": int(support[index]),
            }
        )

    return {
        "evaluation_mode": mode,
        "accuracy": float(accuracy_score(y_true, y_pred)),
        "precision_macro": float(precision.mean()) if len(precision) else 0.0,
        "recall_macro": float(recall.mean()) if len(recall) else 0.0,
        "f1_macro": float(f1.mean()) if len(f1) else 0.0,
        "labels": labels,
        "confusion_matrix": confusion_matrix(y_true, y_pred, labels=labels).tolist(),
        "class_metrics": class_metrics,
        "sample_count": int(len(y_true)),
    }


def seed_transactions() -> pd.DataFrame:
    seed_rows = [
        {"date": "2026-01-02", "amount": 340, "description": "Swiggy order", "category": "Food"},
        {"date": "2026-01-03", "amount": 620, "description": "Zomato dinner", "category": "Food"},
        {"date": "2026-01-05", "amount": 230, "description": "Cafe coffee", "category": "Food"},
        {"date": "2026-01-07", "amount": 510, "description": "Uber ride", "category": "Transport"},
        {"date": "2026-01-08", "amount": 140, "description": "Metro recharge", "category": "Transport"},
        {"date": "2026-01-09", "amount": 290, "description": "Bus pass", "category": "Transport"},
        {"date": "2026-01-11", "amount": 1999, "description": "Amazon purchase", "category": "Shopping"},
        {"date": "2026-01-12", "amount": 1250, "description": "Flipkart order", "category": "Shopping"},
        {"date": "2026-01-14", "amount": 890, "description": "Myntra t-shirt", "category": "Shopping"},
        {"date": "2026-01-15", "amount": 499, "description": "Netflix monthly", "category": "Entertainment"},
        {"date": "2026-01-16", "amount": 119, "description": "Spotify plan", "category": "Entertainment"},
        {"date": "2026-01-18", "amount": 350, "description": "Movie tickets", "category": "Entertainment"},
        {"date": "2026-01-20", "amount": 18000, "description": "House rent", "category": "Housing"},
        {"date": "2026-01-21", "amount": 18000, "description": "Monthly lease payment", "category": "Housing"},
        {"date": "2026-01-24", "amount": 1200, "description": "Electricity bill", "category": "Utilities"},
        {"date": "2026-01-25", "amount": 780, "description": "Water utility payment", "category": "Utilities"},
        {"date": "2026-01-26", "amount": 999, "description": "Broadband internet", "category": "Utilities"},
    ]
    frame = pd.DataFrame(seed_rows)
    frame["date"] = pd.to_datetime(frame["date"], errors="coerce")
    frame["amount"] = pd.to_numeric(frame["amount"], errors="coerce").fillna(0)
    frame["description"] = frame["description"].fillna("").astype(str)
    frame["category"] = frame["category"].fillna("Others").astype(str).str.strip()
    return frame


def load_transactions(data_path: Path) -> pd.DataFrame:
    empty_frame = pd.DataFrame(
        {
            "date": pd.Series(dtype="datetime64[ns]"),
            "amount": pd.Series(dtype="float64"),
            "description": pd.Series(dtype="object"),
            "category": pd.Series(dtype="object"),
        }
    )

    if not data_path.exists():
        return seed_transactions()

    frame = pd.read_csv(data_path)
    frame["date"] = pd.to_datetime(frame.get("date"), errors="coerce")
    frame["amount"] = pd.to_numeric(frame.get("amount"), errors="coerce").fillna(0)
    frame["description"] = frame.get("description", "").fillna("").astype(str)
    frame["category"] = frame.get("category", "Others").fillna("Others").astype(str).str.strip()
    return frame


def build_validation_model(frame: pd.DataFrame) -> Tuple[Optional[Pipeline], float, Dict[str, Any]]:
    if frame.empty:
        return None, 0.0, empty_evaluation_metrics()

    features = frame["description"].str.lower()
    labels = frame["category"]

    pipeline = Pipeline(
        [
            ("tfidf", TfidfVectorizer(ngram_range=(1, 2))),
            ("clf", LogisticRegression(max_iter=250)),
        ]
    )

    if labels.nunique() < 2 or labels.value_counts().min() < 2:
        pipeline.fit(features, labels)
        predicted = pd.Series(pipeline.predict(features), index=labels.index)
        metrics = build_evaluation_metrics(labels, predicted, sorted(labels.unique().tolist()), "train_only")
        return pipeline, float(metrics["accuracy"]), metrics

    class_count = int(labels.nunique())
    suggested_test_rows = max(class_count, int(round(len(frame) * 0.2)))
    if suggested_test_rows >= len(frame):
        pipeline.fit(features, labels)
        predicted = pd.Series(pipeline.predict(features), index=labels.index)
        metrics = build_evaluation_metrics(labels, predicted, sorted(labels.unique().tolist()), "train_only")
        return pipeline, float(metrics["accuracy"]), metrics

    x_train, x_test, y_train, y_test = train_test_split(
        features,
        labels,
        test_size=suggested_test_rows,
        random_state=42,
        stratify=labels,
    )

    pipeline.fit(x_train, y_train)
    y_pred = pd.Series(pipeline.predict(x_test), index=y_test.index)
    metrics = build_evaluation_metrics(y_test, y_pred, sorted(labels.unique().tolist()), "holdout")
    return pipeline, float(metrics["accuracy"]), metrics


def load_or_train_model(model_path: Path, training_frame: pd.DataFrame) -> Tuple[Optional[Pipeline], float, Dict[str, Any]]:
    if model_path.exists():
        with model_path.open("rb") as handle:
            loaded = pickle.load(handle)
        _, validation_accuracy, metrics = build_validation_model(training_frame)
        return loaded, validation_accuracy, metrics

    model, accuracy, metrics = build_validation_model(training_frame)
    if model is None:
        return None, 0.0, empty_evaluation_metrics()

    model_path.parent.mkdir(parents=True, exist_ok=True)
    with model_path.open("wb") as handle:
        pickle.dump(model, handle)
    return model, accuracy, metrics


def retrain_and_persist_model(model_path: Path, training_frame: pd.DataFrame) -> Tuple[Optional[Pipeline], float, Dict[str, Any]]:
    model, accuracy, metrics = build_validation_model(training_frame)
    if model is None:
        return None, 0.0, empty_evaluation_metrics()

    model_path.parent.mkdir(parents=True, exist_ok=True)
    with model_path.open("wb") as handle:
        pickle.dump(model, handle)
    return model, accuracy, metrics


def normalize_column_name(column_name: str) -> str:
    return "".join(character for character in str(column_name).strip().lower() if character.isalnum())


def find_column(df: pd.DataFrame, candidates: List[str]) -> Optional[str]:
    normalized_lookup = {normalize_column_name(column): column for column in df.columns}
    for candidate in candidates:
        normalized_candidate = normalize_column_name(candidate)
        if normalized_candidate in normalized_lookup:
            return normalized_lookup[normalized_candidate]

    for column in df.columns:
        normalized_column = normalize_column_name(column)
        for candidate in candidates:
            normalized_candidate = normalize_column_name(candidate)
            if normalized_candidate in normalized_column or normalized_column in normalized_candidate:
                return column

    return None


def parse_amount_series(raw_series: pd.Series) -> pd.Series:
    cleaned = raw_series.fillna("").astype(str).str.strip()
    lowered = cleaned.str.lower()

    numeric_text = (
        cleaned
        .str.replace("₹", "", regex=False)
        .str.replace("$", "", regex=False)
        .str.replace(",", "", regex=False)
        .str.replace(r"[^0-9.\-()]", "", regex=True)
    )

    numeric_values = pd.to_numeric(
        numeric_text.str.replace("(", "", regex=False).str.replace(")", "", regex=False),
        errors="coerce",
    ).fillna(0.0)

    parentheses_negative = cleaned.str.match(r"^\s*\(.*\)\s*$", na=False)
    debit_negative = lowered.str.contains(r"\bdr\b|\bdebit\b", regex=True, na=False)
    credit_positive = lowered.str.contains(r"\bcr\b|\bcredit\b", regex=True, na=False)

    values = numeric_values.copy()
    values[parentheses_negative | debit_negative] = -values[parentheses_negative | debit_negative].abs()
    values[credit_positive] = values[credit_positive].abs()
    return values


def rule_based(description: str) -> Optional[str]:
    lowered = description.lower()
    for category, keywords in RULE_MAP.items():
        if any(keyword in lowered for keyword in keywords):
            return category
    return None


def predict_category(description: str, model: Optional[Pipeline]) -> Dict[str, Any]:
    cleaned_description = str(description).strip()
    rule_category = rule_based(cleaned_description)

    if rule_category:
        return {"category": rule_category, "source": "rules", "confidence": 1.0}

    if model is None:
        return {"category": "Others", "source": "fallback", "confidence": None}

    predicted = model.predict([cleaned_description])[0]
    confidence = None
    if hasattr(model, "predict_proba"):
        probabilities = model.predict_proba([cleaned_description])[0]
        confidence = float(max(probabilities))

    return {"category": predicted, "source": "model", "confidence": confidence}


def batch_predict_categories(text_series: pd.Series, model: Optional[Pipeline]) -> pd.DataFrame:
    normalized_text = text_series.fillna("").astype(str).str.strip()
    lowered_text = normalized_text.str.lower()

    predicted_category = pd.Series([None] * len(normalized_text), index=normalized_text.index, dtype="object")
    prediction_source = pd.Series(["model"] * len(normalized_text), index=normalized_text.index, dtype="object")
    prediction_confidence = pd.Series([None] * len(normalized_text), index=normalized_text.index, dtype="object")

    for category, keywords in RULE_MAP.items():
        regex = "|".join(keywords)
        mask = lowered_text.str.contains(regex, na=False)
        unresolved = predicted_category.isna()
        apply_mask = mask & unresolved
        if apply_mask.any():
            predicted_category.loc[apply_mask] = category
            prediction_source.loc[apply_mask] = "rules"
            prediction_confidence.loc[apply_mask] = 1.0

    unresolved_mask = predicted_category.isna()
    if unresolved_mask.any():
        if model is None:
            predicted_category.loc[unresolved_mask] = "Others"
            prediction_source.loc[unresolved_mask] = "fallback"
            prediction_confidence.loc[unresolved_mask] = None
        else:
            model_inputs = normalized_text.loc[unresolved_mask].tolist()
            model_predictions = model.predict(model_inputs)
            predicted_category.loc[unresolved_mask] = model_predictions

            if hasattr(model, "predict_proba"):
                probabilities = model.predict_proba(model_inputs)
                max_probabilities = probabilities.max(axis=1)
                prediction_confidence.loc[unresolved_mask] = [float(value) for value in max_probabilities]

    return pd.DataFrame(
        {
            "predicted": predicted_category.fillna("Others"),
            "prediction_source": prediction_source,
            "prediction_confidence": prediction_confidence,
        },
        index=normalized_text.index,
    )


def run_robustness_suite(model: Optional[Pipeline]) -> Dict[str, Any]:
    if model is None:
        return {
            "total_cases": len(ROBUSTNESS_CASES),
            "passed": 0,
            "accuracy": 0.0,
            "cases": [
                {
                    "text": case["text"],
                    "expected": case["expected"],
                    "predicted": "Others",
                    "source": "fallback",
                    "pass": False,
                }
                for case in ROBUSTNESS_CASES
            ],
        }

    results = []
    passed = 0
    for case in ROBUSTNESS_CASES:
        predicted = predict_category(case["text"], model)
        is_pass = predicted["category"] == case["expected"]
        passed += int(is_pass)
        results.append(
            {
                "text": case["text"],
                "expected": case["expected"],
                "predicted": predicted["category"],
                "source": predicted.get("source"),
                "pass": is_pass,
            }
        )

    total_cases = len(ROBUSTNESS_CASES)
    return {
        "total_cases": total_cases,
        "passed": passed,
        "accuracy": float(passed / total_cases) if total_cases else 0.0,
        "cases": results,
    }
