import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

const COLORS = ["#10b981", "#f59e0b", "#38bdf8", "#ef4444", "#a855f7", "#84cc16"];

export default function ExpenseChart({ categoryTotals, loading = false }) {
  const data = Object.entries(categoryTotals ?? {})
    .map(([name, value]) => ({ name, value }))
    .sort((left, right) => right.value - left.value);

  return (
    <div className="rounded-3xl border border-white/10 bg-[#1c1f26] p-5 shadow-lg shadow-black/20">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Expense distribution</h2>
          <p className="mt-1 text-sm text-slate-400">
            Monthly spend split by category from the labeled transaction set.
          </p>
        </div>
      </div>

      <div className="h-[320px] w-full">
        {loading ? (
          <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-white/10 text-sm text-slate-400">
            Loading chart...
          </div>
        ) : data.length > 0 ? (
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
                  background: "#111827",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "16px",
                  color: "#fff",
                }}
                formatter={(value) => [`₹${Number(value).toLocaleString("en-IN")}`, "Spend"]}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-white/10 text-sm text-slate-400">
            No category totals available yet.
          </div>
        )}
      </div>
    </div>
  );
}