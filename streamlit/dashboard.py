from pathlib import Path

import pandas as pd
import streamlit as st


BASE_DIR = Path(__file__).resolve().parents[1]
DATA_PATH = BASE_DIR / "data" / "transactions.csv"


st.set_page_config(page_title="SmartSpend Analytics", page_icon="💰", layout="wide")
st.title("SmartSpend Analytics 📊")
st.caption("A lightweight analytics view for intelligent expense categorization.")


@st.cache_data
def load_data() -> pd.DataFrame:
    frame = pd.read_csv(DATA_PATH)
    frame["date"] = pd.to_datetime(frame["date"], errors="coerce")
    frame["amount"] = pd.to_numeric(frame["amount"], errors="coerce").fillna(0)
    frame["description"] = frame["description"].fillna("").astype(str)
    frame["category"] = frame["category"].fillna("Others").astype(str).str.strip()
    return frame


def build_tips(category_totals: pd.Series, total_spend: float) -> list[str]:
    if category_totals.empty:
        return ["Upload or provide labeled transactions to generate savings suggestions."]

    top_category = category_totals.index[0]
    top_amount = float(category_totals.iloc[0])
    tips = [f"Your highest spend is {top_category} at ₹{top_amount:,.0f}. Consider a weekly cap."]

    if total_spend > 0 and top_amount / total_spend >= 0.3:
        tips.append(f"A 10% cut in {top_category} could save about ₹{top_amount * 0.1:,.0f}.")

    if "Food" in category_totals.index:
        tips.append("Plan meals in advance and compare grocery baskets against delivery orders.")
    if "Transport" in category_totals.index:
        tips.append("Consolidate trips and compare public transport with cab fares for routine travel.")
    if "Entertainment" in category_totals.index:
        tips.append("Audit recurring subscriptions monthly and remove idle services.")

    return tips[:4]


df = load_data()
category_totals = df.groupby("category")["amount"].sum().sort_values(ascending=False)
daily_spend = df.groupby(df["date"].dt.strftime("%Y-%m-%d"))["amount"].sum().sort_index()
total_spend = float(df["amount"].sum())
average_amount = float(df["amount"].mean()) if len(df) else 0.0


metric_cols = st.columns(4)
metric_cols[0].metric("Total spend", f"₹{total_spend:,.0f}")
metric_cols[1].metric("Average transaction", f"₹{average_amount:,.0f}")
metric_cols[2].metric("Transactions", f"{len(df)}")
metric_cols[3].metric("Top category", category_totals.index[0] if not category_totals.empty else "N/A")

left_col, right_col = st.columns([1.4, 1])

with left_col:
    st.subheader("Category distribution")
    st.bar_chart(category_totals)
    st.subheader("Daily spend trend")
    st.line_chart(daily_spend)

with right_col:
    st.subheader("Savings tips")
    for tip in build_tips(category_totals, total_spend):
        st.info(tip)

    st.subheader("Privacy note")
    st.write(
        "Keep transaction processing local, remove personal identifiers before analysis, and avoid exporting raw merchant strings unless needed for model training."
    )

st.subheader("Transaction sample")
st.dataframe(df.head(10), use_container_width=True)