from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List

import pandas as pd


def _to_numeric_amount(series: pd.Series) -> pd.Series:
    return pd.to_numeric(series, errors="coerce").fillna(0.0)


def _normalized_text(series: pd.Series) -> pd.Series:
    return series.fillna("").astype(str).str.strip().str.lower()


def detect_anomalies(frame: pd.DataFrame, top_n: int = 8) -> List[Dict[str, Any]]:
    if frame.empty or "amount" not in frame.columns:
        return []

    working = frame.copy()
    working["amount"] = _to_numeric_amount(working["amount"])
    working["category"] = working.get("category", "Others").fillna("Others").astype(str)

    alerts: List[Dict[str, Any]] = []
    for category, subset in working.groupby("category"):
        if len(subset) < 3:
            continue

        mean = float(subset["amount"].mean())
        std = float(subset["amount"].std(ddof=0))
        if std <= 0:
            continue

        candidate = subset.copy()
        candidate["z_score"] = (candidate["amount"] - mean) / std
        outliers = candidate[candidate["z_score"] >= 2.0].sort_values("z_score", ascending=False)
        for _, row in outliers.iterrows():
            alerts.append(
                {
                    "category": category,
                    "description": str(row.get("description", "")),
                    "amount": float(row["amount"]),
                    "z_score": float(row["z_score"]),
                    "reason": "Transaction is more than 2 standard deviations above category mean.",
                }
            )

    alerts.sort(key=lambda item: item["z_score"], reverse=True)
    return alerts[:top_n]


def detect_recurring_transactions(frame: pd.DataFrame, top_n: int = 12) -> List[Dict[str, Any]]:
    if frame.empty:
        return []

    working = frame.copy()
    if "date" not in working.columns:
        return []

    working["date"] = pd.to_datetime(working["date"], errors="coerce")
    working = working.dropna(subset=["date"])
    if working.empty:
        return []

    working["amount"] = _to_numeric_amount(working.get("amount", pd.Series([0] * len(working))))
    working["description"] = _normalized_text(working.get("description", pd.Series([""] * len(working))))
    working["period"] = working["date"].dt.to_period("M")

    grouped = (
        working.groupby(["description", "amount"]) ["period"]
        .nunique()
        .reset_index(name="months_seen")
        .sort_values("months_seen", ascending=False)
    )

    recurring = grouped[grouped["months_seen"] >= 2].head(top_n)
    return [
        {
            "description": row["description"],
            "amount": float(row["amount"]),
            "months_seen": int(row["months_seen"]),
            "confidence": "high" if int(row["months_seen"]) >= 3 else "medium",
        }
        for _, row in recurring.iterrows()
    ]


def detect_duplicates(frame: pd.DataFrame, top_n: int = 10) -> List[Dict[str, Any]]:
    if frame.empty:
        return []

    working = frame.copy()
    working["description"] = _normalized_text(working.get("description", pd.Series([""] * len(working))))
    working["amount"] = _to_numeric_amount(working.get("amount", pd.Series([0] * len(working))))
    if "date" in working.columns:
        working["date"] = pd.to_datetime(working["date"], errors="coerce").dt.strftime("%Y-%m-%d")
    else:
        working["date"] = "unknown"

    key_counts = (
        working.groupby(["description", "amount", "date"]).size().reset_index(name="count")
        .sort_values("count", ascending=False)
    )
    duplicates = key_counts[key_counts["count"] > 1].head(top_n)

    return [
        {
            "description": row["description"],
            "amount": float(row["amount"]),
            "date": row["date"],
            "count": int(row["count"]),
            "reason": "Same description, amount, and date appears multiple times.",
        }
        for _, row in duplicates.iterrows()
    ]


