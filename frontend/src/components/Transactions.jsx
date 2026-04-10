import { useMemo, useState } from "react";

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

function getRowCategory(row) {
  const rawCategory = row.predicted_category || row.predicted || row.category || "Others";
  return String(rawCategory).trim() || "Others";
}

function normalize(value) {
  return String(value ?? "").trim().toLowerCase();
}

function matchesCategorySearch(row, searchTerm) {
  if (!searchTerm) {
    return true;
  }

  const normalizedSearch = normalize(searchTerm);
  const category = normalize(getRowCategory(row));
  const description = normalize(row.description);

  const aliasMap = {
    travel: ["transport", "travel", "commute", "cab", "ride", "bus", "metro", "taxi", "ola", "uber"],
    transport: ["transport", "travel", "commute", "cab", "ride", "bus", "metro", "taxi", "ola", "uber"],
    food: ["food", "meal", "restaurant", "swiggy", "zomato", "groceries", "grocery"],
    groceries: ["food", "meal", "restaurant", "swiggy", "zomato", "groceries", "grocery"],
    shopping: ["shopping", "amazon", "flipkart", "myntra", "purchase"],
    utilities: ["utilities", "electricity", "water", "gas", "broadband"],
    entertainment: ["entertainment", "netflix", "spotify", "movie", "ott"],
    housing: ["housing", "rent", "lease", "home"],
  };

  const aliasCandidates = aliasMap[normalizedSearch] || [normalizedSearch];
  return aliasCandidates.some((candidate) => category.includes(candidate) || description.includes(candidate));
}

function getRowAmount(row) {
  const rawAmount = row.amount ?? row.transaction_amount ?? row.value ?? row.amt ?? 0;
  if (typeof rawAmount === "number") {
    return Number.isFinite(rawAmount) ? rawAmount : 0;
  }

  // Handle values like "₹1,200.50", "1,200", "(1200)", or "- 1200" from bank exports.
  const normalizedAmount = String(rawAmount)
    .replace(/[₹,$\s]/g, "")
    .replace(/\((.+)\)/, "-$1")
    .replace(/[^0-9.-]/g, "");
  const numericAmount = Number(normalizedAmount);
  return Number.isNaN(numericAmount) ? 0 : numericAmount;
}

export default function Transactions({ transactions = [], isProcessing = false }) {
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [categorySearch, setCategorySearch] = useState("");
  const [sortOrder, setSortOrder] = useState("desc");

  const resetFilters = () => {
    setCategoryFilter("All");
    setCategorySearch("");
    setSortOrder("desc");
  };

  const categories = Array.from(new Set(transactions.map((row) => getRowCategory(row)))).sort();

  const filteredTransactions = useMemo(
    () =>
      [...transactions]
        .filter((row) => categoryFilter === "All" || normalize(getRowCategory(row)) === normalize(categoryFilter))
        .filter((row) => matchesCategorySearch(row, categorySearch))
        .sort((left, right) => {
          const leftAmount = getRowAmount(left);
          const rightAmount = getRowAmount(right);
          return sortOrder === "asc" ? leftAmount - rightAmount : rightAmount - leftAmount;
        }),
    [transactions, categoryFilter, categorySearch, sortOrder]
  );

  const showProcessing = isProcessing;

  const exportFilteredTransactions = () => {
    if (!filteredTransactions.length) {
      return;
    }

    const headers = ["Description", "Amount", "Actual", "Predicted", "Source"];
    const rows = filteredTransactions.map((transaction) => [
      `"${String(transaction.description ?? "").replaceAll('"', '""')}"`,
      getRowAmount(transaction),
      `"${String(transaction.category ?? "").replaceAll('"', '""')}"`,
      `"${String(getRowCategory(transaction)).replaceAll('"', '""')}"`,
      `"${String(transaction.prediction_source || transaction.source || "").replaceAll('"', '""')}"`,
    ]);

    const csv = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "filtered-transactions.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-lg shadow-slate-200/60">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Uploaded transactions</h2>
          <p className="mt-1 text-sm text-slate-500">
            Filter by category and sort by amount on your uploaded file.
          </p>
          <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">
            Showing {filteredTransactions.length} of {transactions.length}
          </p>
        </div>
        {showProcessing && (
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/60 bg-emerald-50 px-3 py-1 text-xs text-emerald-700">
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-emerald-300/60 border-t-emerald-700" />
            Processing
          </div>
        )}
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={resetFilters}
          className="rounded-xl border border-slate-300 bg-slate-100 px-3 py-2 text-xs uppercase tracking-[0.15em] text-slate-700 transition hover:bg-slate-200"
        >
          Reset filters
        </button>
        <button
          type="button"
          onClick={exportFilteredTransactions}
          disabled={!filteredTransactions.length}
          className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-xs uppercase tracking-[0.15em] text-emerald-100 transition hover:bg-emerald-400/20 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Export CSV
        </button>
      </div>

      <div className="mb-4 grid gap-3 md:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-500">
            Category filter
          </span>
          <select
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
            className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none"
          >
            <option value="All">All</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-500">
            Search category
          </span>
          <input
            value={categorySearch}
            onChange={(event) => setCategorySearch(event.target.value)}
            placeholder="Type travel, food, shopping..."
            className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-500">
            Sort by amount
          </span>
          <select
            value={sortOrder}
            onChange={(event) => setSortOrder(event.target.value)}
            className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none"
          >
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </select>
        </label>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200">
        <div className="grid grid-cols-12 gap-3 border-b border-slate-200 bg-slate-100 px-4 py-3 text-xs uppercase tracking-[0.2em] text-slate-500">
          <div className="col-span-4">Description</div>
          <div className="col-span-2 text-right">Amount</div>
          <div className="col-span-3">Actual</div>
          <div className="col-span-3">Predicted</div>
        </div>

        {showProcessing ? (
          <div className="flex items-center gap-3 px-4 py-8 text-sm text-slate-600">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-400/70 border-t-slate-700" />
            Processing data...
          </div>
        ) : filteredTransactions.length > 0 ? (
          filteredTransactions.map((transaction) => (
            <div
              key={`${transaction.description}-${transaction.date}`}
              className="grid grid-cols-12 gap-3 border-b border-slate-200 px-4 py-3 text-sm last:border-b-0"
            >
              <div className="col-span-4 text-slate-800">{transaction.description}</div>
              <div className="col-span-2 text-right text-slate-700">
                {currencyFormatter.format(getRowAmount(transaction))}
              </div>
              <div className="col-span-3 text-slate-600">{getRowCategory(transaction)}</div>
              <div className="col-span-3">
                <div className="flex flex-col gap-1">
                  <span className="text-emerald-700">
                    {getRowCategory(transaction)}
                  </span>
                  <span className="text-xs uppercase tracking-[0.2em] text-slate-500">
                    {transaction.prediction_source || transaction.source}
                  </span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="px-4 py-8 text-sm text-slate-400">
            The API will return preview transactions here after the backend is loaded.
          </div>
        )}
      </div>
    </div>
  );
}