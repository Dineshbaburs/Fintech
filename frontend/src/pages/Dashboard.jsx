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

  return (
    <div className="flex-1 w-full min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30">
      {/* Top Status Cards */}
      <div className="px-4 py-6 sm:px-6 lg:px-8 xl:px-10">
        <div className="mb-8 grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
          {/* Backend Status Card */}
          <div className={`group rounded-2xl border-2 p-5 shadow-lg transition-all hover:shadow-xl ${
            serverStatus.connected
              ? "border-emerald-200 bg-gradient-to-br from-emerald-50/80 to-emerald-100/40"
              : "border-rose-200 bg-gradient-to-br from-rose-50/80 to-rose-100/40"
          }`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-600">Backend Status</p>
                <p className={`mt-3 text-2xl font-bold ${serverStatus.connected ? "text-emerald-700" : "text-rose-700"}`}>
                  {serverStatus.connected ? "Online" : "Offline"}
                </p>
              </div>
              <div className={`rounded-full p-2 ${serverStatus.connected ? "bg-emerald-200/40" : "bg-rose-200/40"}`}>
                <div className={`h-3 w-3 rounded-full animate-pulse ${serverStatus.connected ? "bg-emerald-600" : "bg-rose-600"}`} />
              </div>
            </div>
          </div>

          {/* Active Jobs Card */}
          <div className="group rounded-2xl border-2 border-teal-200 bg-gradient-to-br from-teal-50/80 to-teal-100/40 p-5 shadow-lg transition-all hover:shadow-xl">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-600">Active Jobs</p>
                <p className="mt-3 text-2xl font-bold text-teal-700">{serverStatus.active_jobs}</p>
              </div>
              <div className="rounded-full bg-teal-200/40 p-2">
                <Zap className="h-5 w-5 text-teal-600" />
              </div>
            </div>
          </div>

          {/* Live Accuracy Card */}
          <div className="group rounded-2xl border-2 border-sky-200 bg-gradient-to-br from-sky-50/80 to-sky-100/40 p-5 shadow-lg transition-all hover:shadow-xl">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-600">Live Accuracy</p>
                <p className="mt-3 text-2xl font-bold text-sky-700">
                  {typeof serverStatus.accuracy === "number"
                    ? `${(serverStatus.accuracy * 100).toFixed(1)}%`
                    : "N/A"}
                </p>
              </div>
              <div className="rounded-full bg-sky-200/40 p-2">
                <TrendingUp className="h-5 w-5 text-sky-600" />
              </div>
            </div>
          </div>

          {/* Last Update Card */}
          <div className="group rounded-2xl border-2 border-slate-200 bg-gradient-to-br from-slate-50/80 to-slate-100/40 p-5 shadow-lg transition-all hover:shadow-xl">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-600">Training Data</p>
                <p className="mt-3 text-2xl font-bold text-slate-700">{serverStatus.transactions}</p>
                <p className="mt-2 text-xs text-slate-600">
                  {serverStatus.server_time
                    ? new Date(serverStatus.server_time).toLocaleTimeString()
                    : "Waiting..."}
                </p>
              </div>
              <div className="rounded-full bg-slate-200/40 p-2">
                <Clock className="h-5 w-5 text-slate-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Hero Section */}
        <div id="dashboard-section" className="mb-10 scroll-mt-4 lg:scroll-mt-8">
          <div className="relative overflow-hidden rounded-3xl border border-gradient-to-r border-slate-200 bg-gradient-to-br from-slate-50 via-teal-50/40 to-emerald-50/30 p-8 shadow-lg lg:p-10">
            {/* Background decoration */}
            <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-teal-400/10 blur-3xl" />
            <div className="absolute -bottom-16 -left-16 h-32 w-32 rounded-full bg-emerald-400/10 blur-3xl" />

            <div className="relative">
              <div className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div className="flex-1">
                  <p className="text-sm font-semibold uppercase tracking-widest text-teal-600">
                    📊 Intelligent Transaction Analysis
                  </p>
                  <h1 className="mt-3 bg-gradient-to-r from-slate-900 via-slate-800 to-teal-900 bg-clip-text text-4xl font-bold text-transparent sm:text-5xl">
                    SmartSpend Analytics
                  </h1>
                  <p className="mt-3 max-w-2xl text-lg leading-relaxed text-slate-700">
                    Welcome back, <span className="font-semibold text-teal-700">{firstName}</span>. Your personal AI-powered expense categorization system.
                  </p>
                  <p className="mt-2 text-sm text-slate-600">
                    Upload your transaction CSV, and watch as our machine learning model automatically categorizes your spending patterns.
                  </p>
                </div>

                {/* Model Status Card */}
                <div className="flex-shrink-0">
                  <div className="rounded-2xl border-2 border-teal-300/60 bg-white/80 px-6 py-4 backdrop-blur-sm">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-teal-500 animate-pulse" />
                      <span className="text-xs font-semibold uppercase tracking-widest text-teal-700">
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
                      className="mt-4 w-full rounded-lg border border-teal-300 bg-teal-50 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-teal-700 transition hover:bg-teal-100 disabled:cursor-not-allowed disabled:opacity-50"
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
          <div className="mb-6 flex items-center gap-3 rounded-2xl border-l-4 border-l-amber-500 border-y border-r border-amber-200 bg-gradient-to-r from-amber-50/80 to-transparent px-5 py-4 text-sm text-amber-900">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-amber-200 border-t-amber-600" />
            <div>
              <p className="font-semibold">Processing your CSV file</p>
              <p className="mt-0.5 text-xs text-amber-800">This may take a moment depending on file size.</p>
            </div>
          </div>
        )}

        {/* Analytics & AI Section */}
        <div id="analytics-section" className="mb-8 grid gap-6 xl:grid-cols-[1.35fr_0.85fr] scroll-mt-4 lg:scroll-mt-8">
          <ExpenseChart
            categoryTotals={analytics?.category_totals}
            loading={!analytics}
          />

          <div className="space-y-6">
            <Predict apiBase={apiBase} />
            <AIChat apiBase={apiBase} analytics={analytics} />

            {/* Savings Tips Card */}
            <div className="rounded-3xl border-2 border-slate-200 bg-white p-6 shadow-lg transition-shadow hover:shadow-xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="rounded-full bg-emerald-100 p-2">
                  <AlertCircle className="h-5 w-5 text-emerald-600" />
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
                      className="flex items-start gap-3 rounded-xl border border-emerald-200/50 bg-gradient-to-r from-emerald-50/50 to-transparent p-3"
                    >
                      <span className="mt-0.5 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-emerald-200 text-xs font-bold text-emerald-700">
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
            <div className="rounded-3xl border-2 border-slate-200 bg-gradient-to-br from-white to-slate-50 p-6 shadow-lg transition-shadow hover:shadow-xl">
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}