const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const compactCurrencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  notation: "compact",
  maximumFractionDigits: 2,
});

function parseAmount(row) {
  const rawAmount = row?.amount ?? row?.transaction_amount ?? row?.value ?? row?.amt ?? 0;
  const numericAmount = Number(rawAmount);
  return Number.isFinite(numericAmount) ? numericAmount : 0;
}

function formatCurrencyCardValue(amount) {
  const numericAmount = Number(amount ?? 0);
  if (!Number.isFinite(numericAmount)) {
    return { display: "N/A", full: "N/A" };
  }

  const absoluteAmount = Math.abs(numericAmount);
  const display = absoluteAmount >= 1_000_000
    ? compactCurrencyFormatter.format(numericAmount)
    : currencyFormatter.format(numericAmount);

  return {
    display,
    full: currencyFormatter.format(numericAmount),
  };
}

export default function SummaryCards({ summary, transactions = [], loading = false }) {
  const largestTransaction = (summary?.largest_transaction ??
    Math.max(
      0,
      ...(Array.isArray(transactions)
        ? transactions.map((row) => parseAmount(row))
        : [])
    ));

  const totalSpendAmount = Number(summary?.total_spend ?? 0);
  const averageAmount = Number(summary?.average_amount ?? 0);
  const largestAmount = Number(largestTransaction ?? 0);
  const totalSpendValue = formatCurrencyCardValue(totalSpendAmount);
  const averageValue = formatCurrencyCardValue(averageAmount);
  const largestValue = formatCurrencyCardValue(largestAmount);

  const data = [
    {
      title: "Total Spend",
      value: loading ? "..." : summary ? totalSpendValue.display : "Upload CSV",
      fullValue: summary ? totalSpendValue.full : "",
      note: "Current month total",
    },
    {
      title: "Average Transaction",
      value: loading ? "..." : summary ? averageValue.display : "Upload CSV",
      fullValue: summary ? averageValue.full : "",
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
          ? largestValue.display
          : "Upload CSV",
      fullValue: summary ? largestValue.full : "",
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
          <p
            className="mt-2 truncate text-3xl font-semibold text-slate-900"
            title={item.fullValue || item.value}
          >
            {item.value}
          </p>
          {item.fullValue && item.fullValue !== item.value && (
            <p className="mt-1 truncate text-xs text-slate-500" title={item.fullValue}>
              {item.fullValue}
            </p>
          )}
          <p className="mt-2 text-xs uppercase tracking-[0.25em] text-emerald-700/75">
            {item.note}
          </p>
        </div>
      ))}
    </div>
  );
}