import { useState } from "react";
import axios from "axios";

export default function Predict({ apiBase }) {
  const [desc, setDesc] = useState("");
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchData = async () => {
    if (!desc.trim()) {
      setError("Please enter a transaction description before predicting.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const res = await axios.post(`${apiBase}/predict`, {
        description: desc.trim(),
      });

      setResult(res.data);
      setHistory((previous) => [
        { description: desc.trim(), ...res.data },
        ...previous,
      ].slice(0, 5));
    } catch {
      setError("Prediction failed. Check the backend server and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-lg shadow-slate-200/60">
      <h2 className="text-lg font-semibold text-slate-900">Try prediction</h2>
      <p className="mt-1 text-sm text-slate-500">
        Enter a merchant description to see the hybrid rules-plus-model category.
      </p>

      <input
        className="mt-4 w-full rounded-2xl border border-slate-300 bg-white p-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-400/60"
        placeholder="Enter transaction..."
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            fetchData();
          }
        }}
      />

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          className="rounded-2xl bg-emerald-500 px-5 py-2.5 font-medium text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={loading}
          onClick={fetchData}
        >
          {loading ? "Predicting..." : "Predict"}
        </button>
        <button
          type="button"
          className="rounded-2xl border border-slate-300 bg-slate-100 px-5 py-2.5 text-sm text-slate-700 transition hover:bg-slate-200"
          onClick={() => {
            setDesc("");
            setResult(null);
            setError("");
          }}
        >
          Clear
        </button>
      </div>

      {error && (
        <p className="mt-4 rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </p>
      )}

      {result && (
        <div className="mt-4 rounded-2xl border border-emerald-300/60 bg-emerald-50 px-4 py-4 text-sm text-emerald-900">
          <div className="text-xs uppercase tracking-[0.25em] text-emerald-700/80">
            Prediction result
          </div>
          <div className="mt-1 text-xl font-semibold">{result.category}</div>
          <div className="mt-2 flex flex-wrap gap-2 text-xs uppercase tracking-[0.2em] text-emerald-800/90">
            <span className="rounded-full border border-emerald-300 bg-white px-3 py-1">{result.source}</span>
            {typeof result.confidence === "number" && (
              <span className="rounded-full border border-emerald-300 bg-white px-3 py-1">
                {(result.confidence * 100).toFixed(0)}% confidence
              </span>
            )}
          </div>
        </div>
      )}

      {history.length > 0 && (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Recent predictions</p>
          <div className="mt-2 space-y-2">
            {history.map((item, index) => (
              <div
                key={`${item.description}-${index}`}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700"
              >
                <p className="truncate text-slate-800">{item.description}</p>
                <p className="mt-1 uppercase tracking-[0.15em] text-emerald-700">
                  {item.category}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}