from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional
from uuid import uuid4

import pandas as pd
from fastapi import FastAPI, File, HTTPException, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from model.ml_utils import (
    batch_predict_categories,
    find_column,
    load_or_train_model,
    load_transactions,
    parse_amount_series,
    predict_category,
    retrain_and_persist_model,
)


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


transactions = load_transactions(DATA_PATH)
model, MODEL_ACCURACY = load_or_train_model(MODEL_PATH, transactions)

JOB_STATUS: Dict[str, Dict[str, Any]] = {}


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def update_job(job_id: str, *, status: str, progress: int, message: str, rows: int = 0) -> None:
    JOB_STATUS[job_id] = {
        "job_id": job_id,
        "status": status,
        "progress": max(0, min(100, int(progress))),
        "message": message,
        "rows": int(rows),
        "updated_at": now_iso(),
    }


def category_tips(category_totals: Dict[str, float], total_spend: float) -> List[str]:
    if not category_totals:
        return ["No expenses detected yet. Upload a CSV to generate insights."]

    sorted_categories = sorted(category_totals.items(), key=lambda item: item[1], reverse=True)
    top_category, top_amount = sorted_categories[0]
    tips = [
        f"Your highest spend is {top_category} at INR {top_amount:,.0f}. Set a weekly cap there first.",
    ]

    if total_spend > 0:
        share = top_amount / total_spend
        if share >= 0.3:
            tips.append(
                f"{top_category} is {share:.0%} of spending. A 10% cut could save about INR {top_amount * 0.1:,.0f}."
            )

    if "Food" in category_totals:
        tips.append("Batch food deliveries or move one or two orders to planned grocery meals each week.")
    if "Transport" in category_totals:
        tips.append("Combine short trips and compare cab versus metro costs for repetitive commutes.")
    if "Subscriptions" in category_totals or "Entertainment" in category_totals:
        tips.append("Review recurring subscriptions monthly and remove services you did not use.")

    return tips[:4]


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
        predicted = predict_category(row["description"], model)
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


def server_snapshot() -> Dict[str, Any]:
    active_jobs = [job for job in JOB_STATUS.values() if job.get("status") in {"queued", "running"}]
    latest_job = max(JOB_STATUS.values(), key=lambda value: value.get("updated_at", ""), default=None)

    return {
        "status": "ok",
        "server_time": now_iso(),
        "transactions": int(len(transactions)),
        "accuracy": float(MODEL_ACCURACY),
        "model_loaded": model is not None,
        "active_jobs": len(active_jobs),
        "latest_job": latest_job,
    }


@app.get("/health")
def health() -> Dict[str, Any]:
    response = server_snapshot()
    response["categories"] = sorted(transactions["category"].unique().tolist()) if not transactions.empty else []
    return response


@app.get("/dashboard")
def dashboard() -> Dict[str, Any]:
    return summarize_transactions(transactions, MODEL_ACCURACY)


@app.post("/predict")
def predict(data: Dict[str, Any]) -> Dict[str, Any]:
    description = data.get("description", "")
    if not str(description).strip():
        raise HTTPException(status_code=400, detail="description is required")

    return predict_category(description, model)


@app.get("/jobs/{job_id}")
def get_job(job_id: str) -> Dict[str, Any]:
    job = JOB_STATUS.get(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="job not found")
    return job


@app.post("/retrain")
def retrain_model() -> Dict[str, Any]:
    global model, MODEL_ACCURACY, transactions

    transactions = load_transactions(DATA_PATH)
    model, MODEL_ACCURACY = retrain_and_persist_model(MODEL_PATH, transactions)

    if model is None:
        raise HTTPException(status_code=400, detail="Unable to train model. Dataset is empty or invalid.")

    return {
        "status": "retrained",
        "accuracy": MODEL_ACCURACY,
        "transactions": int(len(transactions)),
        "updated_at": now_iso(),
    }


@app.websocket("/ws/realtime")
async def realtime_socket(websocket: WebSocket) -> None:
    await websocket.accept()
    try:
        while True:
            await websocket.send_json(server_snapshot())
            await asyncio.sleep(2)
    except WebSocketDisconnect:
        return


@app.post("/bulk_predict")
async def bulk_predict(file: UploadFile = File(...), job_id: Optional[str] = None) -> Dict[str, Any]:
    current_job_id = job_id or str(uuid4())
    update_job(current_job_id, status="queued", progress=5, message="Starting upload processing")

    try:
        update_job(current_job_id, status="running", progress=15, message="Reading CSV")
        df = pd.read_csv(file.file)
        df.columns = [str(column).strip() for column in df.columns]

        update_job(current_job_id, status="running", progress=35, message="Detecting columns", rows=len(df))
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
            raise HTTPException(status_code=400, detail=f"Column '{text_column}' has no usable transaction text.")

        if amount_column is not None:
            amount_values = parse_amount_series(df[amount_column])
        else:
            amount_values = pd.Series([0] * len(df), index=df.index, dtype="float64")

        df["description"] = text_values
        df["amount"] = amount_values.astype(float)
        df["source_text_column"] = text_column
        df["source_amount_column"] = amount_column if amount_column is not None else ""

        update_job(current_job_id, status="running", progress=60, message="Running hybrid model predictions", rows=len(df))
        predictions = batch_predict_categories(text_values, model)
        df["predicted"] = predictions["predicted"]
        df["prediction_source"] = predictions["prediction_source"]
        df["prediction_confidence"] = predictions["prediction_confidence"]

        update_job(current_job_id, status="running", progress=85, message="Building analytics", rows=len(df))
        analytics = summarize_uploaded_rows(df)

        update_job(current_job_id, status="completed", progress=100, message="Completed", rows=len(df))
        return {
            "job_id": current_job_id,
            "rows": df.to_dict(orient="records"),
            "summary": df["predicted"].value_counts().to_dict(),
            "analytics": analytics,
            "detected_column": text_column,
            "detected_amount_column": amount_column,
        }

    except HTTPException as exc:
        update_job(current_job_id, status="failed", progress=100, message=str(exc.detail))
        raise
    except Exception as exc:
        update_job(current_job_id, status="failed", progress=100, message=str(exc))
        raise HTTPException(status_code=500, detail=str(exc))
