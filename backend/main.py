from pathlib import Path
from typing import Any, Dict, List, Optional

import pickle

import pandas as pd
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline


BASE_DIR = Path(__file__).resolve().parents[1]
DATA_PATH = BASE_DIR / "data" / "transactions.csv"
MODEL_PATH = BASE_DIR / "models" / "model.pkl"

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


def load_transactions() -> pd.DataFrame:
    empty_frame = pd.DataFrame(
        {
            "date": pd.Series(dtype="datetime64[ns]"),
            "amount": pd.Series(dtype="float64"),
            "description": pd.Series(dtype="object"),
            "category": pd.Series(dtype="object"),
        }
    )

    if not DATA_PATH.exists():
        return empty_frame

    frame = pd.read_csv(DATA_PATH)
    frame["date"] = pd.to_datetime(frame["date"], errors="coerce")
    frame["amount"] = pd.to_numeric(frame["amount"], errors="coerce").fillna(0)
    frame["description"] = frame["description"].fillna("").astype(str)
    frame["category"] = frame["category"].fillna("Others").astype(str).str.strip()
    return frame


def build_validation_model(frame: pd.DataFrame) -> tuple[Optional[Pipeline], float]:
    if frame.empty:
        return None, 0.0

    features = frame["description"].str.lower()
    labels = frame["category"]

    pipeline = Pipeline(
        [
            ("tfidf", TfidfVectorizer(ngram_range=(1, 2))),
            ("clf", LogisticRegression(max_iter=200)),
        ]
    )

    if labels.nunique() < 2 or labels.value_counts().min() < 2:
        pipeline.fit(features, labels)
        return pipeline, 1.0

    x_train, x_test, y_train, y_test = train_test_split(
        features,
        labels,
        test_size=0.2,
        random_state=42,
        stratify=labels,
    )

    pipeline.fit(x_train, y_train)
    accuracy = accuracy_score(y_test, pipeline.predict(x_test))
    return pipeline, float(accuracy)


def load_model() -> Optional[Pipeline]:
    if MODEL_PATH.exists():
        with open(MODEL_PATH, "rb") as handle:
            return pickle.load(handle)

    fallback_model, _ = build_validation_model(load_transactions())
    if fallback_model is None:
        return None

    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(MODEL_PATH, "wb") as handle:
        pickle.dump(fallback_model, handle)
    return fallback_model


def rule_based(description: str) -> Optional[str]:
    lowered = description.lower()
    rule_map = {
        "Food": ["swiggy", "zomato", "restaurant", "cafe", "food", "delivery"],
        "Transport": ["uber", "ola", "cab", "metro", "bus", "ride", "travel"],
        "Shopping": ["amazon", "amzn", "flipkart", "myntra", "shopping", "purchase"],
        "Entertainment": ["netflix", "spotify", "prime video", "hotstar", "movie", "entertainment"],
        "Housing": ["rent", "house rent", "home rent", "lease", "housing"],
        "Utilities": ["electricity", "water bill", "gas bill", "utility", "power bill", "broadband"],
    }

    for category, keywords in rule_map.items():
        if any(keyword in lowered for keyword in keywords):
            return category
    return None


def batch_predict_categories(text_series: pd.Series) -> pd.DataFrame:
    normalized_text = text_series.fillna("").astype(str).str.strip()
    lowered_text = normalized_text.str.lower()

    predicted_category = pd.Series([None] * len(normalized_text), index=normalized_text.index, dtype="object")
    prediction_source = pd.Series(["model"] * len(normalized_text), index=normalized_text.index, dtype="object")
    prediction_confidence = pd.Series([None] * len(normalized_text), index=normalized_text.index, dtype="object")

    rule_map = {
        "Food": ["swiggy", "zomato", "restaurant", "cafe", "food", "delivery"],
        "Transport": ["uber", "ola", "cab", "metro", "bus", "ride", "travel"],
        "Shopping": ["amazon", "amzn", "flipkart", "myntra", "shopping", "purchase"],
        "Entertainment": ["netflix", "spotify", "prime video", "hotstar", "movie", "entertainment"],
        "Housing": ["rent", "house rent", "home rent", "lease", "housing"],
        "Utilities": ["electricity", "water bill", "gas bill", "utility", "power bill", "broadband"],
    }

    for category, keywords in rule_map.items():
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


