import { useState } from "react";
import axios from "axios";

export default function AIChat({ apiBase, analytics = null }) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: "assistant",
      content:
        "Hi, I am your FinData Intelligence assistant. Ask me for predictions, backend status, or savings insights.",
    },
  ]);
  const [suggestions, setSuggestions] = useState([
    "predict: uber ride to office",
    "show backend status",
    "what is my top spending category?",
    "show top 5 expenses",
  ]);
  const [loading, setLoading] = useState(false);

  const sendMessage = async (overrideText) => {
    const text = (overrideText ?? input).trim();
    if (!text || loading) {
      return;
    }

    const userMessage = { id: Date.now(), role: "user", content: text };
    setMessages((previous) => [...previous, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const response = await axios.post(`${apiBase}/ai_chat`, {
        message: text,
        analytics,
        history: messages.slice(-8).map((messageItem) => ({
          role: messageItem.role,
          content: messageItem.content,
        })),
      }, {
        timeout: 15000,
      });
      const reply = response?.data?.reply || "I could not generate a response.";
      const nextSuggestions = Array.isArray(response?.data?.suggestions)
        ? response.data.suggestions.filter((item) => typeof item === "string" && item.trim())
        : [];

      setMessages((previous) => [
        ...previous,
        { id: Date.now() + 1, role: "assistant", content: reply },
      ]);

      if (nextSuggestions.length > 0) {
        setSuggestions(nextSuggestions.slice(0, 4));
      }
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

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-lg shadow-slate-200/60">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">AI Assistant</h2>
        <span className="rounded-full border border-sky-300 bg-sky-50 px-3 py-1 text-xs uppercase tracking-[0.15em] text-sky-700">
          Live
        </span>
      </div>

      <div className="h-56 space-y-2 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-3">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`max-w-[90%] rounded-xl px-3 py-2 text-sm ${
              message.role === "user"
                ? "ml-auto bg-emerald-500 text-white"
                : "bg-white text-slate-700 border border-slate-200"
            }`}
          >
            {message.content}
          </div>
        ))}
        {loading && (
          <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500">
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
            Thinking...
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            disabled={loading}
            onClick={() => sendMessage(suggestion)}
            className="rounded-full border border-slate-300 bg-slate-100 px-3 py-1.5 text-xs text-slate-700 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {suggestion}
          </button>
        ))}
      </div>

      <div className="mt-3 flex gap-2">
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              sendMessage();
            }
          }}
          placeholder="Ask: predict: amazon order"
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-sky-400"
        />
        <button
          type="button"
          onClick={() => sendMessage()}
          disabled={loading}
          className="rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Send
        </button>
      </div>
    </div>
  );
}
