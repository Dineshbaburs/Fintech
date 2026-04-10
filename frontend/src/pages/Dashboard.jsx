import SummaryCards from "../components/SummaryCards";
import ExpenseChart from "../components/ExpenseChart";
import Predict from "../components/Predict";
import Upload from "../components/Upload";
import Transactions from "../components/Transactions";
import { useEffect, useState } from "react";

export default function Dashboard({ activeUser = "" }) {
  const apiBase = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
  const [analytics, setAnalytics] = useState(null);
  const [transactions, setTransactions] = useState([]);
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
    const wsBase = apiBase.startsWith("https")
      ? apiBase.replace("https://", "wss://")
      : apiBase.replace("http://", "ws://");

    let socket;
    try {
      socket = new WebSocket(`${wsBase}/ws/realtime`);
    } catch {
      setServerStatus((previous) => ({ ...previous, connected: false }));
      return undefined;
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
    };

    socket.onerror = () => {
      setServerStatus((previous) => ({ ...previous, connected: false }));
    };

    return () => {
      socket.close();
    };
  }, [apiBase]);

  const tips = analytics?.savings_tips ?? [];
  const advancedFeatures = analytics?.advanced_features ?? [];

  return (
    <div className="flex-1 w-full px-4 py-6 sm:px-6 lg:px-8 xl:px-10">
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/50">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Backend status</p>
          <p className={`mt-2 text-xl font-semibold ${serverStatus.connected ? "text-emerald-700" : "text-rose-700"}`}>
            {serverStatus.connected ? "Connected" : "Disconnected"}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/50">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Active jobs</p>
          <p className="mt-2 text-xl font-semibold text-slate-900">{serverStatus.active_jobs}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/50">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Live accuracy</p>
          <p className="mt-2 text-xl font-semibold text-slate-900">
            {typeof serverStatus.accuracy === "number"
              ? `${(serverStatus.accuracy * 100).toFixed(1)}%`
              : "N/A"}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/50">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Last update</p>
          <p className="mt-2 text-sm font-medium text-slate-700">
            {serverStatus.server_time
              ? new Date(serverStatus.server_time).toLocaleTimeString()
              : "Waiting..."}
          </p>
          <p className="mt-1 text-xs text-slate-500">Training rows: {serverStatus.transactions}</p>
        </div>
      </div>

      <div id="dashboard-section" className="mb-8 rounded-[28px] border border-slate-200 bg-[linear-gradient(135deg,#f8fdff,#edf8ff)] p-6 shadow-lg shadow-slate-300/30 backdrop-blur scroll-mt-4 lg:scroll-mt-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-teal-700/70">
              Intelligent Expense Categorization
            </p>
            <p className="mt-3 text-sm text-slate-600">Welcome back, {firstName}.</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900 sm:text-4xl">
              SmartSpend analytics for your uploaded transaction data
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              Upload your own CSV to classify transactions, filter categories,
              sort by amount, and review savings tips without relying on any
              preset sample dataset.
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-300/50 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <div className="font-medium">Model accuracy</div>
            <div className="text-2xl font-semibold">
              {analytics ? "Live" : "Upload required"}
            </div>
            <button
              type="button"
              onClick={clearWorkspace}
              className="mt-3 rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs uppercase tracking-[0.2em] text-emerald-700 transition hover:bg-emerald-100"
            >
              Reset workspace
            </button>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <SummaryCards summary={analytics} transactions={transactions} loading={!analytics} />
      </div>

      {isDataProcessing && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-amber-300/60 border-t-amber-700" />
          Processing uploaded data. Please wait...
        </div>
      )}

      <div id="analytics-section" className="grid gap-6 xl:grid-cols-[1.35fr_0.85fr] scroll-mt-4 lg:scroll-mt-8">
        <ExpenseChart
          categoryTotals={analytics?.category_totals}
          loading={!analytics}
        />

        <div className="space-y-6">
          <Predict apiBase={apiBase} />

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-lg shadow-slate-200/60">
            <h2 className="text-lg font-semibold text-slate-900">Savings tips</h2>
            <p className="mt-1 text-sm text-slate-500">
              Suggestions are derived from the uploaded file&apos;s spending mix.
            </p>

            <div className="mt-4 space-y-3">
              {tips.length > 0 ? (
                tips.map((tip) => (
                  <div
                    key={tip}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700"
                  >
                    {tip}
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500">
                  Upload a CSV to see savings tips.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <Transactions transactions={transactions} isProcessing={isDataProcessing} />

        <div className="space-y-6">
          <div id="upload-section" className="scroll-mt-4 lg:scroll-mt-8">
            <Upload
              apiBase={apiBase}
              onUploadComplete={handleUploadComplete}
              onProcessingChange={setIsDataProcessing}
            />
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-lg shadow-slate-200/60">
            <h2 className="text-lg font-semibold text-slate-900">Ethics and privacy</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              {analytics?.privacy_note ??
                "Keep transaction processing local, minimize shared raw descriptors, and strip personally identifiable information before any model training or reporting."}
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              {advancedFeatures.map((feature) => (
                <span
                  key={feature}
                  className="rounded-full border border-emerald-300/70 bg-emerald-50 px-3 py-1 text-xs text-emerald-700"
                >
                  {feature}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}