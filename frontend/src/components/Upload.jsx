import axios from "axios";
import { useEffect, useRef, useState } from "react";
import { Upload as UploadIcon, CheckCircle, AlertCircle, FileText, X } from "lucide-react";

export default function Upload({ apiBase, onUploadComplete, onProcessingChange }) {
  const MAX_FILE_SIZE_BYTES = 1024 * 1024 * 1024;
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
  const [dragActive, setDragActive] = useState(false);
  const progressTimerRef = useRef(null);
  const uploadPhaseRef = useRef("idle");
  const jobPollRef = useRef(null);
  const fileInputRef = useRef(null);

  const updateUploadPhase = (nextPhase) => {
    uploadPhaseRef.current = nextPhase;
    setUploadPhase(nextPhase);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const droppedFile = e.dataTransfer?.files?.[0];
    if (droppedFile) {
      setFile(droppedFile);
      setError("");
    }
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
      setError("File size must be 1 GB or less.");
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
    <div className="space-y-5">
      {/* Drag and Drop Zone */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`relative rounded-3xl border-2 border-dashed transition-all duration-300 ${
          dragActive
            ? "border-teal-500 bg-teal-50/50 shadow-lg shadow-teal-200/30"
            : file
              ? "border-emerald-300 bg-emerald-50/50"
              : "border-slate-300 bg-slate-50/50 hover:border-teal-400"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".csv,text/csv"
          onChange={(e) => {
            setFile(e.target.files?.[0]);
            setError("");
          }}
        />

        <div className="px-6 py-8 text-center">
          {file ? (
            <>
              <div className="mb-3 flex justify-center">
                <div className="rounded-full bg-emerald-100 p-3">
                  <FileText className="h-6 w-6 text-emerald-600" />
                </div>
              </div>
              <p className="text-sm font-medium text-slate-900">File ready to upload</p>
              <p className="mt-1 text-xs text-slate-600">{file.name}</p>
              <p className="mt-1 text-xs text-slate-500">
                {Math.ceil(file.size / 1024)} KB • {file.type || "CSV"}
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="mt-3 text-xs font-medium text-teal-600 hover:text-teal-700"
              >
                Change file
              </button>
            </>
          ) : (
            <>
              <div className="mb-3 flex justify-center">
                <div
                  className={`rounded-full p-3 transition-colors ${
                    dragActive ? "bg-teal-100" : "bg-slate-100"
                  }`}
                >
                  <UploadIcon
                    className={`h-6 w-6 transition-colors ${
                      dragActive ? "text-teal-600" : "text-slate-600"
                    }`}
                  />
                </div>
              </div>
              <p className="text-sm font-medium text-slate-900">
                Drag and drop your CSV here
              </p>
              <p className="mt-1 text-xs text-slate-600">or click to select a file</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="mt-4 rounded-xl bg-teal-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-teal-700"
              >
                Select File
              </button>
              <p className="mt-3 text-xs text-slate-500">
                Maximum file size: 1 GB • CSV format only
              </p>
            </>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={uploadFile}
          disabled={!file || loading}
          className="flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Processing...
            </>
          ) : (
            <>
              <UploadIcon className="h-4 w-4" />
              Upload CSV
            </>
          )}
        </button>

        {file && !loading && (
          <button
            onClick={() => {
              setFile(null);
              setData([]);
              setSummary({});
              setDetectedColumn("");
              setDetectedAmountColumn("");
              setError("");
            }}
            className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-3 font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <X className="h-4 w-4" />
            Clear
          </button>
        )}
      </div>

      {/* Progress Bar */}
      {loading && (
        <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-50 to-emerald-50 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 animate-pulse rounded-full bg-teal-500" />
              <span className="text-sm font-medium text-slate-900">
                {uploadPhase === "processing" ? "Processing on server..." : "Uploading..."}
              </span>
            </div>
            <span className="text-xs font-semibold text-slate-600">
              {uploadProgress ?? 0}%
            </span>
          </div>

          {jobStatus && (
            <p className="mb-3 text-xs text-slate-600">{jobStatus}</p>
          )}

          <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 shadow-lg shadow-emerald-400/30 transition-all duration-200"
              style={{ width: `${uploadProgress ?? 0}%` }}
            />
          </div>
        </div>
      )}

      {/* Error & Results Section */}
      <div className="space-y-4">
        {error && (
          <div className="flex items-start gap-3 rounded-2xl border border-rose-300/60 bg-rose-50/80 px-4 py-3">
            <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-rose-600" />
            <p className="text-sm text-rose-700">{error}</p>
          </div>
        )}

        {data.length > 0 && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4">
            <div className="mb-4 flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-emerald-600" />
              <h3 className="font-semibold text-emerald-900">Upload Complete!</h3>
            </div>

            {detectedColumn && (
              <p className="mb-2 text-xs text-emerald-700">
                <span className="font-medium">Detected column:</span> {detectedColumn}
              </p>
            )}

            {detectedAmountColumn && (
              <p className="mb-3 text-xs text-emerald-700">
                <span className="font-medium">Amount column:</span> {detectedAmountColumn}
              </p>
            )}

            {Object.keys(summary).length > 0 && (
              <div className="mb-4">
                <p className="mb-2 text-xs font-medium text-slate-600">Category Distribution:</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(summary).map(([category, count]) => (
                    <span
                      key={category}
                      className="rounded-full border border-emerald-300 bg-white px-3 py-1 text-xs font-medium text-emerald-700"
                    >
                      {category}: {count}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="border-t border-emerald-200 pt-3">
              <p className="mb-2 text-xs font-medium text-slate-600">Sample Predictions:</p>
              <div className="space-y-2">
                {data.slice(0, 5).map((row, i) => (
                  <div
                    key={`${row.description}-${i}`}
                    className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm"
                  >
                    <span className="text-slate-700">{row.description}</span>
                    <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                      {row.predicted}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {!loading && data.length === 0 && !file && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 px-4 py-8 text-center">
            <FileText className="mx-auto mb-2 h-8 w-8 text-slate-400" />
            <p className="text-sm text-slate-600">Upload a CSV file to get started</p>
          </div>
        )}
      </div>
    </div>
  );
}