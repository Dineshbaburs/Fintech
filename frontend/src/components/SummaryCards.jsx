const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

function parseAmount(row) {
  const rawAmount = row?.amount ?? row?.transaction_amount ?? row?.value ?? row?.amt ?? 0;
  const numericAmount = Number(rawAmount);
  return Number.isFinite(numericAmount) ? numericAmount : 0;
}

export default function SummaryCards({ summary, transactions = [], loading = false }) {
  const largestTransaction = (summary?.largest_transaction ??
    Math.max(
      0,
      ...(Array.isArray(transactions)
        ? transactions.map((row) => parseAmount(row))
        : [])
    ));

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
    {
      title: "Largest Transaction",
      value: loading
        ? "..."
        : summary
          ? currencyFormatter.format(largestTransaction)
          : "Upload CSV",
      note: "Highest single spend",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
      {data.map((item, i) => (
        <div
          key={i}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-md shadow-slate-200/60"
        >
          <h3 className="text-sm text-slate-500">{item.title}</h3>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{item.value}</p>
          <p className="mt-2 text-xs uppercase tracking-[0.25em] text-emerald-700/75">
            {item.note}
          </p>
        </div>
      ))}
    </div>
  );
}