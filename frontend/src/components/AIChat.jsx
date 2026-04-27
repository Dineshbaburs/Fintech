import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { Send } from "lucide-react";

const BOT_NAME = "Leo";

const DEFAULT_MESSAGES = [
  {
    id: 1,
    role: "assistant",
    content:
      `Hi, I am ${BOT_NAME}, your FinData Intelligence assistant. Ask me about spending trends, budgeting, and savings insights.`,
  },
];

const FIRST_TIME_MESSAGES = [
  {
    id: 1,
    role: "assistant",
    content:
      `Welcome to FinData. I am ${BOT_NAME}, your AI finance co-pilot. I can explain spending trends, forecast categories, and guide your next steps.`,
  },
];

const DEFAULT_SUGGESTIONS = [
  "what is my top spending category?",
  "show my monthly spending trend",
  "how can I reduce food expenses?",
  "give me a budget plan for next month",
];

const FINANCE_HINTS = [
  "spend",
  "spending",
  "budget",
  "expense",
  "expenses",
  "saving",
  "savings",
  "category",
  "categories",
  "forecast",
  "transaction",
  "transactions",
  "income",
  "cashflow",
  "monthly",
  "anomaly",
  "goal",
  "goals",
  "balance",
  "predict",
];

const NON_FINANCE_HINTS = [
  "backend",
  "server",
  "api",
  "uptime",
  "websocket",
  "health",
  "http",
  "port",
  "status",
  "deployment",
];

const CHAT_STORAGE_PREFIX = "fintech:chat:";
const CHAT_SEEN_PREFIX = "fintech:chat:seen:";

function isFinanceSuggestion(text) {
  const normalized = String(text || "").trim().toLowerCase();
  if (!normalized) {
    return false;
  }

  if (NON_FINANCE_HINTS.some((keyword) => normalized.includes(keyword))) {
    return false;
  }

  return FINANCE_HINTS.some((keyword) => normalized.includes(keyword));
}

function normalizeSuggestions(items) {
  const cleaned = Array.isArray(items)
    ? items.filter((item) => typeof item === "string" && item.trim()).map((item) => item.trim())
    : [];

  const financeOnly = cleaned.filter(isFinanceSuggestion);
  return (financeOnly.length > 0 ? financeOnly : DEFAULT_SUGGESTIONS).slice(0, 4);
}

