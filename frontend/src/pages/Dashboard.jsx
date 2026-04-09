import SummaryCards from "../components/SummaryCards";
import ExpenseChart from "../components/ExpenseChart";
import Predict from "../components/Predict";
import Upload from "../components/Upload";
import Transactions from "../components/Transactions";
import { useState } from "react";

export default function Dashboard() {
  const apiBase = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
  const [analytics, setAnalytics] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [isDataProcessing, setIsDataProcessing] = useState(false);

  const handleUploadComplete = (payload) => {
    setAnalytics(payload.analytics ?? payload);
    setTransactions(payload.rows ?? []);
  };

  const tips = analytics?.savings_tips ?? [];
  const advancedFeatures = analytics?.advanced_features ?? [];

  return (
    <div className="flex-1 w-full px-4 py-6 sm:px-6 lg:px-8 xl:px-10">
      <div id="dashboard-section" className="mb-8 rounded-[28px] border border-white/10 bg-[linear-gradient(135deg,rgba(12,16,24,0.96),rgba(24,29,40,0.9))] p-6 shadow-2xl shadow-black/30 backdrop-blur scroll-mt-4 lg:scroll-mt-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-emerald-300/70">
              Intelligent Expense Categorization
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-white sm:text-4xl">
              SmartSpend analytics for your uploaded transaction data
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
              Upload your own CSV to classify transactions, filter categories,
              sort by amount, and review savings tips without relying on any
              preset sample dataset.
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
            <div className="font-medium">Model accuracy</div>
            <div className="text-2xl font-semibold">
              {analytics ? "Live" : "Upload required"}
            </div>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <SummaryCards summary={analytics} loading={!analytics} />
      </div>

      {isDataProcessing && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-sm text-amber-100">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-amber-200/30 border-t-amber-100" />
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

          <div className="rounded-3xl border border-white/10 bg-[#1c1f26] p-5 shadow-lg shadow-black/20">
            <h2 className="text-lg font-semibold text-white">Savings tips</h2>
            <p className="mt-1 text-sm text-slate-400">
              Suggestions are derived from the uploaded file&apos;s spending mix.
            </p>

            <div className="mt-4 space-y-3">
              {tips.length > 0 ? (
                tips.map((tip) => (
                  <div
                    key={tip}
                    className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200"
                  >
                    {tip}
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-sm text-slate-400">
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

          <div className="rounded-3xl border border-white/10 bg-[#1c1f26] p-5 shadow-lg shadow-black/20">
            <h2 className="text-lg font-semibold text-white">Ethics and privacy</h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              {analytics?.privacy_note ??
                "Keep transaction processing local, minimize shared raw descriptors, and strip personally identifiable information before any model training or reporting."}
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              {advancedFeatures.map((feature) => (
                <span
                  key={feature}
                  className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-100"
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