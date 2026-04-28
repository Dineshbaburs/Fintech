from __future__ import annotations

import asyncio
import os
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional
from uuid import uuid4

import pandas as pd
from fastapi import FastAPI, File, HTTPException, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import requests

from model.ml_utils import (
    batch_predict_categories,
    find_column,
    load_or_train_model,
    load_transactions,
    parse_amount_series,
    predict_category,
    retrain_and_persist_model,
    run_robustness_suite,
)
from model.insights import (
    build_account_summary,
    build_budget_status,
    build_csv_quality_report,
    build_report_text,
    compute_health_score,
    detect_anomalies,
    detect_duplicates,
    detect_recurring_transactions,
    evaluate_goals,
    forecast_next_month_spend,
)


BASE_DIR = Path(__file__).resolve().parents[1]
DATA_PATH = BASE_DIR / "data" / "transactions.csv"
MODEL_PATH = BASE_DIR / "models" / "model.pkl"

load_dotenv(BASE_DIR / "backend" / ".env")
load_dotenv(BASE_DIR / ".env")

LLM_PROVIDER = os.getenv("LLM_PROVIDER", "").strip().lower()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "").strip()
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini").strip() or "gpt-4o-mini"
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434").strip() or "http://127.0.0.1:11434"
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2").strip() or "llama3.2"
OPENAI_CHAT_COMPLETIONS_URL = "https://api.openai.com/v1/chat/completions"
OLLAMA_CHAT_URL = f"{OLLAMA_BASE_URL.rstrip('/')}/api/chat"


def preferred_llm_provider() -> str:
    if LLM_PROVIDER in {"openai", "ollama", "rules"}:
        return LLM_PROVIDER
    return "rules"

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


transactions = load_transactions(DATA_PATH)
model, MODEL_ACCURACY, MODEL_EVALUATION = load_or_train_model(MODEL_PATH, transactions)
ROBUSTNESS_REPORT = run_robustness_suite(model)

PRIVACY_SETTINGS: Dict[str, bool] = {
    "anonymize_descriptions": False,
    "persist_uploaded_rows": False,
    "retain_job_history": False,
}

JOB_STATUS: Dict[str, Dict[str, Any]] = {}

BUDGET_SETTINGS: Dict[str, float] = {
    "Food": 10000,
    "Transport": 7000,
    "Shopping": 12000,
    "Entertainment": 6000,
    "Utilities": 8000,
    "Housing": 25000,
}

SAVING_GOALS: List[Dict[str, Any]] = [
    {
        "name": "Emergency Fund",
        "target_amount": 150000,
        "current_saved": 42000,
        "monthly_target": 8000,
    },
    {
        "name": "Travel Fund",
        "target_amount": 90000,
        "current_saved": 18000,
        "monthly_target": 6000,
    },
]

USER_PROFILE: Dict[str, Any] = {
    "role": "personal",
    "name": "Analyst",
}


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def format_amount(value: Any) -> str:
    try:
        return f"INR {float(value):,.0f}"
    except (TypeError, ValueError):
        return "INR 0"


def build_chat_history(history: List[Dict[str, Any]], limit: int = 8) -> str:
    lines: List[str] = []
    for item in history[-limit:]:
        if not isinstance(item, dict):
            continue
        role = str(item.get("role", "")).strip().lower()
        content = str(item.get("content", "")).strip()
        if role not in {"user", "assistant"} or not content:
            continue
        prefix = "User" if role == "user" else "Leo"
        lines.append(f"{prefix}: {content}")
    return "\n".join(lines) if lines else "No prior conversation."


