import SummaryCards from "../components/SummaryCards";
import ExpenseChart from "../components/ExpenseChart";
import Predict from "../components/Predict";
import AIChat from "../components/AIChat";
import Upload from "../components/Upload";
import Transactions from "../components/Transactions";
import { useEffect, useState } from "react";
import { Activity, Zap, TrendingUp, Clock, AlertCircle } from "lucide-react";

export default function Dashboard({ activeUser = "", initialPayload = null, theme = "light" }) {
  const SECTION_IDS = ["dashboard-section", "analytics-section", "upload-section"];
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
  const [activeSection, setActiveSection] = useState(() => {
    const hash = window.location.hash.replace("#", "");
    return SECTION_IDS.includes(hash) ? hash : "dashboard-section";
  });
  const [activePanel, setActivePanel] = useState("dashboard");
  const isDarkTheme = theme === "dark";

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

  useEffect(() => {
    const handleSectionNavigation = (event) => {
      if (!(event.target instanceof Element)) {
        return;
      }

      const link = event.target.closest('a[href^="#"]');
      if (!link) {
        return;
      }

      const target = link.getAttribute("href")?.replace("#", "");
      if (!target || !SECTION_IDS.includes(target)) {
        return;
      }

      const clickedLabel = (link.textContent || "").toLowerCase();
      if (target === "dashboard-section") {
        setActivePanel("dashboard");
      } else if (target === "upload-section") {
        setActivePanel("upload");
      } else if (clickedLabel.includes("prediction")) {
        setActivePanel("predictions");
      } else if (clickedLabel.includes("ai chat")) {
        setActivePanel("ai-chat");
      } else if (clickedLabel.includes("expense")) {
        setActivePanel("expenses");
      } else {
        setActivePanel("analytics");
      }

      setActiveSection(target);
      window.history.replaceState(null, "", `#${target}`);
    };

    document.addEventListener("click", handleSectionNavigation);
    return () => {
      document.removeEventListener("click", handleSectionNavigation);
    };
  }, []);

  useEffect(() => {
    const element = document.getElementById(activeSection);
    if (!element) {
      return;
    }

    requestAnimationFrame(() => {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [activeSection]);

  const tips = analytics?.savings_tips ?? [];
  const advancedFeatures = analytics?.advanced_features ?? [];
  const modelEvaluation = analytics?.model_evaluation ?? serverStatus.model_evaluation;
  const robustnessReport = analytics?.robustness_report ?? serverStatus.robustness_report;
  const privacyControls = analytics?.privacy_controls ?? serverStatus.privacy_controls;

  return (
    <div className={`dashboard-page flex-1 w-full min-h-screen overflow-y-auto ${isDarkTheme ? "bg-[radial-gradient(circle_at_top_left,_#0f172a_0%,_#0b1324_40%,_#050b18_100%)] text-slate-100" : "bg-[radial-gradient(circle_at_top_left,_#ecfeff_0%,_#f8fafc_38%,_#fff7ed_100%)]"}`}>
      {activeSection === "dashboard-section" && (
        <>
          <div className="sticky top-0 z-30 border-b border-white/80 bg-white/70 backdrop-blur-xl">
            <div className="px-4 py-6 sm:px-6 lg:px-8 xl:px-10">
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
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

          <div className="px-4 py-6 sm:px-6 lg:px-8 xl:px-10">
            <div id="dashboard-section" className="mb-10 scroll-mt-4 lg:scroll-mt-8">
              <div className="relative overflow-hidden rounded-[2rem] border border-white/80 bg-white/75 p-8 shadow-[0_24px_50px_-30px_rgba(2,6,23,0.55)] backdrop-blur-sm lg:p-10">
                <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-cyan-300/20 blur-3xl" />
                <div className="absolute -bottom-16 -left-16 h-32 w-32 rounded-full bg-orange-300/20 blur-3xl" />

                <div className="relative">
                  <div className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                    <div className="flex-1">
                      <p className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] ${
                        isDarkTheme
                          ? "border border-cyan-400/30 bg-cyan-500/10 text-cyan-200"
                          : "border border-cyan-200 bg-cyan-50 text-cyan-700"
                      }`}>
                        <span className="text-[10px]">●</span>
                        Intelligent Transaction Analysis
                      </p>
                      <h1
                        className={`mt-4 bg-clip-text text-4xl font-black leading-tight text-transparent sm:text-5xl ${
                          isDarkTheme
                            ? "bg-gradient-to-r from-cyan-100 via-sky-100 to-emerald-100"
                            : "bg-gradient-to-r from-slate-900 via-cyan-900 to-orange-900"
                        }`}
                      >
                        FinData Intelligence Analytics
                      </h1>
                      <p className={`mt-1 text-sm font-medium ${isDarkTheme ? "text-cyan-200/85" : "text-cyan-800/85"}`}>
                        AI-first financial intelligence workspace
                      </p>
                      <p className={`mt-3 max-w-2xl text-lg leading-relaxed ${isDarkTheme ? "text-slate-200" : "text-slate-700"}`}>
                        Welcome back, <span className="font-semibold text-cyan-700">{firstName}</span>. Your personal AI-powered expense categorization system.
                      </p>
                      <p className={`mt-2 text-sm ${isDarkTheme ? "text-slate-300" : "text-slate-600"}`}>
                        Upload your transaction CSV, and watch as our machine learning model automatically categorizes your spending patterns.
                      </p>
                    </div>

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

            <div className="mb-6">
              <SummaryCards summary={analytics} transactions={transactions} loading={!analytics} />
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
              <div className="rounded-3xl border border-white/80 bg-gradient-to-br from-white via-cyan-50/30 to-emerald-50/30 p-6 shadow-[0_16px_34px_-22px_rgba(15,23,42,0.45)] transition-shadow hover:shadow-[0_20px_38px_-20px_rgba(15,23,42,0.5)]">
                <div className="mb-4 flex items-center gap-3">
                  <div className="rounded-full bg-sky-100 p-2">
                    <Activity className="h-5 w-5 text-sky-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Privacy & Ethics</h2>
                    <p className="text-xs uppercase tracking-wider text-slate-500">Trust Layer</p>
                  </div>
                </div>

                <p className="text-sm leading-6 text-slate-700">
                  {analytics?.privacy_note ??
                    "Your data stays private. All processing happens locally with zero external sharing. Sensitive values should be minimized before analytics exports."}
                </p>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200/80 bg-white/70 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">Processing</p>
                    <p className="mt-1 text-sm font-semibold text-slate-800">Local-first</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200/80 bg-white/70 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">Data Scope</p>
                    <p className="mt-1 text-sm font-semibold text-slate-800">Transaction text only</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200/80 bg-white/70 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">Governance</p>
                    <p className="mt-1 text-sm font-semibold text-slate-800">User-controlled</p>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-white/80 bg-white/85 p-6 shadow-[0_16px_34px_-22px_rgba(15,23,42,0.45)] transition-shadow hover:shadow-[0_20px_38px_-20px_rgba(15,23,42,0.5)]">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">Live Controls</p>
                <h3 className="mt-2 text-lg font-bold text-slate-900">Privacy Control Status</h3>

                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex items-center justify-between rounded-xl border border-cyan-200/70 bg-cyan-50/60 px-3 py-2">
                    <span className="text-slate-700">Anonymize Descriptions</span>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${privacyControls?.anonymize_descriptions ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-700"}`}>
                      {privacyControls?.anonymize_descriptions ? "ON" : "OFF"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-cyan-200/70 bg-cyan-50/60 px-3 py-2">
                    <span className="text-slate-700">Persist Uploaded Rows</span>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${privacyControls?.persist_uploaded_rows ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-700"}`}>
                      {privacyControls?.persist_uploaded_rows ? "ON" : "OFF"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-cyan-200/70 bg-cyan-50/60 px-3 py-2">
                    <span className="text-slate-700">Retain Job History</span>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${privacyControls?.retain_job_history ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-700"}`}>
                      {privacyControls?.retain_job_history ? "ON" : "OFF"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {activeSection === "analytics-section" && (
        <div id="analytics-section" className="px-4 py-6 sm:px-6 lg:px-8 xl:px-10 scroll-mt-4 lg:scroll-mt-8">
          <div className="mb-6 rounded-3xl border border-white/80 bg-white/80 p-5 shadow-[0_16px_34px_-22px_rgba(15,23,42,0.45)]">
            <h2 className="text-2xl font-bold text-slate-900">
              {activePanel === "predictions" && "Predictions"}
              {activePanel === "ai-chat" && "AI Chat"}
              {activePanel === "expenses" && "Expenses"}
              {(activePanel === "analytics" || activePanel === "dashboard" || activePanel === "upload") && "Analytics"}
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              {activePanel === "predictions" && "Run single-transaction ML predictions."}
              {activePanel === "ai-chat" && "Ask assistant questions about your spending behavior."}
              {activePanel === "expenses" && "Inspect uploaded rows and transaction history."}
              {(activePanel === "analytics" || activePanel === "dashboard" || activePanel === "upload") && "Explore category trends and savings opportunities."}
            </p>
          </div>

          {(activePanel === "analytics" || activePanel === "dashboard" || activePanel === "upload") && (
            <div className="mb-8 grid gap-6 xl:grid-cols-[1.35fr_0.85fr]">
              <div className="self-start">
                <ExpenseChart
                  categoryTotals={analytics?.category_totals}
                  loading={!analytics}
                />
              </div>

              <div className="space-y-6">
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
          )}

          {activePanel === "predictions" && (
            <div className="mb-8 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
              <Predict apiBase={apiBase} />
              <div className="rounded-3xl border border-white/80 bg-white/85 p-6 shadow-[0_16px_34px_-22px_rgba(15,23,42,0.45)]">
                <h3 className="text-lg font-bold text-slate-900">Model Context</h3>
                <p className="mt-2 text-sm text-slate-600">Use this section for instant category prediction by transaction text.</p>
                {modelEvaluation && (
                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-lg bg-slate-100 px-3 py-2 text-slate-700">
                      Accuracy: {(Number(modelEvaluation.accuracy || 0) * 100).toFixed(1)}%
                    </div>
                    <div className="rounded-lg bg-slate-100 px-3 py-2 text-slate-700">
                      F1 Macro: {(Number(modelEvaluation.f1_macro || 0) * 100).toFixed(1)}%
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activePanel === "ai-chat" && (
            <div className="mb-8 max-w-3xl">
              <AIChat apiBase={apiBase} analytics={analytics} />
            </div>
          )}

          {activePanel === "expenses" && (
            <div className="mb-8">
              <Transactions transactions={transactions} isProcessing={isDataProcessing} />
            </div>
          )}
        </div>
      )}

      {activeSection === "upload-section" && (
        <div id="upload-section" className="px-4 py-6 sm:px-6 lg:px-8 xl:px-10 scroll-mt-4 lg:scroll-mt-8">
          <div className="mb-6 rounded-3xl border border-white/80 bg-white/80 p-5 shadow-[0_16px_34px_-22px_rgba(15,23,42,0.45)]">
            <h2 className="text-2xl font-bold text-slate-900">Upload New Data</h2>
            <p className="mt-1 text-sm text-slate-600">Upload a new CSV dataset and refresh analytics, predictions, and model behavior.</p>
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

          <div className="mt-2 w-full">
            <Upload
              apiBase={apiBase}
              onUploadComplete={handleUploadComplete}
              onProcessingChange={setIsDataProcessing}
              theme={isDarkTheme ? "dark" : "light"}
            />
          </div>
        </div>
      )}
    </div>
  );
}