def predict_category(description: str) -> Dict[str, Any]:
    cleaned_description = str(description).strip()
    rule_category = rule_based(cleaned_description)

    if rule_category:
        return {
            "category": rule_category,
            "source": "rules",
            "confidence": 1.0,
        }

    if model is None:
        return {
            "category": "Others",
            "source": "fallback",
            "confidence": None,
        }

    predicted = model.predict([cleaned_description])[0]
    confidence = None
    if hasattr(model, "predict_proba"):
        probabilities = model.predict_proba([cleaned_description])[0]
        confidence = float(max(probabilities))

    return {
        "category": predicted,
        "source": "model",
        "confidence": confidence,
    }


def category_tips(category_totals: Dict[str, float], total_spend: float) -> List[str]:
    if not category_totals:
        return ["No expenses detected yet. Upload a CSV to generate insights."]

    sorted_categories = sorted(category_totals.items(), key=lambda item: item[1], reverse=True)
    top_category, top_amount = sorted_categories[0]
    tips = [
        f"Your highest spend is {top_category} at ₹{top_amount:,.0f}. Set a weekly cap there first.",
    ]

    if total_spend > 0:
        share = top_amount / total_spend
        if share >= 0.3:
            tips.append(
                f"{top_category} accounts for {share:.0%} of spending. A 10% cut could save about ₹{top_amount * 0.1:,.0f}."
            )

    if "Food" in category_totals:
        tips.append("Batch food deliveries or move one or two orders to planned grocery meals each week.")
    if "Transport" in category_totals:
        tips.append("Combine short trips and compare cab versus metro costs for repetitive commutes.")
    if "Subscriptions" in category_totals or "Entertainment" in category_totals:
        tips.append("Review recurring subscriptions monthly and remove services you did not use.")

    return tips[:4]


def summarize_transactions(frame: pd.DataFrame, accuracy: float) -> Dict[str, Any]:
    total_spend = float(frame["amount"].sum())
    transaction_count = int(len(frame))
    average_amount = float(frame["amount"].mean()) if transaction_count else 0.0

    category_totals_series = frame.groupby("category")["amount"].sum().sort_values(ascending=False)
    category_totals = {category: float(amount) for category, amount in category_totals_series.items()}
    top_category = next(iter(category_totals), None)

    daily_spend = (
        frame.assign(day=frame["date"].dt.strftime("%Y-%m-%d"))
        .groupby("day", as_index=False)["amount"]
        .sum()
        .sort_values("day")
        .to_dict(orient="records")
    )

    merchant_totals = (
        frame.groupby("description", as_index=False)["amount"]
        .sum()
        .sort_values("amount", ascending=False)
        .head(5)
        .to_dict(orient="records")
    )

    predicted_preview = []
    for _, row in frame.head(8).iterrows():
        predicted = predict_category(row["description"])
        predicted_preview.append(
            {
                "date": row["date"].strftime("%Y-%m-%d") if pd.notna(row["date"]) else None,
                "amount": float(row["amount"]),
                "description": row["description"],
                "actual_category": row["category"],
                "predicted_category": predicted["category"],
                "source": predicted["source"],
            }
        )

    return {
        "total_spend": total_spend,
        "transaction_count": transaction_count,
        "average_amount": average_amount,
        "model_accuracy": accuracy,
        "top_category": top_category,
        "category_totals": category_totals,
        "daily_spend": daily_spend,
        "merchant_totals": merchant_totals,
        "transactions": predicted_preview,
        "savings_tips": category_tips(category_totals, total_spend),
        "privacy_note": (
            "Keep transaction processing local, minimize shared raw descriptors, and strip PII before training or analytics exports."
        ),
        "advanced_features": [
            "Rule-based fallback for noisy merchant names",
            "Text model trained on labeled transaction descriptions",
            "Spending distribution and daily trend analytics",
            "Targeted savings suggestions derived from category concentration",
        ],
    }


