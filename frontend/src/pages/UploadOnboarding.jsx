import { useState } from "react";
import Upload from "../components/Upload";
import { Upload as UploadIcon, CheckCircle2, Zap } from "lucide-react";

export default function UploadOnboarding({ onUploadComplete }) {
  const apiBase = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const handleUploadComplete = (data) => {
    setUploadSuccess(true);
    setTimeout(() => {
      onUploadComplete(data);
    }, 500);
  };

  return (
    <main className="relative overflow-x-hidden bg-gradient-to-br from-slate-50 via-white to-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      {/* Background Decoration */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 top-0 h-96 w-96 rounded-full bg-teal-300/20 blur-3xl" />
        <div className="absolute -right-32 top-40 h-80 w-80 rounded-full bg-emerald-300/20 blur-3xl" />
        <div className="absolute bottom-0 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-sky-300/15 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-2xl">
        {/* Header Section */}
        <div className="mb-8 text-center">
          <div className="mb-4 flex justify-center">
            <div className="rounded-2xl border border-teal-200/60 bg-teal-50/80 p-3 backdrop-blur-sm">
              <UploadIcon className="h-8 w-8 text-teal-600" />
            </div>
          </div>

          <p className="text-xs font-semibold uppercase tracking-widest text-teal-600">
            ✓ Account Setup
          </p>
          <h1 className="mt-3 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 bg-clip-text text-4xl font-bold text-transparent">
            Import Your Data
          </h1>
          <p className="mt-3 text-lg text-slate-600">
            Upload a CSV file with your transactions to unlock AI-powered insights and spending analysis.
          </p>
        </div>

        {/* Info Cards */}
        <div className="mb-8 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white/75 p-4 backdrop-blur-sm">
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
            <p className="text-sm font-medium text-slate-900">Auto Detection</p>
            <p className="mt-1 text-xs text-slate-600">
              We'll automatically identify transaction details.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white/75 p-4 backdrop-blur-sm">
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-teal-100">
              <Zap className="h-5 w-5 text-teal-600" />
            </div>
            <p className="text-sm font-medium text-slate-900">Instant Processing</p>
            <p className="mt-1 text-xs text-slate-600">
              Machine learning categorizes your data instantly.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white/75 p-4 backdrop-blur-sm">
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-sky-100">
              <div className="h-5 w-5 rounded-full border-2 border-sky-600" />
            </div>
            <p className="text-sm font-medium text-slate-900">100% Private</p>
            <p className="mt-1 text-xs text-slate-600">
              Your data stays secure and never leaves your account.
            </p>
          </div>
        </div>

        {/* Processing Status */}
        {isProcessing && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-amber-300/50 bg-amber-50/80 px-4 py-3 backdrop-blur-sm">
            <span className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />
            <p className="text-sm font-medium text-amber-900">Processing your CSV...</p>
          </div>
        )}

        {/* Success State */}
        {uploadSuccess && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-emerald-300/50 bg-emerald-50/80 px-4 py-3 backdrop-blur-sm">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            <p className="text-sm font-medium text-emerald-900">
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
        />

        {/* Footer Info */}
        <div className="mt-4 text-center">
          <p className="text-xs text-slate-500">
            Supported formats: CSV files up to 1 GB with transaction descriptions and amounts.
          </p>
        </div>
      </div>
    </main>
  );
}