def build_finance_context_text(analytics_context: Dict[str, Any]) -> str:
    category_totals = analytics_context.get("category_totals", {})
    if not isinstance(category_totals, dict):
        category_totals = {}

    lines: List[str] = []

    total_spend = float(analytics_context.get("total_spend", 0) or 0)
    top_category = analytics_context.get("top_category") or "N/A"
    lines.append(f"Total spend: {format_amount(total_spend)}")
    lines.append(f"Top category: {top_category}")

    if category_totals:
        sorted_categories = sorted(category_totals.items(), key=lambda item: item[1], reverse=True)
        category_lines = [f"{category}: {format_amount(amount)}" for category, amount in sorted_categories[:6]]
        lines.append("Category totals: " + "; ".join(category_lines))

    budget_status = analytics_context.get("budget_status", {})
    if isinstance(budget_status, dict):
        lines.append(
            "Budget status: "
            f"{int(budget_status.get('exceeded_count', 0) or 0)} exceeded, "
            f"{int(budget_status.get('warning_count', 0) or 0)} near limit"
        )

    health = analytics_context.get("financial_health", {})
    if isinstance(health, dict) and health:
        reasons = health.get("reasons", [])
        reason_text = "; ".join([str(reason) for reason in reasons[:3]]) if isinstance(reasons, list) else ""
        lines.append(
            f"Financial health: {health.get('score', 0)}/100 ({health.get('label', 'unknown')})"
            + (f". Reasons: {reason_text}" if reason_text else "")
        )

    forecast = analytics_context.get("forecast_next_month", {})
    if isinstance(forecast, dict) and forecast:
        forecast_total = float(forecast.get("total", 0) or 0)
        forecast_categories = forecast.get("categories", [])
        cat_text = "; ".join(
            [f"{item.get('category')}: {format_amount(item.get('predicted_amount', 0))}" for item in forecast_categories[:5]]
        )
        lines.append(f"Forecast next month total: {format_amount(forecast_total)}")
        if cat_text:
            lines.append(f"Forecast categories: {cat_text}")

    tips = analytics_context.get("savings_tips", [])
    if isinstance(tips, list) and tips:
        lines.append("Savings tips: " + " | ".join([str(tip) for tip in tips[:4]]))

    recent: List[str] = []
    if not transactions.empty:
        frame = transactions.copy()
        if "date" in frame.columns:
            frame["date"] = pd.to_datetime(frame["date"], errors="coerce")
            frame = frame.sort_values("date", ascending=False)

        for _, row in frame.head(5).iterrows():
            description = str(row.get("description", "")).strip() or "Unnamed transaction"
            category = str(row.get("category", "Others")).strip() or "Others"
            date_value = row.get("date")
            recent.append(
                f"{date_value.strftime('%Y-%m-%d') if pd.notna(date_value) else 'unknown'} | "
                f"{description} | {format_amount(row.get('amount', 0))} | {category}"
            )

    if recent:
        lines.append("Recent transactions: " + " ; ".join(recent))

    return "\n".join(lines)


def generate_llm_reply(message: str, history: List[Dict[str, Any]], analytics_context: Dict[str, Any]) -> Optional[str]:
    provider = preferred_llm_provider()
    if provider == "rules":
        return None

    system_prompt = (
        "You are Leo, an advanced finance assistant for FinData Intelligence. "
        "Answer only finance-related questions about spending, budgets, predictions, savings, transactions, and uploaded CSVs. "
        "Use the provided finance context to tailor the answer. Be specific, concise, and avoid generic repeats. "
        "If the user asks for a budget plan, provide a practical month plan with category caps and next steps. "
        "If the data is missing, clearly say what is missing and ask for the CSV upload. "
        "Return plain text only. Prefer short paragraphs or bullets when advice is requested."
    )

    context_prompt = (
        "Finance context:\n"
        f"{build_finance_context_text(analytics_context)}\n\n"
        f"Conversation:\n{build_chat_history(history)}"
    )

    messages_payload = [
        {"role": "system", "content": system_prompt},
        {"role": "system", "content": context_prompt},
    ]

    for item in history[-8:]:
        if not isinstance(item, dict):
            continue
        role = str(item.get("role", "")).strip().lower()
        content = str(item.get("content", "")).strip()
        if role in {"user", "assistant"} and content:
            messages_payload.append({"role": role, "content": content})

    if not messages_payload or messages_payload[-1].get("role") != "user" or messages_payload[-1].get("content") != message:
        messages_payload.append({"role": "user", "content": message})

    try:
        if provider == "ollama":
            response = requests.post(
                OLLAMA_CHAT_URL,
                headers={"Content-Type": "application/json"},
                json={
                    "model": OLLAMA_MODEL,
                    "messages": messages_payload,
                    "stream": False,
                },
                timeout=60,
            )
            response.raise_for_status()
            payload = response.json()
            message_payload = payload.get("message", {}) if isinstance(payload, dict) else {}
            reply = str(message_payload.get("content", "")).strip()
            return reply or None

        response = requests.post(
            OPENAI_CHAT_COMPLETIONS_URL,
            headers={
                "Authorization": f"Bearer {OPENAI_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": OPENAI_MODEL,
                "messages": messages_payload,
                "temperature": 0.4,
                "max_tokens": 350,
            },
            timeout=25,
        )
        response.raise_for_status()
        payload = response.json()
        choices = payload.get("choices", []) if isinstance(payload, dict) else []
        message_payload = choices[0].get("message", {}) if choices else {}
        reply = str(message_payload.get("content", "")).strip()
        return reply or None
    except Exception:
        return None


def update_job(job_id: str, *, status: str, progress: int, message: str, rows: int = 0) -> None:
    JOB_STATUS[job_id] = {
        "job_id": job_id,
        "status": status,
        "progress": max(0, min(100, int(progress))),
        "message": message,
        "rows": int(rows),
        "updated_at": now_iso(),
    }

    if not PRIVACY_SETTINGS.get("retain_job_history", False) and status in {"completed", "failed"}:
        keys_to_remove = [
            key
            for key, value in JOB_STATUS.items()
            if key != job_id and value.get("status") in {"completed", "failed"}
        ]
        for key in keys_to_remove:
            JOB_STATUS.pop(key, None)