def summarize_uploaded_rows(frame: pd.DataFrame) -> Dict[str, Any]:
    amount_series = pd.to_numeric(frame.get("amount", pd.Series([0] * len(frame))), errors="coerce").fillna(0)
    category_series = frame.get("predicted", pd.Series(["Others"] * len(frame))).fillna("Others").astype(str)

    total_spend = float(amount_series.sum())
    transaction_count = int(len(frame))
    average_amount = float(amount_series.mean()) if transaction_count else 0.0

    category_totals_series = (
        pd.DataFrame({"category": category_series, "amount": amount_series})
        .groupby("category")["amount"]
        .sum()
        .sort_values(ascending=False)
    )
    category_totals = {category: float(amount) for category, amount in category_totals_series.items()}
    top_category = next(iter(category_totals), None)

    daily_spend = []
    if "date" in frame.columns:
        parsed_dates = pd.to_datetime(frame["date"], errors="coerce")
        daily_spend = (
            pd.DataFrame({"day": parsed_dates.dt.strftime("%Y-%m-%d"), "amount": amount_series})
            .dropna(subset=["day"])
            .groupby("day", as_index=False)["amount"]
            .sum()
            .sort_values("day")
            .to_dict(orient="records")
        )

    display_rows = frame.copy()
    display_rows["amount"] = amount_series
    display_rows["category"] = category_series

    return {
        "total_spend": total_spend,
        "transaction_count": transaction_count,
        "average_amount": average_amount,
        "top_category": top_category,
        "category_totals": category_totals,
        "daily_spend": daily_spend,
        "transactions": display_rows.to_dict(orient="records"),
        "savings_tips": category_tips(category_totals, total_spend),
        "privacy_note": (
            "Keep transaction processing local, minimize shared raw descriptors, and strip PII before training or analytics exports."
        ),
        "advanced_features": [
            "Hybrid rules-plus-model classification",
            "Automatic detection of messy bank CSV headers",
            "Filterable and sortable uploaded transaction preview",
            "Category-based savings guidance",
        ],
    }


transactions = load_transactions()
model = load_model()
_, MODEL_ACCURACY = build_validation_model(transactions)


@app.get("/health")
def health() -> Dict[str, Any]:
    return {
        "status": "ok",
        "transactions": int(len(transactions)),
        "accuracy": MODEL_ACCURACY,
        "categories": sorted(transactions["category"].unique().tolist()),
    }


@app.get("/dashboard")
def dashboard() -> Dict[str, Any]:
    return summarize_transactions(transactions, MODEL_ACCURACY)


@app.post("/predict")
def predict(data: Dict[str, Any]) -> Dict[str, Any]:
    description = data.get("description", "")
    if not str(description).strip():
        raise HTTPException(status_code=400, detail="description is required")

    return predict_category(description)


@app.post("/bulk_predict")
async def bulk_predict(file: UploadFile = File(...)) -> Dict[str, Any]:
    try:
        df = pd.read_csv(file.file)

        df.columns = [str(column).strip() for column in df.columns]

        text_column = find_column(
            df,
            [
                "description",
                "merchant",
                "merchant name",
                "narration",
                "details",
                "text",
                "remarks",
                "particulars",
                "transaction description",
                "transaction details",
                "payee",
                "vendor",
                "note",
            ],
        )

        amount_column = find_column(
            df,
            [
                "amount",
                "transaction amount",
                "debit",
                "debit amount",
                "credit",
                "credit amount",
                "value",
                "amt",
                "price",
            ],
        )

        if text_column is None:
            raise HTTPException(
                status_code=400,
                detail=(
                    "No valid text column found. Expected something like description, merchant, "
                    f"narration, details, or text. Found: {list(df.columns)}"
                ),
            )

        text_values = df[text_column].fillna("").astype(str).str.strip()
        if text_values.eq("").all():
            raise HTTPException(status_code=400, detail=f"Column '{text_column}' does not contain any usable transaction text.")

        if amount_column is not None:
            amount_values = pd.to_numeric(df[amount_column], errors="coerce").fillna(0)
        else:
            amount_values = pd.Series([0] * len(df), index=df.index, dtype="float64")

        df["description"] = text_values
        df["amount"] = amount_values.astype(float)
        df["source_text_column"] = text_column
        df["source_amount_column"] = amount_column if amount_column is not None else ""

        predictions = batch_predict_categories(text_values)
        df["predicted"] = predictions["predicted"]
        df["prediction_source"] = predictions["prediction_source"]
        df["prediction_confidence"] = predictions["prediction_confidence"]

        analytics = summarize_uploaded_rows(df)

        return {
            "rows": df.to_dict(orient="records"),
            "summary": df["predicted"].value_counts().to_dict(),
            "analytics": analytics,
            "detected_column": text_column,
            "detected_amount_column": amount_column,
        }

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))