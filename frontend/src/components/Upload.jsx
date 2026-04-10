import axios from "axios";
import { useEffect, useRef, useState } from "react";

export default function Upload({ apiBase, onUploadComplete, onProcessingChange }) {
  const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
  const [file, setFile] = useState(null);
  const [data, setData] = useState([]);
  const [summary, setSummary] = useState({});
  const [detectedColumn, setDetectedColumn] = useState("");
  const [detectedAmountColumn, setDetectedAmountColumn] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [uploadProgress, setUploadProgress] = useState(null);
  const [uploadPhase, setUploadPhase] = useState("idle");
  const [jobStatus, setJobStatus] = useState("");
  const progressTimerRef = useRef(null);
  const uploadPhaseRef = useRef("idle");
  const jobPollRef = useRef(null);

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

  const stopJobPolling = () => {
    if (jobPollRef.current) {
      clearInterval(jobPollRef.current);
      jobPollRef.current = null;
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
      setError("Please select a CSV file first.");
      return;
    }

    if (!file.name.toLowerCase().endsWith(".csv")) {
      setError("Only CSV files are supported.");
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError("File is too large. Please upload a CSV under 5 MB.");
      return;
    }

    try {
      const clientJobId =
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

      setLoading(true);
      setError("");
      setJobStatus("Preparing job...");
      setUploadProgress(0);
      updateUploadPhase("uploading");
      startProgressSimulation();
      if (typeof onProcessingChange === "function") {
        onProcessingChange(true);
      }

      const formData = new FormData();
      formData.append("file", file);

      stopJobPolling();
      jobPollRef.current = setInterval(async () => {
        try {
          const statusRes = await axios.get(`${apiBase}/jobs/${encodeURIComponent(clientJobId)}`);
          const statusData = statusRes.data;
          if (typeof statusData.progress === "number") {
            setUploadProgress((previous) => {
              const current = typeof previous === "number" ? previous : 0;
              return Math.max(current, statusData.progress);
            });
          }

          if (statusData.status === "running" && (statusData.progress ?? 0) >= 60) {
            updateUploadPhase("processing");
          }

          setJobStatus(statusData.message || "Processing...");
        } catch {
          // Ignore polling errors while upload request is still in-flight.
        }
      }, 700);

      const res = await axios.post(
        `${apiBase}/bulk_predict?job_id=${encodeURIComponent(clientJobId)}`,
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
      stopJobPolling();
      setUploadProgress(100);
      updateUploadPhase("done");
      setJobStatus("Completed");

      setData(res.data.rows ?? []);
      setSummary(res.data.summary ?? {});
      setDetectedColumn(res.data.detected_column ?? "");
      setDetectedAmountColumn(res.data.detected_amount_column ?? "");

      if (typeof onUploadComplete === "function") {
        onUploadComplete(res.data);
      }
    } catch (err) {
      stopProgressSimulation();
      stopJobPolling();
      const backendMessage =
        err?.response?.data?.detail ||
        err?.response?.data?.error ||
        err?.message ||
        "Upload failed. Check backend.";
      setError(backendMessage);
    } finally {
      stopProgressSimulation();
      stopJobPolling();
      setLoading(false);
      if (typeof onProcessingChange === "function") {
        onProcessingChange(false);
      }
      setTimeout(() => {
        setUploadProgress(null);
        updateUploadPhase("idle");
        setJobStatus("");
      }, 800);
    }
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-lg shadow-slate-200/60">
      <h2 className="text-lg font-semibold text-slate-900">Upload CSV</h2>
      <p className="mt-1 text-sm text-slate-500">
        Select a bank export and the backend will auto-detect the text column.
      </p>

      <input
        type="file"
        className="mb-3 mt-4 block w-full text-sm text-slate-600 file:mr-4 file:rounded-full file:border-0 file:bg-emerald-500 file:px-4 file:py-2 file:font-medium file:text-slate-950 hover:file:bg-emerald-400"
        accept=".csv,text/csv"
        onChange={(e) => {
          setFile(e.target.files[0]);
          setError("");
        }}
      />

      {file && (
        <p className="mb-3 text-xs uppercase tracking-[0.2em] text-slate-400">
          Selected: {file.name} ({Math.ceil(file.size / 1024)} KB)
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          className="rounded-2xl bg-sky-500 px-4 py-2.5 font-medium text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={loading}
          onClick={uploadFile}
        >
          {loading ? "Uploading..." : "Upload"}
        </button>
        <button
          type="button"
          className="rounded-2xl border border-slate-300 bg-slate-100 px-4 py-2.5 text-sm text-slate-700 transition hover:bg-slate-200"
          onClick={() => {
            setFile(null);
            setData([]);
            setSummary({});
            setDetectedColumn("");
            setDetectedAmountColumn("");
            setError("");
          }}
        >
          Clear upload data
        </button>
      </div>

      {loading && (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.2em] text-slate-500">
            <span>
              {uploadPhase === "processing"
                ? "Processing on server"
                : "Upload progress"}
            </span>
            <span>{uploadProgress ?? 0}%</span>
          </div>
          {jobStatus && (
            <p className="mb-2 text-xs text-slate-600">{jobStatus}</p>
          )}
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-emerald-400 transition-all duration-150"
              style={{ width: `${uploadProgress ?? 0}%` }}
            />
          </div>
        </div>
      )}

      <div className="mt-4">
        {error && (
          <div className="mb-4 rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-700">
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
                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-700"
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
              className="flex justify-between border-b border-slate-200 py-2 text-sm last:border-b-0"
            >
              <span className="pr-3 text-slate-700">{row.description}</span>
              <span className="text-emerald-700">{row.predicted}</span>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500">
            Uploaded predictions will appear here.
          </div>
        )}
      </div>
    </div>
  );
}