def build_budget_status(category_totals: Dict[str, float], budgets: Dict[str, float]) -> Dict[str, Any]:
    items: List[Dict[str, Any]] = []
    exceeded = 0
    warning = 0

    for category, spent in sorted(category_totals.items(), key=lambda item: item[0]):
        budget = float(budgets.get(category, 0) or 0)
        if budget <= 0:
            ratio = None
            status = "no_budget"
        else:
            ratio = float(spent) / budget
            if ratio >= 1.0:
                status = "exceeded"
                exceeded += 1
            elif ratio >= 0.9:
                status = "critical"
                warning += 1
            elif ratio >= 0.7:
                status = "warning"
                warning += 1
            else:
                status = "safe"

        items.append(
            {
                "category": category,
                "spent": float(spent),
                "budget": budget,
                "ratio": ratio,
                "status": status,
            }
        )

    return {
        "items": items,
        "exceeded_count": exceeded,
        "warning_count": warning,
    }


def compute_health_score(
    total_spend: float,
    category_totals: Dict[str, float],
    anomalies: List[Dict[str, Any]],
    budget_status: Dict[str, Any],
) -> Dict[str, Any]:
    score = 100.0
    reasons: List[str] = []

    if total_spend <= 0:
        return {"score": 100, "label": "excellent", "reasons": ["No spending detected."]}

    top_share = 0.0
    if category_totals:
        top_share = max(category_totals.values()) / max(total_spend, 1)

    if top_share > 0.45:
        penalty = min(18, (top_share - 0.45) * 60)
        score -= penalty
        reasons.append("Spending is highly concentrated in one category.")

    anomaly_penalty = min(20, len(anomalies) * 4)
    if anomaly_penalty > 0:
        score -= anomaly_penalty
        reasons.append("Multiple high-value anomaly transactions detected.")

    exceeded = int(budget_status.get("exceeded_count", 0))
    warning = int(budget_status.get("warning_count", 0))
    budget_penalty = min(24, exceeded * 8 + warning * 3)
    if budget_penalty > 0:
        score -= budget_penalty
        reasons.append("Budget thresholds are breached or near breach.")

    normalized = max(0, min(100, int(round(score))))
    if normalized >= 85:
        label = "excellent"
    elif normalized >= 70:
        label = "good"
    elif normalized >= 55:
        label = "moderate"
    else:
        label = "at_risk"

    if not reasons:
        reasons.append("Spending patterns are balanced against configured thresholds.")

    return {"score": normalized, "label": label, "reasons": reasons[:3]}


def forecast_next_month_spend(frame: pd.DataFrame, top_n: int = 8) -> Dict[str, Any]:
    if frame.empty or "date" not in frame.columns:
        return {"total": 0.0, "categories": []}

    working = frame.copy()
    working["date"] = pd.to_datetime(working["date"], errors="coerce")
    working = working.dropna(subset=["date"])
    if working.empty:
        return {"total": 0.0, "categories": []}

    working["amount"] = _to_numeric_amount(working.get("amount", pd.Series([0] * len(working))))
    working["category"] = working.get("category", "Others").fillna("Others").astype(str)
    working["month"] = working["date"].dt.to_period("M")

    monthly = working.groupby(["month", "category"], as_index=False)["amount"].sum()
    by_category = monthly.groupby("category")["amount"].mean().sort_values(ascending=False)

    categories = [
        {
            "category": category,
            "predicted_amount": float(amount),
        }
        for category, amount in by_category.head(top_n).items()
    ]

    return {
        "total": float(by_category.sum()),
        "categories": categories,
        "method": "historical_monthly_average",
    }


def build_account_summary(frame: pd.DataFrame) -> List[Dict[str, Any]]:
    if frame.empty:
        return []

    working = frame.copy()
    account_col = None
    for candidate in ["account", "account_name", "bank_account", "card", "source_account"]:
        if candidate in working.columns:
            account_col = candidate
            break

    if account_col is None:
        return [{"account": "Default", "transactions": int(len(working)), "amount": float(_to_numeric_amount(working.get("amount", pd.Series([0] * len(working)))).sum())}]

    working["account"] = working[account_col].fillna("Unknown").astype(str).str.strip()
    working["amount"] = _to_numeric_amount(working.get("amount", pd.Series([0] * len(working))))

    grouped = (
        working.groupby("account", as_index=False)
        .agg(transactions=("account", "count"), amount=("amount", "sum"))
        .sort_values("amount", ascending=False)
    )

    return [
        {
            "account": row["account"],
            "transactions": int(row["transactions"]),
            "amount": float(row["amount"]),
        }
        for _, row in grouped.iterrows()
    ]


