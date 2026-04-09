import axios from "axios";
import { useEffect, useRef, useState } from "react";

export default function Upload({ apiBase, onUploadComplete, onProcessingChange }) {
  const [file, setFile] = useState(null);
  const [data, setData] = useState([]);
  const [summary, setSummary] = useState({});
  const [detectedColumn, setDetectedColumn] = useState("");
  const [detectedAmountColumn, setDetectedAmountColumn] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [uploadProgress, setUploadProgress] = useState(null);
  const [uploadPhase, setUploadPhase] = useState("idle");
  const progressTimerRef = useRef(null);
  const uploadPhaseRef = useRef("idle");

  const updateUploadPhase = (nextPhase) => {
    uploadPhaseRef.current = nextPhase;
    setUploadPhase(nextPhase);
  };

  const stopProgressSimulation = () => {
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
  };

  useEffect(() => {
    if (!loading) {
      return;
    }

    // Some browsers don't provide reliable upload totals for large multipart requests.
    // When simulated transfer reaches 95, move to server-processing phase automatically.
    if (uploadPhaseRef.current === "uploading" && (uploadProgress ?? 0) >= 95) {
      updateUploadPhase("processing");
    }
  }, [loading, uploadProgress]);

  const startProgressSimulation = () => {
    if (progressTimerRef.current) {
      return;
    }

    progressTimerRef.current = setInterval(() => {
      setUploadProgress((previous) => {
        const current = typeof previous === "number" ? previous : 0;

        if (uploadPhaseRef.current === "uploading") {
          return Math.min(95, current + 1);
        }

        if (uploadPhaseRef.current === "processing") {
          return Math.min(99, current + 1);
        }

        return current;
      });
    }, 140);
  };

  const uploadFile = async () => {
    if (!file) {
      alert("Please select a file first!");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setUploadProgress(0);
      updateUploadPhase("uploading");
      startProgressSimulation();
      if (typeof onProcessingChange === "function") {
        onProcessingChange(true);
      }

      const formData = new FormData();
      formData.append("file", file);

      const res = await axios.post(
        `${apiBase}/bulk_predict`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
          onUploadProgress: (progressEvent) => {
            if (!progressEvent.total) {
              return;
            }

            // Keep transfer progress capped at 95 until server-side processing finishes.
            const percent = Math.min(
              95,
              Math.round((progressEvent.loaded * 100) / progressEvent.total)
            );
            setUploadProgress((previous) => {
              const current = typeof previous === "number" ? previous : 0;
              return Math.max(current, percent);
            });
          },
        }
      );

      stopProgressSimulation();
      setUploadProgress(100);
      updateUploadPhase("done");

      setData(res.data.rows ?? []);
      setSummary(res.data.summary ?? {});
      setDetectedColumn(res.data.detected_column ?? "");
      setDetectedAmountColumn(res.data.detected_amount_column ?? "");

      if (typeof onUploadComplete === "function") {
        onUploadComplete(res.data);
      }
    } catch (err) {
      stopProgressSimulation();
      const backendMessage =
        err?.response?.data?.detail ||
        err?.response?.data?.error ||
        err?.message ||
        "Upload failed. Check backend.";
      setError(backendMessage);
    } finally {
      stopProgressSimulation();
      setLoading(false);
      if (typeof onProcessingChange === "function") {
        onProcessingChange(false);
      }
      setTimeout(() => {
        setUploadProgress(null);
        updateUploadPhase("idle");
      }, 800);
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

      {loading && (
        <div className="mt-4 rounded-2xl border border-white/10 bg-[#0e1117] p-3">
          <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.2em] text-slate-400">
            <span>
              {uploadPhase === "processing"
                ? "Processing on server"
                : "Upload progress"}
            </span>
            <span>{uploadProgress ?? 0}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-emerald-400 transition-all duration-150"
              style={{ width: `${uploadProgress ?? 0}%` }}
            />
          </div>
        </div>
      )}

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