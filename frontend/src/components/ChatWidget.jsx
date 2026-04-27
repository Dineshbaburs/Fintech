import { MessageCircle, X } from "lucide-react";
import { useState } from "react";
import AIChat from "./AIChat";

export default function ChatWidget({ apiBase, analytics = null, activeUser = "", theme = "light" }) {
  const [isOpen, setIsOpen] = useState(false);
  const [resetSignal, setResetSignal] = useState(0);
  const isDarkTheme = theme === "dark";

  return (
    <div className="fixed bottom-5 right-5 z-[90]">
      {isOpen && (
        <div
          className={`mb-4 w-[min(92vw,400px)] overflow-hidden rounded-[1.6rem] border shadow-[0_28px_60px_-30px_rgba(15,23,42,0.8)] backdrop-blur-sm ${
            isDarkTheme
              ? "border-slate-700/90 bg-slate-900/95"
              : "border-slate-200 bg-white/95"
          }`}
        >
          <div className="flex items-center justify-between bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 px-4 py-3.5 text-white">
            <div>
              <p className="text-base font-bold">Leo</p>
              <p className="text-xs text-cyan-100">Your AI finance assistant</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setResetSignal((previous) => previous + 1)}
                className="rounded-full border border-white/45 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/20"
              >
                New Chat
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1.5 text-white/90 transition hover:bg-white/15 hover:text-white"
                aria-label="Close chat"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className={`p-3 ${isDarkTheme ? "bg-slate-900/95" : "bg-slate-50/70"}`}>
            <AIChat
              apiBase={apiBase}
              analytics={analytics}
              activeUser={activeUser}
              theme={theme}
              resetSignal={resetSignal}
            />
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setIsOpen((previous) => !previous)}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 via-blue-600 to-indigo-700 text-white shadow-[0_22px_42px_-20px_rgba(37,99,235,0.95)] transition-transform hover:scale-105"
        aria-label={isOpen ? "Hide chat" : "Open chat"}
      >
        {isOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>
    </div>
  );
}