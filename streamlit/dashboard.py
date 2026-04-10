from __future__ import annotations

from io import BytesIO
from pathlib import Path
import sys
from typing import Dict, List

import pandas as pd
import requests
import streamlit as st


BASE_DIR = Path(__file__).resolve().parents[1]
DATA_PATH = BASE_DIR / "data" / "transactions.csv"
MODEL_PATH = BASE_DIR / "models" / "model.pkl"
BACKEND_DIR = BASE_DIR / "backend"

if str(BACKEND_DIR) not in sys.path:
    sys.path.append(str(BACKEND_DIR))

from model.ml_utils import (  # noqa: E402
    batch_predict_categories,
    find_column,
    load_or_train_model,
    load_transactions,
    parse_amount_series,
    predict_category,
)


st.set_page_config(page_title="SmartSpend Analytics", page_icon="💡", layout="wide")
st.title("SmartSpend Intelligence Studio")
st.caption("Real analytics + working ML predictions for transaction data.")


@st.cache_data
def load_base_data() -> pd.DataFrame:
    return load_transactions(DATA_PATH)


@st.cache_resource
def load_model_resource(df: pd.DataFrame):
    return load_or_train_model(MODEL_PATH, df)


def build_tips(category_totals: Dict[str, float], total_spend: float) -> List[str]:
    if not category_totals:
        return ["Upload or provide labeled transactions to generate savings suggestions."]

    sorted_items = sorted(category_totals.items(), key=lambda item: item[1], reverse=True)
    top_category, top_amount = sorted_items[0]
    tips = [f"Highest spend: {top_category} at INR {top_amount:,.0f}. Add a weekly cap."]

    if total_spend > 0 and top_amount / total_spend >= 0.3:
        tips.append(f"A 10% cut in {top_category} saves about INR {top_amount * 0.1:,.0f}.")

    if "Food" in category_totals:
        tips.append("Plan meals and compare grocery baskets against delivery orders.")
    if "Transport" in category_totals:
        tips.append("Bundle short trips and compare metro vs cab for repeat routes.")

    return tips[:4]


def infer_upload_columns(df: pd.DataFrame):
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
    return text_column, amount_column


base_df = load_base_data()
model, model_accuracy = load_model_resource(base_df)

if base_df.empty:
    st.warning("No base transactions found at data/transactions.csv. Upload data below to run predictions.")

backend_url = st.sidebar.text_input("Backend URL", "http://127.0.0.1:8000")
if st.sidebar.button("Check backend realtime status"):
    try:
        status = requests.get(f"{backend_url}/health", timeout=2).json()
        st.sidebar.success(
            f"Backend: {status.get('status')} | Accuracy: {status.get('accuracy', 0):.2f} | Active jobs: {status.get('active_jobs', 0)}"
        )
    except Exception as exc:
        st.sidebar.error(f"Backend unavailable: {exc}")

category_totals_series = base_df.groupby("category")["amount"].sum().sort_values(ascending=False) if not base_df.empty else pd.Series(dtype="float64")
category_totals = {category: float(amount) for category, amount in category_totals_series.items()}
daily_spend = base_df.groupby(base_df["date"].dt.strftime("%Y-%m-%d"))["amount"].sum().sort_index() if not base_df.empty else pd.Series(dtype="float64")
total_spend = float(base_df["amount"].sum()) if not base_df.empty else 0.0
average_amount = float(base_df["amount"].mean()) if len(base_df) else 0.0

metric_cols = st.columns(5)
metric_cols[0].metric("Total spend", f"INR {total_spend:,.0f}")
metric_cols[1].metric("Average transaction", f"INR {average_amount:,.0f}")
metric_cols[2].metric("Transactions", f"{len(base_df)}")
metric_cols[3].metric("Top category", category_totals_series.index[0] if not category_totals_series.empty else "N/A")
metric_cols[4].metric("Model accuracy", f"{model_accuracy * 100:.1f}%")

left_col, right_col = st.columns([1.4, 1])

with left_col:
    st.subheader("Category distribution")
    st.bar_chart(category_totals_series)
    st.subheader("Daily spend trend")
    st.line_chart(daily_spend)

with right_col:
    st.subheader("Savings tips")
    for tip in build_tips(category_totals, total_spend):
        st.info(tip)

    st.subheader("Single transaction prediction")
    description = st.text_input("Description", placeholder="e.g. Uber trip to office")
    if st.button("Predict category"):
        if not description.strip():
            st.warning("Enter a description first.")
        else:
            result = predict_category(description, model)
            st.success(f"Category: {result['category']} ({result['source']})")
            if result.get("confidence") is not None:
                st.caption(f"Confidence: {result['confidence'] * 100:.1f}%")

st.subheader("Batch classify uploaded CSV")
uploaded_file = st.file_uploader("Upload CSV", type=["csv"])

if uploaded_file is not None:
    upload_df = pd.read_csv(BytesIO(uploaded_file.getvalue()))
    upload_df.columns = [str(column).strip() for column in upload_df.columns]

    text_column, amount_column = infer_upload_columns(upload_df)

    if text_column is None:
        st.error(f"No text column found in uploaded CSV. Columns: {list(upload_df.columns)}")
    else:
        text_values = upload_df[text_column].fillna("").astype(str).str.strip()
        amount_values = (
            parse_amount_series(upload_df[amount_column])
            if amount_column is not None
            else pd.Series([0] * len(upload_df), index=upload_df.index, dtype="float64")
        )

        predictions = batch_predict_categories(text_values, model)

        upload_df["description"] = text_values
        upload_df["amount"] = amount_values.astype(float)
        upload_df["predicted"] = predictions["predicted"]
        upload_df["prediction_source"] = predictions["prediction_source"]
        upload_df["prediction_confidence"] = predictions["prediction_confidence"]

        upload_summary = upload_df["predicted"].value_counts()
        st.write("Detected columns", {"text": text_column, "amount": amount_column})
        st.bar_chart(upload_summary)
        st.dataframe(upload_df.head(50), use_container_width=True)

st.subheader("Base transaction sample")
st.dataframe(base_df.head(20), use_container_width=True)
