import axios from "axios";
import { useEffect, useRef, useState } from "react";
import {
  Upload as UploadIcon,
  CheckCircle,
  AlertCircle,
  FileText,
  X,
  Sparkles,
  ShieldCheck,
  FolderCheck,
  BrainCircuit,
  BarChart3,
} from "lucide-react";

export default function Upload({
  apiBase,
  onUploadComplete,
  onProcessingChange,
  showHeader = true,
  theme = "dark",
}) {
  const MAX_FILE_SIZE_BYTES = 1024 * 1024 * 1024;
  const [file, setFile] = useState(null);
  const [data, setData] = useState([]);
  const [summary, setSummary] = useState({});
  const [detectedColumn, setDetectedColumn] = useState("");
  const [detectedAmountColumn, setDetectedAmountColumn] = useState("");
  const [detectedAccountColumn, setDetectedAccountColumn] = useState("");
  const [csvQuality, setCsvQuality] = useState(null);
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
      await axios.get(`${apiBase}/health`, { timeout: 5000 });
    } catch {
      setError("Cannot reach backend server. Start the API at http://127.0.0.1:8000 and try again.");
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
      setDetectedAccountColumn(res.data.detected_account_column ?? "");
      setCsvQuality(res.data.csv_quality ?? null);

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

  const formatFileSize = (bytes) => {
    if (!bytes) {
      return "0 KB";
    }

    const mb = bytes / (1024 * 1024);
    if (mb >= 1) {
      return `${mb.toFixed(2)} MB`;
    }

    return `${Math.ceil(bytes / 1024)} KB`;
  };

  const pipelineSteps = [
    {
      id: "ready",
      label: "File Ready",
      detail: file ? file.name : "Select your CSV file",
      icon: FolderCheck,
      active: Boolean(file) && uploadPhase === "idle",
      complete: Boolean(file),
    },
    {
      id: "process",
      label: "AI Processing",
      detail: loading ? (jobStatus || "Running categorization") : "Waiting for upload",
      icon: BrainCircuit,
      active: loading,
      complete: uploadPhase === "done" || data.length > 0,
    },
    {
      id: "insights",
      label: "Insights Ready",
      detail:
        data.length > 0
          ? `${data.length} rows analyzed`
          : "Predictions will appear here",
      icon: BarChart3,
      active: uploadPhase === "done" || data.length > 0,
      complete: data.length > 0,
    },
  ];

  const isLightTheme = theme === "light";

  return (
    <div className={`relative space-y-6 overflow-hidden rounded-3xl p-4 sm:p-5 ${
      isLightTheme
        ? "border border-white/80 bg-gradient-to-br from-white via-cyan-50/35 to-emerald-50/30 text-slate-900 shadow-[0_16px_34px_-22px_rgba(15,23,42,0.45)]"
        : "bg-[radial-gradient(circle_at_top_left,_#0f172a_0%,_#0b1324_40%,_#050b18_100%)] text-slate-100"
    }`}>
      <div className="pointer-events-none absolute inset-0">
        <div className={`absolute -left-40 top-0 h-96 w-96 rounded-full blur-3xl animate-pulse ${isLightTheme ? "bg-teal-300/25" : "bg-teal-500/25"}`} />
        <div
          className={`absolute -right-40 bottom-0 h-96 w-96 rounded-full blur-3xl animate-pulse ${isLightTheme ? "bg-cyan-300/20" : "bg-cyan-500/15"}`}
          style={{ animationDelay: "1s" }}
        />
        <div className={`absolute left-1/2 top-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl ${isLightTheme ? "bg-emerald-300/15" : "bg-emerald-500/10"}`} />
        <div className={`absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.06)_1px,transparent_1px)] bg-[size:44px_44px] ${isLightTheme ? "opacity-40" : "opacity-100"}`} />
      </div>

      <div className="relative z-10 space-y-6">

      {showHeader && (
        <div className={`relative overflow-hidden rounded-3xl p-6 backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 ${
          isLightTheme
            ? "border border-cyan-200/60 bg-white/75 shadow-[0_14px_30px_-18px_rgba(14,116,144,0.45)] hover:shadow-[0_20px_36px_-20px_rgba(14,116,144,0.5)]"
            : "border border-slate-700 bg-slate-900/90 shadow-[0_20px_40px_-24px_rgba(6,182,212,0.5)] hover:shadow-[0_28px_50px_-24px_rgba(6,182,212,0.58)]"
        }`}>
          <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-cyan-300/20 blur-2xl" />
          <div className="pointer-events-none absolute -left-8 -bottom-8 h-24 w-24 rounded-full bg-emerald-300/20 blur-2xl" />

          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.15em] ${
                isLightTheme
                  ? "border border-cyan-200 bg-cyan-50 text-cyan-700"
                  : "border border-slate-700 bg-slate-800 text-teal-300"
              }`}>
                <Sparkles className="h-3.5 w-3.5" />
                Upload Studio
              </p>
              <h2 className={`mt-3 text-2xl font-bold tracking-tight ${isLightTheme ? "text-slate-900" : "text-white"}`}>Import transaction CSV</h2>
              <p className={`mt-1 text-sm ${isLightTheme ? "text-slate-600" : "text-slate-200"}`}>
                Drag your file, validate instantly, and run AI categorization in one flow.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className={`rounded-full px-3 py-1.5 text-xs font-medium ${isLightTheme ? "border border-slate-200 bg-white text-slate-700" : "border border-slate-700 bg-slate-800 text-slate-200"}`}>
                CSV only
              </span>
              <span className={`rounded-full px-3 py-1.5 text-xs font-medium ${isLightTheme ? "border border-slate-200 bg-white text-slate-700" : "border border-slate-700 bg-slate-800 text-slate-200"}`}>
                Max 1 GB
              </span>
              <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium ${isLightTheme ? "border border-emerald-200 bg-emerald-50 text-emerald-700" : "border border-emerald-500/30 bg-emerald-500/10 text-emerald-300"}`}>
                <ShieldCheck className="h-3.5 w-3.5" />
                Private
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Drag and Drop Zone */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`relative overflow-hidden rounded-3xl border-2 border-dashed transition-all duration-300 ${
          dragActive
            ? isLightTheme
              ? "border-cyan-400 bg-white/90 shadow-[0_16px_30px_-20px_rgba(6,182,212,0.45)]"
              : "border-cyan-400 bg-slate-900/90 shadow-[0_20px_40px_-24px_rgba(6,182,212,0.5)]"
            : file
              ? isLightTheme
                ? "border-emerald-400/60 bg-white/90"
                : "border-emerald-500/50 bg-slate-900/90"
              : isLightTheme
                ? "border-slate-300 bg-white/80 hover:border-cyan-300/70 hover:-translate-y-0.5"
                : "border-slate-700 bg-slate-900/85 hover:border-cyan-300/50 hover:-translate-y-0.5"
        }`}
      >
        <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-cyan-300/20 blur-2xl" />
        <div className="pointer-events-none absolute -left-8 -bottom-8 h-24 w-24 rounded-full bg-emerald-300/20 blur-2xl" />

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

        <div className="relative px-6 py-9 text-center">
          {file ? (
            <>
              <div className="mb-3 flex justify-center">
                <div className="rounded-full border border-emerald-500/30 bg-emerald-500/10 p-3">
                  <FileText className="h-6 w-6 text-emerald-600" />
                </div>
              </div>
              <p className={`text-sm font-medium ${isLightTheme ? "text-slate-900" : "text-slate-100"}`}>File ready to upload</p>
              <p className={`mt-1 text-xs ${isLightTheme ? "text-slate-600" : "text-slate-300"}`}>{file.name}</p>
              <p className={`mt-1 text-xs ${isLightTheme ? "text-slate-500" : "text-slate-400"}`}>
                {formatFileSize(file.size)} • {file.type || "CSV"}
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="mt-3 text-xs font-semibold text-teal-300 transition hover:text-teal-200"
              >
                Change file
              </button>
            </>
          ) : (
            <>
              <div className="mb-3 flex justify-center">
                <div
                  className={`rounded-full p-3 transition-colors ${
                    dragActive ? "border border-cyan-300/40 bg-cyan-500/15" : "border border-slate-700 bg-slate-800"
                  }`}
                >
                  <UploadIcon
                    className={`h-6 w-6 transition-colors ${
                      dragActive ? "text-cyan-300" : "text-slate-300"
                    }`}
                  />
                </div>
              </div>
              <p className={`text-sm font-medium ${isLightTheme ? "text-slate-900" : "text-slate-100"}`}>
                Drag and drop your CSV here
              </p>
              <p className={`mt-1 text-xs ${isLightTheme ? "text-slate-600" : "text-slate-300"}`}>or click to select a file</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="mt-4 rounded-xl bg-gradient-to-r from-cyan-600 to-emerald-600 px-5 py-2.5 text-xs font-semibold tracking-wide text-white shadow-lg shadow-cyan-500/30 transition duration-200 hover:-translate-y-0.5 hover:shadow-cyan-400/50 active:scale-[0.98]"
              >
                Select File
              </button>
              <p className={`mt-3 text-xs ${isLightTheme ? "text-slate-500" : "text-slate-300"}`}>
                Maximum file size: 1 GB • CSV format only
              </p>
            </>
          )}
        </div>
      </div>

      {(detectedColumn || detectedAmountColumn || detectedAccountColumn || csvQuality) && (
        <div className={`rounded-2xl border p-4 ${isLightTheme ? "border-slate-200 bg-white/80" : "border-slate-700 bg-slate-900/80"}`}>
          <h3 className={`text-sm font-semibold ${isLightTheme ? "text-slate-900" : "text-slate-100"}`}>CSV quality report</h3>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <div className={`rounded-xl border px-3 py-2 text-xs ${isLightTheme ? "border-slate-200 bg-slate-50 text-slate-700" : "border-slate-700 bg-slate-800 text-slate-200"}`}>
              Text column: {detectedColumn || "Not detected"}
            </div>
            <div className={`rounded-xl border px-3 py-2 text-xs ${isLightTheme ? "border-slate-200 bg-slate-50 text-slate-700" : "border-slate-700 bg-slate-800 text-slate-200"}`}>
              Amount column: {detectedAmountColumn || "Not detected"}
            </div>
            <div className={`rounded-xl border px-3 py-2 text-xs ${isLightTheme ? "border-slate-200 bg-slate-50 text-slate-700" : "border-slate-700 bg-slate-800 text-slate-200"}`}>
              Account column: {detectedAccountColumn || "Default"}
            </div>
            <div className={`rounded-xl border px-3 py-2 text-xs ${isLightTheme ? "border-slate-200 bg-slate-50 text-slate-700" : "border-slate-700 bg-slate-800 text-slate-200"}`}>
              Completeness: {csvQuality?.completeness_score ?? 0}%
            </div>
          </div>
          {Array.isArray(csvQuality?.warnings) && csvQuality.warnings.length > 0 && (
            <div className="mt-2 space-y-1">
              {csvQuality.warnings.map((warning) => (
                <div key={warning} className={`rounded-lg border px-3 py-1.5 text-xs ${isLightTheme ? "border-amber-200 bg-amber-50 text-amber-800" : "border-amber-500/30 bg-amber-500/10 text-amber-300"}`}>
                  {warning}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={uploadFile}
          disabled={!file || loading}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-emerald-600 px-6 py-3 font-semibold tracking-wide text-white shadow-lg shadow-cyan-500/30 transition duration-200 hover:-translate-y-0.5 hover:shadow-cyan-400/50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
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
            className={`flex items-center gap-2 rounded-xl px-6 py-3 font-medium transition duration-200 hover:-translate-y-0.5 ${
              isLightTheme
                ? "border border-slate-300 bg-white text-slate-700 hover:border-cyan-300/60 hover:bg-cyan-50"
                : "border border-slate-700 bg-slate-800 text-slate-200 hover:border-cyan-300/40 hover:bg-slate-700"
            }`}
          >
            <X className="h-4 w-4" />
            Clear
          </button>
        )}
      </div>

      <div className={`rounded-2xl p-4 backdrop-blur-xl transition duration-300 ${
        isLightTheme
          ? "border border-slate-200 bg-white/80 shadow-[0_12px_24px_-16px_rgba(14,116,144,0.35)] hover:shadow-[0_18px_30px_-16px_rgba(14,116,144,0.42)]"
          : "border border-slate-700 bg-slate-900/90 shadow-[0_20px_40px_-24px_rgba(6,182,212,0.5)] hover:shadow-[0_26px_48px_-24px_rgba(6,182,212,0.58)]"
      }`}>
        <div className="mb-3 flex items-center justify-between">
          <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${isLightTheme ? "text-slate-700" : "text-slate-200"}`}>AI Pipeline</p>
          <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] ${isLightTheme ? "border border-slate-200 bg-white text-slate-700" : "border border-slate-700 bg-slate-800 text-slate-200"}`}>
            {loading ? "Live" : data.length > 0 ? "Complete" : "Standby"}
          </span>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {pipelineSteps.map((step) => {
            const StepIcon = step.icon;

            return (
              <div
                key={step.id}
                className={`rounded-xl border p-3 transition duration-200 hover:-translate-y-0.5 ${
                  step.complete
                    ? "border-emerald-300/40 bg-emerald-500/10"
                    : step.active
                      ? "border-cyan-300/40 bg-cyan-500/10"
                      : isLightTheme
                        ? "border-slate-200 bg-white"
                        : "border-slate-700 bg-slate-800"
                }`}
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="inline-flex items-center gap-2">
                    <StepIcon
                      className={`h-4 w-4 ${
                        step.complete
                          ? "text-emerald-300"
                          : step.active
                            ? "text-cyan-300"
                            : "text-slate-300"
                      }`}
                    />
                    <p className={`text-xs font-semibold ${isLightTheme ? "text-slate-900" : "text-white"}`}>{step.label}</p>
                  </div>
                  {step.complete && <CheckCircle className="h-4 w-4 text-emerald-300" />}
                </div>
                <p className={`truncate text-xs ${isLightTheme ? "text-slate-600" : "text-slate-200"}`}>{step.detail}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Progress Bar */}
      {loading && (
        <div className={`rounded-2xl p-4 backdrop-blur-xl transition duration-300 ${
          isLightTheme
            ? "border border-emerald-200 bg-white/85 shadow-[0_12px_24px_-16px_rgba(16,185,129,0.35)] hover:shadow-[0_18px_30px_-16px_rgba(16,185,129,0.4)]"
            : "border border-slate-700 bg-slate-900/90 shadow-[0_20px_40px_-24px_rgba(16,185,129,0.45)] hover:shadow-[0_26px_48px_-24px_rgba(16,185,129,0.5)]"
        }`}>
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-400" />
              <span className={`text-sm font-medium ${isLightTheme ? "text-slate-900" : "text-white"}`}>
                {uploadPhase === "processing" ? "Processing on server..." : "Uploading..."}
              </span>
            </div>
            <span className={`text-xs font-semibold ${isLightTheme ? "text-slate-600" : "text-slate-200"}`}>
              {uploadProgress ?? 0}%
            </span>
          </div>

          {jobStatus && (
            <p className={`mb-3 text-xs ${isLightTheme ? "text-slate-600" : "text-slate-200"}`}>{jobStatus}</p>
          )}

          <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-700/80">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 shadow-lg shadow-cyan-300/30 transition-all duration-200"
              style={{ width: `${uploadProgress ?? 0}%` }}
            />
          </div>
        </div>
      )}

      {/* Error & Results Section */}
      <div className="space-y-4">
        {error && (
          <div className={`flex items-start gap-3 rounded-2xl border px-4 py-3 shadow-[0_12px_24px_-18px_rgba(239,68,68,0.8)] ${
            isLightTheme ? "border-rose-200 bg-rose-50" : "border-red-500/30 bg-red-500/10"
          }`}>
            <AlertCircle className={`mt-0.5 h-5 w-5 flex-shrink-0 ${isLightTheme ? "text-rose-600" : "text-rose-300"}`} />
            <p className={`text-sm ${isLightTheme ? "text-rose-800" : "text-rose-100"}`}>{error}</p>
          </div>
        )}

        {data.length > 0 && (
          <div className={`rounded-2xl border p-4 shadow-[0_12px_24px_-18px_rgba(16,185,129,0.8)] ${
            isLightTheme ? "border-emerald-200 bg-emerald-50" : "border-emerald-500/30 bg-emerald-500/10"
          }`}>
            <div className="mb-4 flex items-center gap-2">
              <CheckCircle className={`h-5 w-5 ${isLightTheme ? "text-emerald-600" : "text-emerald-300"}`} />
              <h3 className={`font-semibold ${isLightTheme ? "text-emerald-800" : "text-emerald-100"}`}>Upload Complete!</h3>
            </div>

            {detectedColumn && (
              <p className={`mb-2 text-xs ${isLightTheme ? "text-emerald-800" : "text-emerald-100"}`}>
                <span className="font-medium">Detected column:</span> {detectedColumn}
              </p>
            )}

            {detectedAmountColumn && (
              <p className={`mb-3 text-xs ${isLightTheme ? "text-emerald-800" : "text-emerald-100"}`}>
                <span className="font-medium">Amount column:</span> {detectedAmountColumn}
              </p>
            )}

            {Object.keys(summary).length > 0 && (
              <div className="mb-4">
                <p className={`mb-2 text-xs font-medium ${isLightTheme ? "text-slate-800" : "text-slate-100"}`}>Category Distribution:</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(summary).map(([category, count]) => (
                    <span
                      key={category}
                      className={`rounded-full border border-emerald-300/40 px-3 py-1 text-xs font-medium ${isLightTheme ? "bg-white text-emerald-700" : "bg-slate-800 text-emerald-100"}`}
                    >
                      {category}: {count}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="border-t border-emerald-300/40 pt-3">
              <p className={`mb-2 text-xs font-medium ${isLightTheme ? "text-slate-800" : "text-slate-100"}`}>Sample Predictions:</p>
              <div className="space-y-2">
                {data.slice(0, 5).map((row, i) => (
                  <div
                    key={`${row.description}-${i}`}
                    className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${isLightTheme ? "border border-slate-200 bg-white" : "border border-slate-700 bg-slate-800"}`}
                  >
                    <span className={isLightTheme ? "text-slate-800" : "text-slate-100"}>{row.description}</span>
                    <span className={`rounded-full border border-emerald-300/40 px-2.5 py-0.5 text-xs font-semibold ${isLightTheme ? "bg-emerald-50 text-emerald-700" : "bg-emerald-500/20 text-emerald-100"}`}>
                      {row.predicted}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {!loading && data.length === 0 && !file && (
          <div className={`rounded-2xl border border-dashed px-4 py-8 text-center backdrop-blur-xl transition duration-300 ${isLightTheme ? "border-slate-300 bg-white/75 hover:border-cyan-300/70 hover:bg-cyan-50/40" : "border-slate-700 bg-slate-900/85 hover:border-cyan-300/40 hover:bg-slate-900"}`}>
            <FileText className={`mx-auto mb-2 h-8 w-8 ${isLightTheme ? "text-slate-500" : "text-slate-300"}`} />
            <p className={`text-sm ${isLightTheme ? "text-slate-800" : "text-slate-100"}`}>Upload a CSV file to get started</p>
            <p className={`mt-1 text-xs ${isLightTheme ? "text-slate-600" : "text-slate-300"}`}>Your category insights will appear instantly after processing.</p>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}