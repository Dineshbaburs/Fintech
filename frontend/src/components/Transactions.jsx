import { useState } from "react";

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

function getRowCategory(row) {
  return row.predicted_category || row.predicted || row.category || "Others";
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
  const numericAmount = Number(rawAmount);
  return Number.isNaN(numericAmount) ? 0 : numericAmount;
}

export default function Transactions({ transactions = [] }) {
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [categorySearch, setCategorySearch] = useState("");
  const [sortOrder, setSortOrder] = useState("desc");

  const categories = Array.from(new Set(transactions.map((row) => getRowCategory(row)))).sort();

  const filteredTransactions = transactions
    .filter((row) => categoryFilter === "All" || getRowCategory(row) === categoryFilter)
    .filter((row) => matchesCategorySearch(row, categorySearch))
    .sort((left, right) => {
      const leftAmount = getRowAmount(left);
      const rightAmount = getRowAmount(right);
      return sortOrder === "asc" ? leftAmount - rightAmount : rightAmount - leftAmount;
    });

  return (
    <div className="rounded-3xl border border-white/10 bg-[#1c1f26] p-5 shadow-lg shadow-black/20">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Uploaded transactions</h2>
          <p className="mt-1 text-sm text-slate-400">
            Filter by category and sort by amount on your uploaded file.
          </p>
        </div>
      </div>

      <div className="mb-4 grid gap-3 md:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-500">
            Category filter
          </span>
          <select
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-[#0e1117] px-4 py-3 text-sm text-white outline-none"
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
            className="w-full rounded-2xl border border-white/10 bg-[#0e1117] px-4 py-3 text-sm text-white outline-none"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-500">
            Sort by amount
          </span>
          <select
            value={sortOrder}
            onChange={(event) => setSortOrder(event.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-[#0e1117] px-4 py-3 text-sm text-white outline-none"
          >
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </select>
        </label>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10">
        <div className="grid grid-cols-12 gap-3 border-b border-white/10 bg-white/5 px-4 py-3 text-xs uppercase tracking-[0.2em] text-slate-400">
          <div className="col-span-4">Description</div>
          <div className="col-span-2 text-right">Amount</div>
          <div className="col-span-3">Actual</div>
          <div className="col-span-3">Predicted</div>
        </div>

        {filteredTransactions.length > 0 ? (
          filteredTransactions.map((transaction) => (
            <div
              key={`${transaction.description}-${transaction.date}`}
              className="grid grid-cols-12 gap-3 border-b border-white/10 px-4 py-3 text-sm last:border-b-0"
            >
              <div className="col-span-4 text-white">{transaction.description}</div>
              <div className="col-span-2 text-right text-slate-200">
                {currencyFormatter.format(getRowAmount(transaction))}
              </div>
              <div className="col-span-3 text-slate-300">{getRowCategory(transaction)}</div>
              <div className="col-span-3">
                <div className="flex flex-col gap-1">
                  <span className="text-emerald-300">
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