import SummaryCards from "../components/SummaryCards";
import ExpenseChart from "../components/ExpenseChart";
import Predict from "../components/Predict";
import AIChat from "../components/AIChat";
import Upload from "../components/Upload";
import Transactions from "../components/Transactions";
import { useEffect, useState } from "react";
import { Activity, Zap, TrendingUp, Clock, AlertCircle } from "lucide-react";

export default function Dashboard({ activeUser = "", initialPayload = null }) {
  const apiBase = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
  const [analytics, setAnalytics] = useState(
    () => initialPayload?.analytics ?? initialPayload ?? null,
  );
  const [transactions, setTransactions] = useState(
    () => initialPayload?.rows ?? [],
  );
  const [isDataProcessing, setIsDataProcessing] = useState(false);
  const [serverStatus, setServerStatus] = useState({
    connected: false,
    active_jobs: 0,
    accuracy: null,
    model_evaluation: null,
    robustness_report: null,
    privacy_controls: null,
    transactions: 0,
    server_time: null,
  });

  const firstName = activeUser ? activeUser.split("@")[0] : "Analyst";

  const clearWorkspace = () => {
    setAnalytics(null);
    setTransactions([]);
    setIsDataProcessing(false);
  };

  const handleUploadComplete = (payload) => {
    setAnalytics(payload.analytics ?? payload);
    setTransactions(payload.rows ?? []);
  };

  useEffect(() => {
    if (!initialPayload) {
      return;
    }

    setAnalytics(initialPayload.analytics ?? initialPayload);
    setTransactions(initialPayload.rows ?? []);
  }, [initialPayload]);

  useEffect(() => {
    const wsBase = apiBase.startsWith("https")
      ? apiBase.replace("https://", "wss://")
      : apiBase.replace("http://", "ws://");
    const normalizedWsBase = wsBase.replace(/\/+$/, "");

    let socket;
    let reconnectTimer;
    let isMounted = true;

    const connect = () => {
      if (!isMounted) {
        return;
      }

      try {
        socket = new WebSocket(`${normalizedWsBase}/ws/realtime`);
      } catch {
        setServerStatus((previous) => ({ ...previous, connected: false }));
        reconnectTimer = window.setTimeout(connect, 2000);
        return;
      }

      socket.onopen = () => {
        setServerStatus((previous) => ({ ...previous, connected: true }));
      };

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          setServerStatus({
            connected: true,
            active_jobs: payload.active_jobs ?? 0,
            accuracy: payload.accuracy ?? null,
            model_evaluation: payload.model_evaluation ?? null,
            robustness_report: payload.robustness_report ?? null,
            privacy_controls: payload.privacy_controls ?? null,
            transactions: payload.transactions ?? 0,
            server_time: payload.server_time ?? null,
          });
        } catch {
          setServerStatus((previous) => ({ ...previous, connected: false }));
        }
      };

      socket.onclose = () => {
        setServerStatus((previous) => ({ ...previous, connected: false }));
        reconnectTimer = window.setTimeout(connect, 2000);
      };

      socket.onerror = () => {
        setServerStatus((previous) => ({ ...previous, connected: false }));
      };
    };

    connect();

    return () => {
      isMounted = false;
      if (reconnectTimer) {
        window.clearTimeout(reconnectTimer);
      }
      if (socket && socket.readyState <= 1) {
        socket.close();
      }
    };
  }, [apiBase]);

  const tips = analytics?.savings_tips ?? [];
  const advancedFeatures = analytics?.advanced_features ?? [];
  const modelEvaluation = analytics?.model_evaluation ?? serverStatus.model_evaluation;
  const robustnessReport = analytics?.robustness_report ?? serverStatus.robustness_report;
  const privacyControls = analytics?.privacy_controls ?? serverStatus.privacy_controls;

  return (
    <div className="flex-1 w-full min-h-screen overflow-y-auto bg-[radial-gradient(circle_at_top_left,_#ecfeff_0%,_#f8fafc_38%,_#fff7ed_100%)]">
      {/* Top Status Cards */}
      <div className="sticky top-0 z-30 border-b border-white/80 bg-white/70 backdrop-blur-xl">
        <div className="px-4 py-6 sm:px-6 lg:px-8 xl:px-10">
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
            {/* Backend Status Card */}
            <div className={`group rounded-3xl border p-5 shadow-[0_14px_40px_-24px_rgba(15,23,42,0.45)] transition-all hover:-translate-y-0.5 hover:shadow-[0_18px_45px_-24px_rgba(15,23,42,0.55)] ${
              serverStatus.connected
                ? "border-emerald-200/70 bg-white/80"
                : "border-rose-200/70 bg-white/80"
            }`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Backend Status</p>
                  <p className={`mt-3 text-2xl font-bold ${serverStatus.connected ? "text-emerald-700" : "text-rose-700"}`}>
                    {serverStatus.connected ? "Online" : "Offline"}
                  </p>
                </div>
                <div className={`rounded-full p-2 ${serverStatus.connected ? "bg-emerald-100" : "bg-rose-100"}`}>
                  <div className={`h-3 w-3 rounded-full animate-pulse ${serverStatus.connected ? "bg-emerald-600" : "bg-rose-600"}`} />
                </div>
              </div>
            </div>

            {/* Active Jobs Card */}
            <div className="group rounded-3xl border border-cyan-200/70 bg-white/80 p-5 shadow-[0_14px_40px_-24px_rgba(14,116,144,0.45)] transition-all hover:-translate-y-0.5 hover:shadow-[0_18px_45px_-24px_rgba(14,116,144,0.55)]">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Active Jobs</p>
                  <p className="mt-3 text-2xl font-bold text-cyan-700">{serverStatus.active_jobs}</p>
                </div>
                <div className="rounded-full bg-cyan-100 p-2">
                  <Zap className="h-5 w-5 text-cyan-600" />
                </div>
              </div>
            </div>

            {/* Live Accuracy Card */}
            <div className="group rounded-3xl border border-violet-200/70 bg-white/80 p-5 shadow-[0_14px_40px_-24px_rgba(91,33,182,0.45)] transition-all hover:-translate-y-0.5 hover:shadow-[0_18px_45px_-24px_rgba(91,33,182,0.55)]">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Live Accuracy</p>
                  <p className="mt-3 text-2xl font-bold text-violet-700">
                    {typeof serverStatus.accuracy === "number"
                      ? `${(serverStatus.accuracy * 100).toFixed(1)}%`
                      : "N/A"}
                  </p>
                </div>
                <div className="rounded-full bg-violet-100 p-2">
                  <TrendingUp className="h-5 w-5 text-violet-600" />
                </div>
              </div>
            </div>

            {/* Last Update Card */}
            <div className="group rounded-3xl border border-amber-200/70 bg-white/80 p-5 shadow-[0_14px_40px_-24px_rgba(146,64,14,0.4)] transition-all hover:-translate-y-0.5 hover:shadow-[0_18px_45px_-24px_rgba(146,64,14,0.5)]">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Training Data</p>
                  <p className="mt-3 text-2xl font-bold text-amber-800">{serverStatus.transactions}</p>
                  <p className="mt-2 text-xs text-slate-500">
                    {serverStatus.server_time
                      ? new Date(serverStatus.server_time).toLocaleTimeString()
                      : "Waiting..."}
                  </p>
                </div>
                <div className="rounded-full bg-amber-100 p-2">
                  <Clock className="h-5 w-5 text-amber-700" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 py-6 sm:px-6 lg:px-8 xl:px-10">
        {/* Hero Section */}
        <div id="dashboard-section" className="mb-10 scroll-mt-4 lg:scroll-mt-8">
          <div className="relative overflow-hidden rounded-[2rem] border border-white/80 bg-white/75 p-8 shadow-[0_24px_50px_-30px_rgba(2,6,23,0.55)] backdrop-blur-sm lg:p-10">
            {/* Background decoration */}
            <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-cyan-300/20 blur-3xl" />
            <div className="absolute -bottom-16 -left-16 h-32 w-32 rounded-full bg-orange-300/20 blur-3xl" />

            <div className="relative">
              <div className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div className="flex-1">
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-700">
                    📊 Intelligent Transaction Analysis
                  </p>
                  <h1 className="mt-3 bg-gradient-to-r from-slate-900 via-cyan-900 to-orange-900 bg-clip-text text-4xl font-black text-transparent sm:text-5xl">
                    FinData Intelligence Analytics
                  </h1>
                  <p className="mt-3 max-w-2xl text-lg leading-relaxed text-slate-700">
                    Welcome back, <span className="font-semibold text-cyan-700">{firstName}</span>. Your personal AI-powered expense categorization system.
                  </p>
                  <p className="mt-2 text-sm text-slate-600">
                    Upload your transaction CSV, and watch as our machine learning model automatically categorizes your spending patterns.
                  </p>
                </div>

                {/* Model Status Card */}
                <div className="flex-shrink-0">
                  <div className="rounded-2xl border border-cyan-200/70 bg-gradient-to-br from-white to-cyan-50/40 px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-cyan-500 animate-pulse" />
                      <span className="text-xs font-semibold uppercase tracking-widest text-cyan-700">
                        System
                      </span>
                    </div>
                    <div className="mt-3 text-3xl font-bold text-slate-900">
                      {analytics ? "Active" : "Ready"}
                    </div>
                    <div className="mt-2 text-xs text-slate-600">
                      {analytics ? "Processing data" : "Awaiting upload"}
                    </div>
                    <button
                      type="button"
                      onClick={clearWorkspace}
                      disabled={!analytics}
                      className="mt-4 w-full rounded-lg border border-cyan-300 bg-cyan-50 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-cyan-700 transition hover:bg-cyan-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Reset Workspace
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 xl:px-10">
        <div className="mb-6">
          <SummaryCards summary={analytics} transactions={transactions} loading={!analytics} />
        </div>

        {isDataProcessing && (
          <div className="mb-6 flex items-center gap-3 rounded-2xl border border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50/50 px-5 py-4 text-sm text-amber-900 shadow-sm">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-amber-200 border-t-amber-600" />
            <div>
              <p className="font-semibold">Processing your CSV file</p>
              <p className="mt-0.5 text-xs text-amber-800">This may take a moment depending on file size.</p>
            </div>
          </div>
        )}

        {/* Analytics & AI Section */}
        <div id="analytics-section" className="mb-8 grid gap-6 xl:grid-cols-[1.35fr_0.85fr] scroll-mt-4 lg:scroll-mt-8">
          <div className="self-start">
            <ExpenseChart
              categoryTotals={analytics?.category_totals}
              loading={!analytics}
            />
          </div>

          <div className="space-y-6">
            <Predict apiBase={apiBase} />
            <AIChat apiBase={apiBase} analytics={analytics} />

            {/* Savings Tips Card */}
            <div className="rounded-3xl border border-white/80 bg-white/85 p-6 shadow-[0_16px_34px_-22px_rgba(15,23,42,0.45)] transition-shadow hover:shadow-[0_20px_38px_-20px_rgba(15,23,42,0.5)]">
              <div className="flex items-center gap-3 mb-4">
                <div className="rounded-full bg-orange-100 p-2">
                  <AlertCircle className="h-5 w-5 text-orange-600" />
                </div>
                <h2 className="text-lg font-bold text-slate-900">Savings Tips</h2>
              </div>
              <p className="text-sm text-slate-600 mb-4">
                AI-powered suggestions based on your spending patterns.
              </p>

              <div className="space-y-2">
                {tips.length > 0 ? (
                  tips.map((tip, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-3 rounded-xl border border-orange-200/60 bg-gradient-to-r from-orange-50/60 to-white p-3"
                    >
                      <span className="mt-0.5 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-orange-200 text-xs font-bold text-orange-700">
                        ✓
                      </span>
                      <p className="text-sm text-slate-700">{tip}</p>
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/50 px-4 py-6 text-center">
                    <p className="text-sm text-slate-500">Upload a CSV to unlock personalized savings tips</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Transactions & Upload Section */}
        <div className="mt-8 grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
          <Transactions transactions={transactions} isProcessing={isDataProcessing} />

          <div className="space-y-6">
            {/* Upload Section */}
            <div id="upload-section" className="scroll-mt-4 lg:scroll-mt-8">
              <Upload
                apiBase={apiBase}
                onUploadComplete={handleUploadComplete}
                onProcessingChange={setIsDataProcessing}
              />
            </div>

            {/* Privacy & Ethics Card */}
            <div className="rounded-3xl border border-white/80 bg-gradient-to-br from-white to-cyan-50/30 p-6 shadow-[0_16px_34px_-22px_rgba(15,23,42,0.45)] transition-shadow hover:shadow-[0_20px_38px_-20px_rgba(15,23,42,0.5)]">
              <div className="mb-4 flex items-center gap-3">
                <div className="rounded-full bg-sky-100 p-2">
                  <Activity className="h-5 w-5 text-sky-600" />
                </div>
                <h2 className="text-lg font-bold text-slate-900">Privacy & Ethics</h2>
              </div>
              <p className="text-sm leading-6 text-slate-700">
                {analytics?.privacy_note ??
                  "Your data stays private. All processing happens locally with zero external data sharing. We strip personally identifiable information and use only transaction descriptions for categorization."}
              </p>

              {advancedFeatures.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Advanced Features
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {advancedFeatures.map((feature) => (
                      <span
                        key={feature}
                        className="rounded-full border border-sky-300/50 bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700"
                      >
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {modelEvaluation && (
                <div className="mt-4 rounded-2xl border border-slate-200 bg-white/80 p-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Model Evaluation
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-lg bg-slate-100 px-3 py-2 text-slate-700">
                      Accuracy: {(Number(modelEvaluation.accuracy || 0) * 100).toFixed(1)}%
                    </div>
                    <div className="rounded-lg bg-slate-100 px-3 py-2 text-slate-700">
                      F1 Macro: {(Number(modelEvaluation.f1_macro || 0) * 100).toFixed(1)}%
                    </div>
                    <div className="rounded-lg bg-slate-100 px-3 py-2 text-slate-700">
                      Precision: {(Number(modelEvaluation.precision_macro || 0) * 100).toFixed(1)}%
                    </div>
                    <div className="rounded-lg bg-slate-100 px-3 py-2 text-slate-700">
                      Recall: {(Number(modelEvaluation.recall_macro || 0) * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
              )}

              {robustnessReport && (
                <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
                    Robustness Suite
                  </p>
                  <p className="mt-2 text-sm text-emerald-800">
                    Pass rate: {(Number(robustnessReport.accuracy || 0) * 100).toFixed(1)}%
                    {" "}({robustnessReport.passed ?? 0}/{robustnessReport.total_cases ?? 0})
                  </p>
                </div>
              )}

              {privacyControls && (
                <div className="mt-4 rounded-2xl border border-cyan-200 bg-cyan-50/60 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-cyan-700">
                    Privacy Controls
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full border border-cyan-200 bg-white px-2.5 py-1 text-cyan-700">
                      Anonymize: {privacyControls.anonymize_descriptions ? "ON" : "OFF"}
                    </span>
                    <span className="rounded-full border border-cyan-200 bg-white px-2.5 py-1 text-cyan-700">
                      Persist Uploads: {privacyControls.persist_uploaded_rows ? "ON" : "OFF"}
                    </span>
                    <span className="rounded-full border border-cyan-200 bg-white px-2.5 py-1 text-cyan-700">
                      Job History: {privacyControls.retain_job_history ? "ON" : "OFF"}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}