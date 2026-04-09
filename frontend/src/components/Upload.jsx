import axios from "axios";
import { useState } from "react";

export default function Upload({ apiBase, onUploadComplete }) {
  const [file, setFile] = useState(null);
  const [data, setData] = useState([]);
  const [summary, setSummary] = useState({});
  const [detectedColumn, setDetectedColumn] = useState("");
  const [detectedAmountColumn, setDetectedAmountColumn] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const uploadFile = async () => {
    if (!file) {
      alert("Please select a file first!");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const formData = new FormData();
      formData.append("file", file);

      const res = await axios.post(
        `${apiBase}/bulk_predict`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      setData(res.data.rows ?? []);
      setSummary(res.data.summary ?? {});
      setDetectedColumn(res.data.detected_column ?? "");
      setDetectedAmountColumn(res.data.detected_amount_column ?? "");

      if (typeof onUploadComplete === "function") {
        onUploadComplete(res.data);
      }
    } catch (err) {
      const backendMessage =
        err?.response?.data?.detail ||
        err?.response?.data?.error ||
        err?.message ||
        "Upload failed. Check backend.";
      setError(backendMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-3xl border border-white/10 bg-[#1c1f26] p-5 shadow-lg shadow-black/20">
      <h2 className="text-lg font-semibold text-white">Upload CSV</h2>
      <p className="mt-1 text-sm text-slate-400">
        Select a bank export and the backend will auto-detect the text column.
      </p>

      <input
        type="file"
        className="mb-3 mt-4 block w-full text-sm text-slate-300 file:mr-4 file:rounded-full file:border-0 file:bg-emerald-500 file:px-4 file:py-2 file:font-medium file:text-slate-950 hover:file:bg-emerald-400"
        onChange={(e) => setFile(e.target.files[0])}
      />

      <button
        className="rounded-2xl bg-sky-500 px-4 py-2.5 font-medium text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={loading}
        onClick={uploadFile}
      >
        {loading ? "Uploading..." : "Upload"}
      </button>

      <div className="mt-4">
        {error && (
          <div className="mb-4 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            {error}
          </div>
        )}

        {detectedColumn && (
          <p className="mb-3 text-xs uppercase tracking-[0.25em] text-slate-500">
            Detected column: {detectedColumn}
          </p>
        )}

        {detectedAmountColumn && (
          <p className="mb-3 text-xs uppercase tracking-[0.25em] text-slate-500">
            Amount column: {detectedAmountColumn}
          </p>
        )}

        {Object.keys(summary).length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {Object.entries(summary).map(([category, count]) => (
              <span
                key={category}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200"
              >
                {category}: {count}
              </span>
            ))}
          </div>
        )}

        {data.length > 0 ? (
          data.slice(0, 5).map((row, i) => (
            <div
              key={`${row.description}-${i}`}
              className="flex justify-between border-b border-white/10 py-2 text-sm last:border-b-0"
            >
              <span className="pr-3 text-slate-200">{row.description}</span>
              <span className="text-emerald-300">{row.predicted}</span>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-sm text-slate-400">
            Uploaded predictions will appear here.
          </div>
        )}
      </div>
    </div>
  );
}