def evaluate_goals(total_spend: float, goals: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    result = []
    for goal in goals:
        target = float(goal.get("target_amount", 0) or 0)
        current = float(goal.get("current_saved", 0) or 0)
        progress = 0.0 if target <= 0 else min(1.0, current / target)
        monthly_required = float(goal.get("monthly_target", 0) or 0)
        result.append(
            {
                "name": str(goal.get("name", "Goal")),
                "target_amount": target,
                "current_saved": current,
                "progress": progress,
                "monthly_target": monthly_required,
                "hint": (
                    "On track" if progress >= 0.7 else "Increase monthly savings to hit this goal sooner"
                ),
            }
        )

    return result


def build_csv_quality_report(
    frame: pd.DataFrame,
    text_column: str | None,
    amount_column: str | None,
) -> Dict[str, Any]:
    total_rows = int(len(frame))
    missing_text_rows = 0
    invalid_amount_rows = 0
    duplicate_rows = int(frame.duplicated().sum()) if total_rows > 0 else 0

    if text_column and text_column in frame.columns:
        missing_text_rows = int(frame[text_column].fillna("").astype(str).str.strip().eq("").sum())

    if amount_column and amount_column in frame.columns:
        numeric_amount = pd.to_numeric(frame[amount_column], errors="coerce")
        invalid_amount_rows = int(numeric_amount.isna().sum())

    completeness = 100.0
    if total_rows > 0:
        bad_rows = missing_text_rows + invalid_amount_rows
        completeness = max(0.0, 100.0 - (bad_rows / max(1, total_rows)) * 100.0)

    warnings: List[str] = []
    if missing_text_rows:
        warnings.append(f"{missing_text_rows} rows have blank transaction descriptions.")
    if invalid_amount_rows:
        warnings.append(f"{invalid_amount_rows} rows have invalid amount values.")
    if duplicate_rows:
        warnings.append(f"{duplicate_rows} duplicate rows were detected.")

    return {
        "total_rows": total_rows,
        "missing_text_rows": missing_text_rows,
        "invalid_amount_rows": invalid_amount_rows,
        "duplicate_rows": duplicate_rows,
        "completeness_score": round(completeness, 2),
        "warnings": warnings,
    }


def build_report_text(analytics: Dict[str, Any]) -> str:
    lines = [
        "FinData Monthly Report",
        f"Generated: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}",
        "",
        f"Total Spend: INR {float(analytics.get('total_spend', 0)):,.0f}",
        f"Transactions: {int(analytics.get('transaction_count', 0))}",
        f"Top Category: {analytics.get('top_category') or 'N/A'}",
    ]

    health = analytics.get("financial_health", {})
    lines.append(
        f"Financial Health Score: {health.get('score', 0)} ({health.get('label', 'unknown')})"
    )

    lines.append("")
    lines.append("Top Category Totals:")
    for category, amount in list((analytics.get("category_totals") or {}).items())[:8]:
        lines.append(f"- {category}: INR {float(amount):,.0f}")

    anomalies = analytics.get("anomaly_alerts", [])
    lines.append("")
    lines.append(f"Anomaly Alerts: {len(anomalies)}")
    for item in anomalies[:5]:
        lines.append(
            f"- {item.get('description', '')} ({item.get('category', '')}) INR {float(item.get('amount', 0)):,.0f}"
        )

    forecast = analytics.get("forecast_next_month", {})
    lines.append("")
    lines.append(
        f"Next Month Forecast (Total): INR {float(forecast.get('total', 0)):,.0f}"
    )

    return "\n".join(lines)