def anonymize_text(value: str) -> str:
    if not value:
        return ""

    tokens = re.split(r"(\s+)", str(value).strip())
    masked_tokens = []
    for token in tokens:
        if token.isspace() or token == "":
            masked_tokens.append(token)
            continue

        alnum_count = sum(character.isalnum() for character in token)
        if alnum_count <= 2:
            masked_tokens.append("*" * len(token))
            continue

        first_char = token[0]
        masked_tokens.append(first_char + "*" * (len(token) - 1))

    return "".join(masked_tokens)


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


def enrich_analytics(frame: pd.DataFrame, payload: Dict[str, Any]) -> Dict[str, Any]:
    anomalies = detect_anomalies(frame)
    recurring = detect_recurring_transactions(frame)
    duplicates = detect_duplicates(frame)
    budget_status = build_budget_status(payload.get("category_totals", {}), BUDGET_SETTINGS)
    health = compute_health_score(
        float(payload.get("total_spend", 0) or 0),
        payload.get("category_totals", {}),
        anomalies,
        budget_status,
    )
    forecast = forecast_next_month_spend(frame)
    accounts = build_account_summary(frame)
    goals = evaluate_goals(float(payload.get("total_spend", 0) or 0), SAVING_GOALS)

    payload["anomaly_alerts"] = anomalies
    payload["recurring_transactions"] = recurring
    payload["duplicate_transactions"] = duplicates
    payload["budget_settings"] = BUDGET_SETTINGS
    payload["budget_status"] = budget_status
    payload["financial_health"] = health
    payload["forecast_next_month"] = forecast
    payload["account_summary"] = accounts
    payload["saving_goals"] = goals
    payload["user_profile"] = USER_PROFILE
    return payload


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

    summary = {
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
            "Optional privacy controls for anonymization and persistence",
        ],
        "privacy_controls": PRIVACY_SETTINGS,
    }

    enriched_frame = pd.DataFrame(
        {
            "date": pd.to_datetime(frame.get("date"), errors="coerce"),
            "amount": amount_series,
            "description": frame.get("description", pd.Series([""] * len(frame))).astype(str),
            "category": category_series,
            "account": frame.get("account", pd.Series(["Default"] * len(frame))).astype(str),
        }
    )
    return enrich_analytics(enriched_frame, summary)


def summarize_transactions(frame: pd.DataFrame, accuracy: float, evaluation: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
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

    summary = {
        "total_spend": total_spend,
        "transaction_count": transaction_count,
        "average_amount": average_amount,
        "model_accuracy": accuracy,
        "model_evaluation": evaluation or MODEL_EVALUATION,
        "robustness_report": ROBUSTNESS_REPORT,
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
            "Confusion-matrix and macro-metric evaluation support",
            "Noisy-descriptor robustness benchmark suite",
        ],
        "privacy_controls": PRIVACY_SETTINGS,
    }

    return enrich_analytics(frame, summary)


