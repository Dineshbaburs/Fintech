import { useEffect, useMemo, useState } from "react";
import axios from "axios";

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

function formatCurrency(value) {
  const numeric = Number(value ?? 0);
  return currencyFormatter.format(Number.isFinite(numeric) ? numeric : 0);
}

export default function InsightsHub({ apiBase, analytics, loading = false }) {
  const [budgets, setBudgets] = useState({});
  const [goals, setGoals] = useState([]);
  const [profileRole, setProfileRole] = useState("personal");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    setBudgets(analytics?.budget_settings ?? {});
    setGoals(analytics?.saving_goals ?? []);
    setProfileRole(analytics?.user_profile?.role ?? "personal");
  }, [analytics]);

  const health = analytics?.financial_health ?? {};
  const anomalies = analytics?.anomaly_alerts ?? [];
  const recurring = analytics?.recurring_transactions ?? [];
  const duplicates = analytics?.duplicate_transactions ?? [];
  const forecast = analytics?.forecast_next_month ?? {};
  const accountSummary = analytics?.account_summary ?? [];

  const budgetRows = useMemo(
    () => Object.entries(budgets).sort((a, b) => a[0].localeCompare(b[0])),
    [budgets]
  );

  const saveBudgets = async () => {
    try {
      setSaving(true);
      await axios.post(`${apiBase}/budgets`, budgets, { timeout: 10000 });
      setStatus("Budgets updated");
    } catch {
      setStatus("Budget update failed");
    } finally {
      setSaving(false);
    }
  };

  const saveGoals = async () => {
    try {
      setSaving(true);
      await axios.post(`${apiBase}/goals`, { goals }, { timeout: 10000 });
      setStatus("Goals updated");
    } catch {
      setStatus("Goal update failed");
    } finally {
      setSaving(false);
    }
  };

  const saveRole = async (nextRole) => {
    try {
      setSaving(true);
      setProfileRole(nextRole);
      await axios.post(`${apiBase}/profile`, { role: nextRole }, { timeout: 10000 });
      setStatus("Role updated");
    } catch {
      setStatus("Role update failed");
    } finally {
      setSaving(false);
    }
  };

  const exportReport = async () => {
    try {
      const response = await axios.get(`${apiBase}/report/monthly`, { timeout: 15000 });
      const text = response?.data?.report_text || "No report available";
      const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "monthly-report.txt");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setStatus("Report exported");
    } catch {
      setStatus("Report export failed");
    }
  };

  if (loading) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-lg shadow-slate-200/60">
        <div className="h-24 animate-pulse rounded-2xl bg-slate-100" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-lg shadow-slate-200/60">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Financial health</h2>
            <p className="mt-1 text-sm text-slate-500">Score from budget discipline, anomaly risk, and spend concentration.</p>
          </div>
          <div className="rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-sm font-semibold text-cyan-700">
            {health.score ?? 0} / 100 ({health.label || "unknown"})
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Anomalies</p>
            <p className="mt-2 text-2xl font-semibold text-rose-700">{anomalies.length}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Recurring</p>
            <p className="mt-2 text-2xl font-semibold text-emerald-700">{recurring.length}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Duplicates</p>
            <p className="mt-2 text-2xl font-semibold text-amber-700">{duplicates.length}</p>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          {(health.reasons ?? []).map((reason) => (
            <div key={reason} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
              {reason}
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-lg shadow-slate-200/60">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-base font-semibold text-slate-900">Budget planner</h3>
            <button
              type="button"
              onClick={saveBudgets}
              disabled={saving}
              className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700 disabled:opacity-60"
            >
              Save budgets
            </button>
          </div>

          <div className="mt-3 space-y-2">
            {budgetRows.map(([category, amount]) => (
              <div key={category} className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <span className="text-sm text-slate-700">{category}</span>
                <input
                  value={amount}
                  type="number"
                  onChange={(event) => {
                    const next = Number(event.target.value || 0);
                    setBudgets((prev) => ({ ...prev, [category]: next }));
                  }}
                  className="w-28 rounded-lg border border-slate-300 bg-white px-2 py-1 text-right text-sm text-slate-800"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-lg shadow-slate-200/60">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-base font-semibold text-slate-900">Goal tracking</h3>
            <button
              type="button"
              onClick={saveGoals}
              disabled={saving}
              className="rounded-lg border border-cyan-300 bg-cyan-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-cyan-700 disabled:opacity-60"
            >
              Save goals
            </button>
          </div>

          <div className="mt-3 space-y-3">
            {goals.map((goal, index) => (
              <div key={`${goal.name}-${index}`} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <input
                  value={goal.name || ""}
                  onChange={(event) => {
                    const next = [...goals];
                    next[index] = { ...next[index], name: event.target.value };
                    setGoals(next);
                  }}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
                />
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <input
                    type="number"
                    value={goal.target_amount || 0}
                    onChange={(event) => {
                      const next = [...goals];
                      next[index] = { ...next[index], target_amount: Number(event.target.value || 0) };
                      setGoals(next);
                    }}
                    className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-800"
                    placeholder="Target"
                  />
                  <input
                    type="number"
                    value={goal.current_saved || 0}
                    onChange={(event) => {
                      const next = [...goals];
                      next[index] = { ...next[index], current_saved: Number(event.target.value || 0) };
                      setGoals(next);
                    }}
                    className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-800"
                    placeholder="Saved"
                  />
                  <input
                    type="number"
                    value={goal.monthly_target || 0}
                    onChange={(event) => {
                      const next = [...goals];
                      next[index] = { ...next[index], monthly_target: Number(event.target.value || 0) };
                      setGoals(next);
                    }}
                    className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-800"
                    placeholder="Monthly"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-lg shadow-slate-200/60 xl:col-span-2">
          <h3 className="text-base font-semibold text-slate-900">Forecast and account summary</h3>
          <p className="mt-1 text-sm text-slate-500">Forecast uses historical monthly averages by category.</p>

          <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            Predicted next-month total: {formatCurrency(forecast.total)}
          </div>

          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {(forecast.categories ?? []).slice(0, 6).map((item) => (
              <div key={item.category} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                <div className="font-medium text-slate-800">{item.category}</div>
                <div>{formatCurrency(item.predicted_amount)}</div>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Accounts</p>
            <div className="mt-2 space-y-2">
              {accountSummary.map((item) => (
                <div key={item.account} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
                  <span className="text-slate-700">{item.account} ({item.transactions})</span>
                  <span className="font-medium text-slate-900">{formatCurrency(item.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-lg shadow-slate-200/60">
          <h3 className="text-base font-semibold text-slate-900">Workspace controls</h3>
          <p className="mt-1 text-sm text-slate-500">Role-specific mode and export actions.</p>

          <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl border border-slate-200 bg-slate-100 p-1 text-xs">
            <button
              type="button"
              onClick={() => saveRole("personal")}
              className={`rounded px-2 py-1.5 ${profileRole === "personal" ? "bg-cyan-400 text-slate-900" : "text-slate-600"}`}
            >
              Personal
            </button>
            <button
              type="button"
              onClick={() => saveRole("business")}
              className={`rounded px-2 py-1.5 ${profileRole === "business" ? "bg-cyan-400 text-slate-900" : "text-slate-600"}`}
            >
              Business
            </button>
          </div>

          <button
            type="button"
            onClick={exportReport}
            className="mt-3 w-full rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-amber-800"
          >
            Export monthly report
          </button>

          {status && (
            <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              {status}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