export default function AIChat({ apiBase, analytics = null, activeUser = "", theme = "light", resetSignal = 0 }) {
  const isDarkTheme = theme === "dark";
  const storageKey = useMemo(
    () => `${CHAT_STORAGE_PREFIX}${String(activeUser || "guest").toLowerCase()}`,
    [activeUser]
  );
  const seenKey = useMemo(
    () => `${CHAT_SEEN_PREFIX}${String(activeUser || "guest").toLowerCase()}`,
    [activeUser]
  );
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState(DEFAULT_MESSAGES);
  const [suggestions, setSuggestions] = useState(DEFAULT_SUGGESTIONS);
  const [loading, setLoading] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const messagesContainerRef = useRef(null);
  const hasUserMessages = messages.some((message) => message.role === "user");

  useEffect(() => {
    setIsHydrated(false);

    try {
      const hasSeenChat = localStorage.getItem(seenKey) === "true";
      const stored = localStorage.getItem(storageKey);
      if (!stored) {
        if (hasSeenChat) {
          setMessages(DEFAULT_MESSAGES);
        } else {
          setMessages(FIRST_TIME_MESSAGES);
          localStorage.setItem(seenKey, "true");
        }
        setSuggestions(DEFAULT_SUGGESTIONS);
        setIsHydrated(true);
        return;
      }

      const parsed = JSON.parse(stored);
      const restoredMessages = Array.isArray(parsed?.messages)
        ? parsed.messages.filter((item) => item && typeof item.content === "string" && typeof item.role === "string")
        : [];
      const restoredSuggestions = normalizeSuggestions(parsed?.suggestions);

      setMessages(restoredMessages.length > 0 ? restoredMessages : DEFAULT_MESSAGES);
      setSuggestions(restoredSuggestions);
      setIsHydrated(true);
    } catch {
      setMessages(DEFAULT_MESSAGES);
      setSuggestions(DEFAULT_SUGGESTIONS);
      setIsHydrated(true);
    }
  }, [storageKey, seenKey]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          messages: messages.slice(-80),
          suggestions: suggestions.slice(0, 4),
        })
      );
    } catch {
      // Ignore browser storage failures and keep in-memory chat state.
    }
  }, [storageKey, messages, suggestions, isHydrated]);

  const sendMessage = async (overrideText) => {
    const text = (overrideText ?? input).trim();
    if (!text || loading) {
      return;
    }

    const userMessage = { id: Date.now(), role: "user", content: text };
    setMessages((previous) => [...previous, userMessage]);
    setInput("");
    setLoading(true);

    const requestHistory = [
      ...messages.slice(-7).map((messageItem) => ({
        role: messageItem.role,
        content: messageItem.content,
      })),
      { role: "user", content: text },
    ];

    try {
      const response = await axios.post(`${apiBase}/ai_chat`, {
        message: text,
        analytics,
        history: requestHistory,
      }, {
        timeout: 15000,
      });
      const reply = response?.data?.reply || "I could not generate a response.";
      const nextSuggestions = normalizeSuggestions(response?.data?.suggestions);

      setMessages((previous) => [
        ...previous,
        { id: Date.now() + 1, role: "assistant", content: reply },
      ]);

      setSuggestions(nextSuggestions);
    } catch (error) {
      const timeoutMessage = error?.code === "ECONNABORTED"
        ? "Chat request timed out. Please check backend and try again."
        : "Chat request failed. Verify backend is running and reachable at the configured API URL.";

      setMessages((previous) => [
        ...previous,
        {
          id: Date.now() + 1,
          role: "assistant",
          content: timeoutMessage,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const startNewChat = useCallback(() => {
    setInput("");
    setLoading(false);
    setSuggestions(DEFAULT_SUGGESTIONS);
    setMessages([
      {
        id: Date.now(),
        role: "assistant",
        content: `I am ${BOT_NAME}. What can I help with?`,
      },
    ]);

    try {
      localStorage.removeItem(storageKey);
      localStorage.setItem(seenKey, "true");
    } catch {
      // Ignore localStorage failures and keep session state in memory.
    }
  }, [seenKey, storageKey]);

  useEffect(() => {
    if (resetSignal > 0) {
      startNewChat();
    }
  }, [resetSignal, startNewChat]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) {
      return;
    }

    container.scrollTop = container.scrollHeight;
  }, [messages, loading]);

  return (
    <div
      className={`flex h-[460px] flex-col overflow-hidden rounded-2xl border p-3 ${
        isDarkTheme
          ? "border-cyan-500/20 bg-gradient-to-br from-slate-900/92 via-slate-900/84 to-cyan-950/30 shadow-[0_22px_46px_-30px_rgba(8,145,178,0.45)]"
          : "border-slate-200 bg-white shadow-slate-200/60"
      }`}
    >
      <div
        ref={messagesContainerRef}
        className={`flex-1 space-y-2 overflow-y-auto rounded-2xl px-2 py-1 ${
          isDarkTheme
            ? "bg-transparent"
            : "bg-slate-50/40"
        }`}
      >
        {messages.map((message) => (
          <div
            key={message.id}
            className={`max-w-[90%] rounded-xl px-3 py-2 text-sm ${
              message.role === "user"
                ? isDarkTheme
                  ? "ml-auto bg-gradient-to-r from-cyan-500 to-emerald-500 text-white"
                  : "ml-auto bg-emerald-500 text-white"
                : isDarkTheme
                  ? "bg-slate-900/70 text-slate-200"
                  : "bg-white text-slate-700 shadow-sm"
            }`}
          >
            {message.content}
          </div>
        ))}
        {loading && (
          <div
            className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${
              isDarkTheme
                ? "border-slate-700/70 bg-slate-900/70 text-slate-300"
                : "border-slate-200 bg-white text-slate-500"
            }`}
          >
            <span
              className={`h-3 w-3 animate-spin rounded-full border-2 ${
                isDarkTheme ? "border-cyan-300/30 border-t-cyan-300" : "border-slate-300 border-t-slate-600"
              }`}
            />
            Thinking...
          </div>
        )}
      </div>

      {!hasUserMessages && (
        <div className="mt-3 flex min-h-[70px] flex-wrap content-start gap-2">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              disabled={loading}
              onClick={() => sendMessage(suggestion)}
              className={`rounded-full px-3 py-1.5 text-xs transition disabled:cursor-not-allowed disabled:opacity-60 ${
                isDarkTheme
                  ? "bg-slate-800/85 text-slate-200 hover:bg-slate-700/90"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      <div className={`mt-3 flex items-center gap-2 rounded-full border px-3 py-2 ${isDarkTheme ? "border-slate-700/90 bg-slate-900/75" : "border-slate-300 bg-white"}`}>
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              sendMessage();
            }
          }}
          placeholder="Type a finance question"
          className={`w-full bg-transparent px-1 py-1.5 text-sm outline-none ${
            isDarkTheme ? "text-slate-100 placeholder:text-slate-500" : "text-slate-900 placeholder:text-slate-500"
          }`}
        />
        <button
          type="button"
          onClick={() => sendMessage()}
          disabled={loading}
          className={`flex h-10 w-10 items-center justify-center rounded-full text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${
            isDarkTheme
              ? "bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400"
              : "bg-sky-500 hover:bg-sky-400"
          }`}
          aria-label="Send message"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