def server_snapshot() -> Dict[str, Any]:
    active_jobs = [job for job in JOB_STATUS.values() if job.get("status") in {"queued", "running"}]
    latest_job = max(JOB_STATUS.values(), key=lambda value: value.get("updated_at", ""), default=None)

    return {
        "status": "ok",
        "server_time": now_iso(),
        "transactions": int(len(transactions)),
        "accuracy": float(MODEL_ACCURACY),
        "model_evaluation": MODEL_EVALUATION,
        "robustness_report": ROBUSTNESS_REPORT,
        "privacy_controls": PRIVACY_SETTINGS,
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
    return summarize_transactions(transactions, MODEL_ACCURACY, MODEL_EVALUATION)


@app.get("/privacy/settings")
def get_privacy_settings() -> Dict[str, Any]:
    return {
        "privacy_controls": PRIVACY_SETTINGS,
        "updated_at": now_iso(),
    }


@app.post("/privacy/settings")
def update_privacy_settings(data: Dict[str, Any]) -> Dict[str, Any]:
    global PRIVACY_SETTINGS

    for key in PRIVACY_SETTINGS.keys():
        if key in data:
            PRIVACY_SETTINGS[key] = bool(data[key])

    return {
        "status": "updated",
        "privacy_controls": PRIVACY_SETTINGS,
        "updated_at": now_iso(),
    }


@app.get("/budgets")
def get_budgets() -> Dict[str, Any]:
    return {
        "budgets": BUDGET_SETTINGS,
        "updated_at": now_iso(),
    }


@app.post("/budgets")
def update_budgets(data: Dict[str, Any]) -> Dict[str, Any]:
    for key, value in data.items():
        try:
            BUDGET_SETTINGS[str(key)] = max(0.0, float(value))
        except (TypeError, ValueError):
            continue

    return {
        "status": "updated",
        "budgets": BUDGET_SETTINGS,
        "updated_at": now_iso(),
    }


@app.get("/goals")
def get_goals() -> Dict[str, Any]:
    return {
        "goals": SAVING_GOALS,
        "updated_at": now_iso(),
    }


@app.post("/goals")
def update_goals(data: Dict[str, Any]) -> Dict[str, Any]:
    global SAVING_GOALS
    goals = data.get("goals", [])
    if isinstance(goals, list):
        normalized_goals = []
        for goal in goals:
            if not isinstance(goal, dict):
                continue
            normalized_goals.append(
                {
                    "name": str(goal.get("name", "Goal")).strip() or "Goal",
                    "target_amount": float(goal.get("target_amount", 0) or 0),
                    "current_saved": float(goal.get("current_saved", 0) or 0),
                    "monthly_target": float(goal.get("monthly_target", 0) or 0),
                }
            )

        if normalized_goals:
            SAVING_GOALS = normalized_goals

    return {
        "status": "updated",
        "goals": SAVING_GOALS,
        "updated_at": now_iso(),
    }


@app.get("/profile")
def get_profile() -> Dict[str, Any]:
    return {
        "profile": USER_PROFILE,
        "updated_at": now_iso(),
    }


@app.post("/profile")
def update_profile(data: Dict[str, Any]) -> Dict[str, Any]:
    role = str(data.get("role", USER_PROFILE.get("role", "personal"))).strip().lower()
    if role not in {"personal", "business"}:
        role = "personal"
    USER_PROFILE["role"] = role
    if "name" in data:
        USER_PROFILE["name"] = str(data.get("name") or "Analyst").strip() or "Analyst"

    return {
        "status": "updated",
        "profile": USER_PROFILE,
        "updated_at": now_iso(),
    }


@app.post("/feedback/correction")
def correction_feedback(data: Dict[str, Any]) -> Dict[str, Any]:
    global transactions, model, MODEL_ACCURACY, MODEL_EVALUATION, ROBUSTNESS_REPORT

    description = str(data.get("description", "")).strip()
    corrected_category = str(data.get("corrected_category", "")).strip()
    amount = float(data.get("amount", 0) or 0)

    if not description or not corrected_category:
        raise HTTPException(status_code=400, detail="description and corrected_category are required")

    new_row = pd.DataFrame(
        [
            {
                "date": pd.Timestamp.utcnow(),
                "amount": amount,
                "description": description,
                "category": corrected_category,
            }
        ]
    )
    transactions = pd.concat([transactions, new_row], ignore_index=True)
    model, MODEL_ACCURACY, MODEL_EVALUATION = retrain_and_persist_model(MODEL_PATH, transactions)
    ROBUSTNESS_REPORT = run_robustness_suite(model)

    return {
        "status": "accepted",
        "accuracy": MODEL_ACCURACY,
        "rows": int(len(transactions)),
        "updated_at": now_iso(),
    }


@app.get("/report/monthly")
def export_monthly_report() -> Dict[str, Any]:
    summary = summarize_transactions(transactions, MODEL_ACCURACY, MODEL_EVALUATION)
    return {
        "report": summary,
        "report_text": build_report_text(summary),
        "generated_at": now_iso(),
    }


@app.get("/model/robustness")
def model_robustness() -> Dict[str, Any]:
    return {
        "robustness_report": ROBUSTNESS_REPORT,
        "evaluated_at": now_iso(),
    }


@app.post("/predict")
def predict(data: Dict[str, Any]) -> Dict[str, Any]:
    description = data.get("description", "")
    if not str(description).strip():
        raise HTTPException(status_code=400, detail="description is required")

    return predict_category(description, model)


@app.post("/ai_chat")
def ai_chat(data: Dict[str, Any]) -> Dict[str, Any]:
    global model, MODEL_ACCURACY, MODEL_EVALUATION, ROBUSTNESS_REPORT, transactions

    message = str(data.get("message", "")).strip()
    if not message:
        raise HTTPException(status_code=400, detail="message is required")

    history = data.get("history", [])
    history = history if isinstance(history, list) else []
    provided_analytics = data.get("analytics", {})
    provided_analytics = provided_analytics if isinstance(provided_analytics, dict) else {}

    lowered = message.lower()
    dashboard_data = summarize_transactions(transactions, MODEL_ACCURACY, MODEL_EVALUATION) if not transactions.empty else None
    analytics_context = provided_analytics or dashboard_data or {}
    category_totals = analytics_context.get("category_totals", {}) if isinstance(analytics_context.get("category_totals", {}), dict) else {}

    def finance_suggestions(*items: str) -> List[str]:
        options = []
        for item in items:
            value = str(item).strip()
            if value and value not in options and not any(blocked in value.lower() for blocked in ["backend", "server", "status"]):
                options.append(value)
        return options[:4] if options else [
            "what is my top spending category?",
            "show my monthly spending trend",
            "how can I reduce food expenses?",
            "give me a budget plan for next month",
        ]

    def money(amount: float) -> str:
        return f"INR {float(amount):,.0f}"

    def requested_category_from_text(text: str) -> Optional[str]:
        if not isinstance(category_totals, dict) or not category_totals:
            return None

        alias_map = {
            "food": "Food",
            "groceries": "Food",
            "transport": "Transport",
            "travel": "Transport",
            "shopping": "Shopping",
            "entertainment": "Entertainment",
            "utilities": "Utilities",
            "housing": "Housing",
            "rent": "Housing",
        }

        lowered_text = text.lower()
        for category in category_totals.keys():
            if str(category).lower() in lowered_text:
                return str(category)

        for alias, mapped in alias_map.items():
            if alias in lowered_text and mapped in category_totals:
                return mapped

        return None

    def build_budget_plan_reply() -> Dict[str, Any]:
        if not analytics_context:
            return {
                "reply": "I need uploaded transaction data first so I can build a budget plan.",
                "suggestions": finance_suggestions("upload csv", "what is my top spending category?"),
            }

        budget_status = analytics_context.get("budget_status", {})
        health = analytics_context.get("financial_health", {})
        top_category = analytics_context.get("top_category") or "N/A"
        total_spend = float(analytics_context.get("total_spend", 0) or 0)
        warning_count = int(budget_status.get("warning_count", 0) or 0)
        exceeded_count = int(budget_status.get("exceeded_count", 0) or 0)

        category_totals_sorted = sorted(category_totals.items(), key=lambda item: item[1], reverse=True)
        plan_lines = [
            f"- Keep your top category, {top_category}, under a weekly cap.",
            f"- Total spend is {money(total_spend)}. Try to cut your top 2 categories by 10% this month.",
        ]

        if category_totals_sorted:
            primary_category, primary_amount = category_totals_sorted[0]
            plan_lines[0] = f"- Set a weekly cap for {primary_category} at about {money(primary_amount / 4)}."

        if exceeded_count > 0:
            plan_lines.append(f"- {exceeded_count} category budgets are already exceeded, so pause non-essential spending there.")
        elif warning_count > 0:
            plan_lines.append(f"- {warning_count} categories are close to budget limits, so slow spending in those areas.")
        else:
            plan_lines.append("- Your budget looks manageable. Keep the same plan and review it weekly.")

        score = health.get("score")
        label = health.get("label", "unknown")

        return {
            "reply": (
                f"Here is your budget plan for next month (financial health: {score}/100, {label}):\n"
                + "\n".join(plan_lines)
            ),
            "suggestions": finance_suggestions(
                "how can I reduce food expenses?",
                "show my monthly spending trend",
                "forecast next month",
                "what is my top spending category?",
            ),
        }

    def build_savings_goal_reply(target_amount: float) -> Dict[str, Any]:
        if target_amount <= 0:
            return {
                "reply": "Tell me a target amount in INR and I’ll split it into a savings plan for you.",
                "suggestions": finance_suggestions("how can I reduce food expenses?", "give me a budget plan for next month"),
            }

        monthly_goal = target_amount / 3
        weekly_goal = target_amount / 12
        return {
            "reply": (
                f"To save {money(target_amount)}, aim for about {money(monthly_goal)} per month or {money(weekly_goal)} per week. "
                "Start by cutting the top 2 spending categories by 10%, then move that amount into a separate savings account right away."
            ),
            "suggestions": finance_suggestions(
                "give me a budget plan for next month",
                "what is my top spending category?",
                "how can I reduce food expenses?",
                "forecast next month",
            ),
        }

    def parse_savings_target(text: str) -> Optional[float]:
        match = re.search(r"(?:save|savings?|reduce)\D{0,12}(\d[\d,]*)", text.lower())
        if not match:
            return None
        try:
            return float(match.group(1).replace(",", ""))
        except ValueError:
            return None

    def build_default_suggestions() -> List[str]:
        return finance_suggestions(
            "what is my top spending category?",
            "show my monthly spending trend",
            "how can I reduce food expenses?",
            "give me a budget plan for next month",
        )

    def build_contextual_suggestions() -> List[str]:
        if any(keyword in lowered for keyword in ["budget plan", "monthly budget", "plan next month"]):
            return finance_suggestions(
                "how can I reduce food expenses?",
                "show my monthly spending trend",
                "forecast next month",
                "what is my top spending category?",
            )
        if any(keyword in lowered for keyword in ["forecast"]):
            return finance_suggestions(
                "what is my top spending category?",
                "show my monthly spending trend",
                "give me a budget plan for next month",
                "show anomalies",
            )
        if any(keyword in lowered for keyword in ["reduce", "save", "tip", "tips"]):
            return finance_suggestions(
                "give me a budget plan for next month",
                "show my monthly spending trend",
                "what is my top spending category?",
                "forecast next month",
            )
        if "predict" in lowered:
            return finance_suggestions(
                "predict: amazon grocery order",
                "predict: electricity bill payment",
                "show my monthly spending trend",
                "what is my top spending category?",
            )

        return build_default_suggestions()

    if any(token in lowered for token in ["hello", "hi", "hey"]):
        return {
            "reply": (
                "Hi, I am Leo, your FinData Intelligence assistant. Ask me about spending trends, budgeting, savings, or predictions."
            ),
            "suggestions": build_default_suggestions(),
        }

    if any(token in lowered for token in ["help", "what can you do", "commands"]):
        return {
            "reply": (
                "You can ask me things like:\n"
                "1. what is my top spending category?\n"
                "2. how can I reduce food expenses?\n"
                "3. show my monthly spending trend\n"
                "4. predict: swiggy dinner"
            ),
            "suggestions": build_default_suggestions(),
        }

    if any(keyword in lowered for keyword in ["budget plan", "budget plan for next month", "monthly budget", "plan next month"]):
        return build_budget_plan_reply()

    savings_target = parse_savings_target(message)
    if savings_target is not None:
        return build_savings_goal_reply(savings_target)

    if any(keyword in lowered for keyword in ["reduce", "save", "tip", "tips"]):
        tips = analytics_context.get("savings_tips", [])
        requested_category = requested_category_from_text(message)

        if tips:
            focused_tips = tips[:4]
            if requested_category:
                spent = float(category_totals.get(requested_category, 0) or 0)
                reply = (
                    f"You spent {money(spent)} on {requested_category}. Here are focused ways to reduce it:\n"
                    + "\n".join([f"- {tip}" for tip in focused_tips])
                )
            else:
                reply = "Here are focused saving actions:\n" + "\n".join([f"- {tip}" for tip in focused_tips])

            return {
                "reply": reply,
                "suggestions": finance_suggestions(
                    "what is my top spending category?",
                    "show my monthly spending trend",
                    "give me a budget plan for next month",
                    "forecast next month"
                ),
            }

        return {
            "reply": "I need analytics context first. Upload a CSV so I can generate personalized savings tips.",
            "suggestions": finance_suggestions(
                "what is my top spending category?",
                "show my monthly spending trend",
                "forecast next month",
                "upload csv",
            ),
        }

    if "predict" in lowered:
        candidate = message
        if ":" in message:
            candidate = message.split(":", 1)[1].strip()

        if not candidate.strip() and history:
            previous_user_messages = [
                str(item.get("content", "")).strip()
                for item in history
                if isinstance(item, dict) and item.get("role") == "user"
            ]
            if previous_user_messages:
                candidate = previous_user_messages[-1]

        if not candidate.strip() or candidate.lower() == "predict":
            return {
                "reply": "Please provide a description after predict. Example: predict: uber ride to office",
                "suggestions": ["predict: netflix monthly subscription", "predict: flipkart order"],
            }

        result = predict_category(candidate, model)
        reply = (
            f"Prediction for '{candidate}': {result['category']} (source: {result['source']}). "
            + (
                f"Confidence: {result['confidence'] * 100:.1f}%"
                if isinstance(result.get("confidence"), (int, float))
                else "Confidence not available"
            )
        )
        return {
            "reply": reply,
            "suggestions": finance_suggestions(
                "predict: uber trip airport",
                "predict: electricity bill payment",
                "how can I reduce this category spend?",
            ),
        }

    if any(keyword in lowered for keyword in ["health", "status", "backend", "live"]):
        snapshot = server_snapshot()
        reply = (
            f"Backend is {snapshot['status']} with {snapshot['transactions']} training rows. "
            f"Model accuracy is {(snapshot['accuracy'] * 100):.1f}% and active jobs are {snapshot['active_jobs']}."
        )
        return {
            "reply": reply,
            "suggestions": finance_suggestions("what is my top spending category?", "show my monthly spending trend"),
        }

    if any(keyword in lowered for keyword in ["retrain", "train model", "refresh model"]):
        transactions = load_transactions(DATA_PATH)
        model, MODEL_ACCURACY, MODEL_EVALUATION = retrain_and_persist_model(MODEL_PATH, transactions)
        ROBUSTNESS_REPORT = run_robustness_suite(model)

        if model is None:
            return {
                "reply": "Retraining could not complete because dataset is empty or invalid.",
                "suggestions": finance_suggestions("upload csv", "show my monthly spending trend"),
            }

        return {
            "reply": f"Model retrained successfully. New validation accuracy: {MODEL_ACCURACY * 100:.1f}%.",
            "suggestions": finance_suggestions("predict: amazon order", "what is my top spending category?"),
        }

    if any(keyword in lowered for keyword in ["top category", "highest spend", "top spend", "spending category"]):
        top_category = analytics_context.get("top_category") or "N/A"
        total_spend = float(analytics_context.get("total_spend", 0) or 0)
        return {
            "reply": (
                f"Your top spending category is {top_category}. "
                f"Total spend is {money(total_spend)}."
            ),
            "suggestions": finance_suggestions("how can I reduce food expenses?", "show my monthly spending trend"),
        }

    if any(keyword in lowered for keyword in ["how much", "spent", "spend", "expense", "expenses"]):
        if isinstance(category_totals, dict) and category_totals:
            requested_category = requested_category_from_text(message)
            if requested_category is not None:
                spend_amount = float(category_totals.get(requested_category, 0) or 0)
                return {
                    "reply": f"You spent {money(spend_amount)} on {requested_category}.",
                    "suggestions": finance_suggestions("how can I reduce food expenses?", "show my monthly spending trend"),
                }

        total_spend = float(analytics_context.get("total_spend", 0) or 0)
        if total_spend > 0:
            return {
                "reply": f"Your total spend is {money(total_spend)}.",
                "suggestions": finance_suggestions("what is my top spending category?", "show my monthly spending trend"),
            }

    if any(keyword in lowered for keyword in ["tip", "save", "reduce", "budget"]):
        tips = analytics_context.get("savings_tips", [])
        if tips:
            tip_lines = "\n".join([f"- {tip}" for tip in tips[:4]])
            return {
                "reply": f"Here are focused saving actions:\n{tip_lines}",
                "suggestions": ["what is my top category", "predict: swiggy order"],
            }

        return {
            "reply": "I need analytics context first. Upload a CSV so I can generate personalized savings tips.",
            "suggestions": ["upload csv", "show backend status"],
        }

    if "top 5" in lowered and any(keyword in lowered for keyword in ["expense", "spend", "transaction"]):
        if transactions.empty:
            return {
                "reply": "No transaction data available yet. Upload a CSV first.",
                "suggestions": finance_suggestions("upload csv", "what is my top spending category?"),
            }

        top_items = (
            transactions.sort_values("amount", ascending=False)
            .head(5)[["description", "amount", "category"]]
            .to_dict(orient="records")
        )
        lines = [
            f"- {item['description']} ({item['category']}): INR {float(item['amount']):,.0f}"
            for item in top_items
        ]
        return {
            "reply": "Top 5 expenses:\n" + "\n".join(lines),
            "suggestions": finance_suggestions("show anomalies", "forecast next month"),
        }

    if "last month" in lowered and any(keyword in lowered for keyword in ["spend", "expense"]):
        if transactions.empty:
            return {
                "reply": "No transaction data available yet. Upload a CSV first.",
                "suggestions": finance_suggestions("upload csv", "show my monthly spending trend"),
            }

        last_month = (pd.Timestamp.utcnow().to_period("M") - 1)
        frame = transactions.copy()
        frame["date"] = pd.to_datetime(frame["date"], errors="coerce")
        frame = frame[frame["date"].dt.to_period("M") == last_month]

        requested_category = None
        for category in sorted(transactions["category"].dropna().astype(str).unique().tolist()):
            if category.lower() in lowered:
                requested_category = category
                break

        if requested_category:
            frame = frame[frame["category"].astype(str).str.lower() == requested_category.lower()]

        spend_value = float(frame.get("amount", pd.Series(dtype="float64")).sum())
        category_text = requested_category or "all categories"
        return {
            "reply": f"Last month spend for {category_text}: INR {spend_value:,.0f}.",
            "suggestions": finance_suggestions("top 5 expenses", "forecast next month"),
        }

    if "forecast" in lowered:
        forecast = analytics_context.get("forecast_next_month", {})
        total = float(forecast.get("total", 0) or 0)
        top_categories = forecast.get("categories", [])[:3]
        cat_text = ", ".join(
            [f"{item.get('category')}: INR {float(item.get('predicted_amount', 0)):,.0f}" for item in top_categories]
        ) or "No forecast categories yet"
        return {
            "reply": f"Predicted next-month total spend is INR {total:,.0f}. Top expected categories: {cat_text}.",
            "suggestions": finance_suggestions("show anomalies", "what is my top spending category?"),
        }

    if "anomal" in lowered:
        anomalies = analytics_context.get("anomaly_alerts", [])
        if not anomalies:
            return {
                "reply": "No anomaly alerts detected right now.",
                "suggestions": finance_suggestions("forecast next month", "top 5 expenses"),
            }

        lines = [
            f"- {item.get('description', '')} ({item.get('category', '')}) INR {float(item.get('amount', 0)):,.0f}"
            for item in anomalies[:5]
        ]
        return {
            "reply": "Anomaly alerts:\n" + "\n".join(lines),
            "suggestions": finance_suggestions("give me a budget plan for next month", "forecast next month"),
        }

    if any(keyword in lowered for keyword in ["savings goal", "save more", "save money", "monthly savings"]):
        savings_total = float(analytics_context.get("total_spend", 0) or 0)
        if savings_total > 0:
            target = max(5000.0, savings_total * 0.1)
            return build_savings_goal_reply(target)

    # Keep responses grounded to supported finance intents instead of returning unrelated summaries.
    in_scope_keywords = [
        "predict", "category", "spend", "expense", "saving", "budget", "status", "backend",
        "health", "model", "accuracy", "upload", "csv", "transaction", "analytics", "tip",
    ]
    if not any(keyword in lowered for keyword in in_scope_keywords):
        return {
            "reply": (
                "I can only help with FinData analytics tasks: predictions, spending insights, backend/model status, "
                "and savings tips based on your uploaded transactions."
            ),
            "suggestions": finance_suggestions(),
        }

    if not dashboard_data:
        return {
            "reply": (
                "I need uploaded transaction data to answer that accurately. Please upload a CSV first, "
                "then ask again."
            ),
            "suggestions": finance_suggestions("upload csv", "predict: swiggy order", "what is my top spending category?"),
        }

    return {
        "reply": (
            "I could not map that to a specific finance question. Ask about top category, total spend, "
            "savings tips, forecast, or use 'predict: <transaction text>'."
        ),
        "suggestions": finance_suggestions(
            "what is my top spending category?",
            "how can I reduce food expenses?",
            "show my monthly spending trend",
            "predict: electricity bill payment",
        ),
    }


@app.get("/jobs/{job_id}")
def get_job(job_id: str) -> Dict[str, Any]:
    job = JOB_STATUS.get(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="job not found")
    return job


@app.post("/retrain")
def retrain_model() -> Dict[str, Any]:
    global model, MODEL_ACCURACY, MODEL_EVALUATION, ROBUSTNESS_REPORT, transactions

    transactions = load_transactions(DATA_PATH)
    model, MODEL_ACCURACY, MODEL_EVALUATION = retrain_and_persist_model(MODEL_PATH, transactions)
    ROBUSTNESS_REPORT = run_robustness_suite(model)

    if model is None:
        raise HTTPException(status_code=400, detail="Unable to train model. Dataset is empty or invalid.")

    return {
        "status": "retrained",
        "accuracy": MODEL_ACCURACY,
        "evaluation": MODEL_EVALUATION,
        "robustness_report": ROBUSTNESS_REPORT,
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
    global transactions, model, MODEL_ACCURACY, MODEL_EVALUATION, ROBUSTNESS_REPORT

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

        account_column = find_column(
            df,
            [
                "account",
                "account name",
                "bank account",
                "source account",
                "card",
                "account number",
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

        quality_report = build_csv_quality_report(df, text_column, amount_column)

        df["description"] = text_values
        df["amount"] = amount_values.astype(float)
        df["account"] = (
            df[account_column].fillna("Default").astype(str).str.strip()
            if account_column is not None
            else "Default"
        )
        df["source_text_column"] = text_column
        df["source_amount_column"] = amount_column if amount_column is not None else ""

        update_job(current_job_id, status="running", progress=60, message="Running hybrid model predictions", rows=len(df))
        predictions = batch_predict_categories(text_values, model, chunk_size=5000)
        df["predicted"] = predictions["predicted"]
        df["prediction_source"] = predictions["prediction_source"]
        df["prediction_confidence"] = predictions["prediction_confidence"]

        # Treat each upload as the active working dataset so all subsequent views
        # and inference endpoints reflect newly uploaded data, not older baseline rows.
        active_frame = df.copy()
        if "date" in active_frame.columns:
            active_frame["date"] = pd.to_datetime(active_frame["date"], errors="coerce").fillna(pd.Timestamp.utcnow())
        else:
            active_frame["date"] = pd.Timestamp.utcnow()

        transactions = pd.DataFrame(
            {
                "date": active_frame["date"],
                "amount": pd.to_numeric(active_frame["amount"], errors="coerce").fillna(0),
                "description": active_frame["description"].astype(str),
                "category": active_frame["predicted"].astype(str),
                "account": active_frame.get("account", "Default"),
            }
        )

        model, MODEL_ACCURACY, MODEL_EVALUATION = retrain_and_persist_model(MODEL_PATH, transactions)
        ROBUSTNESS_REPORT = run_robustness_suite(model)

        update_job(current_job_id, status="running", progress=85, message="Building analytics", rows=len(df))
        response_frame = df.copy()
        if PRIVACY_SETTINGS.get("anonymize_descriptions", False):
            response_frame["description"] = response_frame["description"].astype(str).apply(anonymize_text)

        analytics = summarize_uploaded_rows(response_frame)
        analytics["csv_quality"] = quality_report

        if PRIVACY_SETTINGS.get("persist_uploaded_rows", False):
            transactions.to_csv(DATA_PATH, index=False)

        update_job(current_job_id, status="completed", progress=100, message="Completed", rows=len(df))
        return {
            "job_id": current_job_id,
            "rows": response_frame.to_dict(orient="records"),
            "summary": response_frame["predicted"].value_counts().to_dict(),
            "analytics": analytics,
            "detected_column": text_column,
            "detected_amount_column": amount_column,
            "detected_account_column": account_column,
            "csv_quality": quality_report,
        }

    except HTTPException as exc:
        update_job(current_job_id, status="failed", progress=100, message=str(exc.detail))
        raise
    except Exception as exc:
        update_job(current_job_id, status="failed", progress=100, message=str(exc))
        raise HTTPException(status_code=500, detail=str(exc))
