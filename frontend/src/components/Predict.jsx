import { useState } from "react";
import axios from "axios";

export default function Predict({ apiBase }) {
  const [desc, setDesc] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await axios.post(`${apiBase}/predict`, {
        description: desc,
      });

      setResult(res.data);
    } catch {
      setError("Prediction failed. Check the backend server and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-3xl border border-white/10 bg-[#1c1f26] p-5 shadow-lg shadow-black/20">
      <h2 className="text-lg font-semibold text-white">Try prediction</h2>
      <p className="mt-1 text-sm text-slate-400">
        Enter a merchant description to see the hybrid rules-plus-model category.
      </p>

      <input
        className="mt-4 w-full rounded-2xl border border-white/10 bg-[#0e1117] p-3 text-white outline-none transition placeholder:text-slate-500 focus:border-emerald-400/60"
        placeholder="Enter transaction..."
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
      />

      <button
        className="mt-3 rounded-2xl bg-emerald-500 px-5 py-2.5 font-medium text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={loading}
        onClick={fetchData}
      >
        {loading ? "Predicting..." : "Predict"}
      </button>

      {error && (
        <p className="mt-4 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          {error}
        </p>
      )}

      {result && (
        <div className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-4 text-sm text-emerald-50">
          <div className="text-xs uppercase tracking-[0.25em] text-emerald-200/70">
            Prediction result
          </div>
          <div className="mt-1 text-xl font-semibold">{result.category}</div>
          <div className="mt-2 flex flex-wrap gap-2 text-xs uppercase tracking-[0.2em] text-emerald-100/80">
            <span className="rounded-full border border-white/10 px-3 py-1">{result.source}</span>
            {typeof result.confidence === "number" && (
              <span className="rounded-full border border-white/10 px-3 py-1">
                {(result.confidence * 100).toFixed(0)}% confidence
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}