const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export default function SummaryCards({ summary, loading = false }) {
  const data = [
    {
      title: "Total Spend",
      value: loading ? "..." : summary ? currencyFormatter.format(summary?.total_spend ?? 0) : "Upload CSV",
      note: "Current month total",
    },
    {
      title: "Average Transaction",
      value: loading ? "..." : summary ? currencyFormatter.format(summary?.average_amount ?? 0) : "Upload CSV",
      note: "Average ticket size",
    },
    {
      title: "Model Accuracy",
      value: loading ? "..." : summary?.model_accuracy != null ? `${Math.round(summary.model_accuracy * 100)}%` : "N/A",
      note: "Only shown when available",
    },
    {
      title: "Transactions",
      value: loading ? "..." : `${summary?.transaction_count ?? 0}`,
      note: summary?.top_category ? `Top category: ${summary.top_category}` : "Upload CSV",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {data.map((item, i) => (
        <div
          key={i}
          className="rounded-2xl border border-white/10 bg-[#1c1f26] p-5 shadow-lg shadow-black/20"
        >
          <h3 className="text-sm text-slate-400">{item.title}</h3>
          <p className="mt-2 text-3xl font-semibold text-white">{item.value}</p>
          <p className="mt-2 text-xs uppercase tracking-[0.25em] text-emerald-300/70">
            {item.note}
          </p>
        </div>
      ))}
    </div>
  );
}