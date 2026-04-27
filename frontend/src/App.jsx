import { useState } from "react";
import Sidebar from "./components/Sidebar";
import ChatWidget from "./components/ChatWidget";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import UploadOnboarding from "./pages/UploadOnboarding";

function App() {
  const THEME_KEY = "fintech:theme";
  const CHAT_STORAGE_PREFIX = "fintech:chat:";
  const SIDEBAR_COLLAPSED_KEY = "fintech:sidebar:collapsed";

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeUser, setActiveUser] = useState("");
  const [initialUploadDone, setInitialUploadDone] = useState(false);
  const [initialUploadPayload, setInitialUploadPayload] = useState(null);
  const [sharedAnalytics, setSharedAnalytics] = useState(null);
  const [theme, setTheme] = useState(() => {
    const stored = localStorage.getItem(THEME_KEY);
    return stored === "dark" ? "dark" : "light";
  });
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true";
  });
  const apiBase = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

  const handleThemeChange = (nextTheme) => {
    const normalizedTheme = nextTheme === "dark" ? "dark" : "light";
    setTheme(normalizedTheme);
    localStorage.setItem(THEME_KEY, normalizedTheme);
  };

  const handleSidebarCollapseChange = (nextValue) => {
    setIsSidebarCollapsed(nextValue);
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(nextValue));
  };

  const handleLogin = (email) => {
    const normalizedUser = String(email || "guest").toLowerCase();
    localStorage.removeItem(`${CHAT_STORAGE_PREFIX}${normalizedUser}`);
    setActiveUser(email);
    setIsAuthenticated(true);
    setInitialUploadDone(false);
    setInitialUploadPayload(null);
    setSharedAnalytics(null);
  };

  const handleLogout = () => {
    const normalizedUser = String(activeUser || "guest").toLowerCase();
    localStorage.removeItem(`${CHAT_STORAGE_PREFIX}${normalizedUser}`);
    setActiveUser("");
    setIsAuthenticated(false);
    setInitialUploadDone(false);
    setInitialUploadPayload(null);
  };

  const handleInitialUploadComplete = (payload) => {
    const safePayload = payload
      ? {
          ...payload,
          // Keep initial handoff small to avoid rendering stalls on large uploads.
          rows: Array.isArray(payload.rows) ? payload.rows.slice(0, 1000) : [],
        }
      : payload;

    setInitialUploadDone(true);
    setInitialUploadPayload(safePayload);
    setSharedAnalytics(safePayload?.analytics ?? safePayload ?? null);
  };

  const handleNavigate = (target) => {
    const element = document.getElementById(target);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const themeToggle = (
    <div className="fixed right-4 top-4 z-[80] flex items-center gap-1 rounded-2xl border border-slate-300/70 bg-white/90 p-1.5 shadow-[0_12px_24px_-16px_rgba(15,23,42,0.45)] backdrop-blur">
      <button
        type="button"
        onClick={() => handleThemeChange("light")}
        className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
          theme === "light"
            ? "bg-cyan-600 text-white"
            : "text-slate-600 hover:bg-slate-100"
        }`}
      >
        Light
      </button>
      <button
        type="button"
        onClick={() => handleThemeChange("dark")}
        className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
          theme === "dark"
            ? "bg-slate-900 text-white"
            : "text-slate-600 hover:bg-slate-100"
        }`}
      >
        Dark
      </button>
    </div>
  );

  let appContent = <Login onLogin={handleLogin} theme={theme} />;

  if (isAuthenticated && !initialUploadDone) {
    appContent = <UploadOnboarding onUploadComplete={handleInitialUploadComplete} theme={theme} />;
  }

  if (isAuthenticated && initialUploadDone) {
    appContent = (
      <div className="flex min-h-screen w-full flex-col overflow-hidden bg-transparent text-slate-900 lg:flex-row">
        <Sidebar
          activeUser={activeUser}
          onLogout={handleLogout}
          onNavigate={handleNavigate}
          theme={theme}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => handleSidebarCollapseChange(!isSidebarCollapsed)}
        />
        <Dashboard
          activeUser={activeUser}
          initialPayload={initialUploadPayload}
          theme={theme}
          onAnalyticsChange={setSharedAnalytics}
        />
      </div>
    );
  }

  const shouldShowChatWidget = isAuthenticated && initialUploadDone;

  return (
    <div className={`app-shell theme-${theme}`}>
      {themeToggle}
      {appContent}
      {shouldShowChatWidget && (
        <ChatWidget apiBase={apiBase} analytics={sharedAnalytics} activeUser={activeUser} theme={theme} />
      )}
    </div>
  );
}

export default App;