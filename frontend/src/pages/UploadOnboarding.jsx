import { useState } from "react";
import Upload from "../components/Upload";
import { Upload as UploadIcon, CheckCircle2, Zap } from "lucide-react";

export default function UploadOnboarding({ onUploadComplete, theme = "dark" }) {
  const isDark = theme === "dark";
  const apiBase = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const handleUploadComplete = (data) => {
    setUploadSuccess(true);
    onUploadComplete(data);
  };

  return (
    <main className={`upload-onboarding-page relative isolate min-h-screen overflow-x-hidden px-4 py-8 sm:px-6 lg:px-8 ${isDark ? "bg-[radial-gradient(circle_at_top_left,_#0f172a_0%,_#0b1324_40%,_#050b18_100%)] text-white" : "bg-[radial-gradient(circle_at_top_left,_#ecfeff_0%,_#f8fafc_38%,_#fff7ed_100%)] text-slate-900"}`}>
      {/* Background Decoration */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div className={`absolute -left-40 top-0 h-96 w-96 rounded-full blur-3xl animate-pulse ${isDark ? "bg-teal-500/25" : "bg-teal-300/25"}`} />
        <div
          className={`absolute -right-40 bottom-0 h-96 w-96 rounded-full blur-3xl animate-pulse ${isDark ? "bg-cyan-500/15" : "bg-cyan-300/25"}`}
          style={{ animationDelay: "1s" }}
        />
        <div className={`absolute left-1/2 top-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl ${isDark ? "bg-emerald-500/10" : "bg-emerald-300/20"}`} />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.06)_1px,transparent_1px)] bg-[size:44px_44px]" />
        {isDark && <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,rgba(2,6,23,0.58)_100%)]" />}
      </div>

      <div className="relative z-10 mx-auto max-w-2xl">
        {/* Header Section */}
        <div className="mb-8 text-center">
          <div className="mb-4 flex justify-center">
            <div className={`rounded-2xl p-3 backdrop-blur-sm ${isDark ? "border border-teal-400/30 bg-slate-900/70" : "border border-teal-200 bg-white/85"}`}>
              <UploadIcon className={`h-8 w-8 ${isDark ? "text-teal-300" : "text-teal-600"}`} />
            </div>
          </div>

          <p className={`text-xs font-semibold uppercase tracking-widest ${isDark ? "text-teal-300" : "text-teal-600"}`}>
            ✓ Account Setup
          </p>
          <h1 className={`mt-3 bg-clip-text text-4xl font-bold text-transparent ${isDark ? "bg-gradient-to-r from-white via-cyan-100 to-emerald-100" : "bg-gradient-to-r from-slate-900 via-cyan-900 to-emerald-900"}`}>
            Import Your Data
          </h1>
          <p className={`mt-3 text-lg ${isDark ? "text-slate-300" : "text-slate-600"}`}>
            Upload a CSV file with your transactions to unlock AI-powered insights and spending analysis.
          </p>
        </div>

        {/* Info Cards */}
        <div className="mb-8 grid gap-3 sm:grid-cols-3">
          <div className={`rounded-xl p-4 backdrop-blur-sm ${isDark ? "border border-white/10 bg-slate-900/45" : "border border-slate-200 bg-white/80"}`}>
            <div className={`mb-2 flex h-10 w-10 items-center justify-center rounded-lg ${isDark ? "bg-emerald-500/20" : "bg-emerald-100"}`}>
              <CheckCircle2 className={`h-5 w-5 ${isDark ? "text-emerald-300" : "text-emerald-600"}`} />
            </div>
            <p className={`text-sm font-medium ${isDark ? "text-slate-100" : "text-slate-900"}`}>Auto Detection</p>
            <p className={`mt-1 text-xs ${isDark ? "text-slate-300" : "text-slate-600"}`}>
              We'll automatically identify transaction details.
            </p>
          </div>

          <div className={`rounded-xl p-4 backdrop-blur-sm ${isDark ? "border border-white/10 bg-slate-900/45" : "border border-slate-200 bg-white/80"}`}>
            <div className={`mb-2 flex h-10 w-10 items-center justify-center rounded-lg ${isDark ? "bg-teal-500/20" : "bg-teal-100"}`}>
              <Zap className={`h-5 w-5 ${isDark ? "text-teal-300" : "text-teal-600"}`} />
            </div>
            <p className={`text-sm font-medium ${isDark ? "text-slate-100" : "text-slate-900"}`}>Instant Processing</p>
            <p className={`mt-1 text-xs ${isDark ? "text-slate-300" : "text-slate-600"}`}>
              Machine learning categorizes your data instantly.
            </p>
          </div>

          <div className={`rounded-xl p-4 backdrop-blur-sm ${isDark ? "border border-white/10 bg-slate-900/45" : "border border-slate-200 bg-white/80"}`}>
            <div className={`mb-2 flex h-10 w-10 items-center justify-center rounded-lg ${isDark ? "bg-sky-500/20" : "bg-sky-100"}`}>
              <div className={`h-5 w-5 rounded-full border-2 ${isDark ? "border-sky-300" : "border-sky-600"}`} />
            </div>
            <p className={`text-sm font-medium ${isDark ? "text-slate-100" : "text-slate-900"}`}>100% Private</p>
            <p className={`mt-1 text-xs ${isDark ? "text-slate-300" : "text-slate-600"}`}>
              Your data stays secure and never leaves your account.
            </p>
          </div>
        </div>

        {/* Processing Status */}
        {isProcessing && (
          <div className={`mb-6 flex items-center gap-3 rounded-xl px-4 py-3 backdrop-blur-sm ${isDark ? "border border-amber-400/35 bg-amber-500/10" : "border border-amber-300 bg-amber-50"}`}>
            <span className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />
            <p className={`text-sm font-medium ${isDark ? "text-amber-200" : "text-amber-800"}`}>Processing your CSV...</p>
          </div>
        )}

        {/* Success State */}
        {uploadSuccess && (
          <div className={`mb-6 flex items-center gap-3 rounded-xl px-4 py-3 backdrop-blur-sm ${isDark ? "border border-emerald-400/35 bg-emerald-500/10" : "border border-emerald-300 bg-emerald-50"}`}>
            <CheckCircle2 className={`h-5 w-5 ${isDark ? "text-emerald-300" : "text-emerald-600"}`} />
            <p className={`text-sm font-medium ${isDark ? "text-emerald-200" : "text-emerald-800"}`}>
              Upload complete! Redirecting to dashboard...
            </p>
          </div>
        )}

        {/* Upload Component */}
        <Upload
          apiBase={apiBase}
          onUploadComplete={handleUploadComplete}
          onProcessingChange={setIsProcessing}
          showHeader={false}
          theme={theme === "dark" ? "dark" : "light"}
        />

        {/* Footer Info */}
        <div className="mt-4 text-center">
          <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            Supported formats: CSV files up to 1 GB with transaction descriptions and amounts.
          </p>
        </div>
      </div>
    </main>
  );
}
