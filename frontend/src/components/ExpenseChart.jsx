import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { useMemo, useState } from "react";

const COLORS = ["#10b981", "#f59e0b", "#38bdf8", "#ef4444", "#a855f7", "#84cc16"];

export default function ExpenseChart({ categoryTotals, loading = false }) {
  const [viewMode, setViewMode] = useState("chart");

  const data = useMemo(
    () =>
      Object.entries(categoryTotals ?? {})
        .map(([name, value]) => ({ name, value: Number(value) || 0 }))
        .sort((left, right) => right.value - left.value),
    [categoryTotals]
  );

  const totalSpend = useMemo(
    () => data.reduce((accumulator, item) => accumulator + item.value, 0),
    [data]
  );

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-lg shadow-slate-200/60">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Expense distribution</h2>
          <p className="mt-1 text-sm text-slate-500">
            Monthly spend split by category from the labeled transaction set.
          </p>
          <p className="mt-1 text-xs uppercase tracking-[0.2em] text-emerald-700/80">
            Total: ₹{totalSpend.toLocaleString("en-IN")}
          </p>
        </div>

        <div className="grid grid-cols-2 rounded-lg border border-slate-200 bg-slate-100 p-1 text-xs">
          <button
            type="button"
            className={`rounded px-3 py-1.5 transition ${
              viewMode === "chart" ? "bg-emerald-400 text-[#0b111c]" : "text-slate-600"
            }`}
            onClick={() => setViewMode("chart")}
          >
            Chart
          </button>
          <button
            type="button"
            className={`rounded px-3 py-1.5 transition ${
              viewMode === "list" ? "bg-emerald-400 text-[#0b111c]" : "text-slate-600"
            }`}
            onClick={() => setViewMode("list")}
          >
            Top list
          </button>
        </div>
      </div>

      <div className="h-[320px] w-full">
        {loading ? (
          <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-300 text-sm text-slate-500">
            Loading chart...
          </div>
        ) : data.length > 0 && viewMode === "chart" ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                innerRadius={72}
                outerRadius={118}
                paddingAngle={2}
              >
                {data.map((entry, index) => (
                  <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "#f8fafc",
                  border: "1px solid rgba(148,163,184,0.4)",
                  borderRadius: "16px",
                  color: "#0f172a",
                }}
                formatter={(value) => [`₹${Number(value).toLocaleString("en-IN")}`, "Spend"]}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        ) : data.length > 0 ? (
          <div className="h-full space-y-2 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-3">
            {data.slice(0, 10).map((item, index) => {
              const percent = totalSpend > 0 ? ((item.value / totalSpend) * 100).toFixed(1) : "0.0";

              return (
                <div
                  key={item.name}
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="text-slate-700">{item.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-slate-800">₹{item.value.toLocaleString("en-IN")}</div>
                    <div className="text-xs text-slate-500">{percent}%</div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-300 text-sm text-slate-500">
            No category totals available yet.
          </div>
        )}
      </div>
    </div>
  );
}