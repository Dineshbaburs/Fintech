import {
  Home,
  BarChart2,
  Upload,
  Zap,
  Settings,
  TrendingUp,
  PieChart,
  LogOut,
  Menu,
  X,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { useState } from "react";

export default function Sidebar({
  activeUser,
  onLogout,
  theme = "light",
  isCollapsed = false,
  onToggleCollapse = () => {},
}) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const isDark = theme === "dark";

  const navigateTo = (target) => {
    const element = document.getElementById(target);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    closeMobile();
  };

  const navigationGroups = [
    {
      label: "Main",
      items: [
        { label: "Dashboard", icon: Home, target: "dashboard-section", color: "text-teal-600" },
        { label: "Analytics", icon: BarChart2, target: "analytics-section", color: "text-blue-600" },
        { label: "Predictions", icon: TrendingUp, target: "analytics-section", color: "text-emerald-600" },
      ],
    },
    {
      label: "Tools",
      items: [
        { label: "Upload New Data", icon: Upload, target: "upload-section", color: "text-purple-600" },
        { label: "Expenses", icon: PieChart, target: "analytics-section", color: "text-orange-600" },
      ],
    },
  ];

  const closeMobile = () => setIsMobileOpen(false);

  const SidebarContent = ({ compact = false }) => (
    <>
      {/* Header */}
      <div className={`${compact ? "mb-5" : "mb-8"}`}>
        <div className={`mb-4 flex items-center ${compact ? "justify-center" : "gap-2"}`}>
          <div className="rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 p-2">
            <Zap className="h-6 w-6 text-white" />
          </div>
          {!compact && (
            <div>
              <h1 className="bg-gradient-to-r from-teal-700 to-emerald-600 bg-clip-text text-xl font-bold text-transparent">
                FinData Intelligence
              </h1>
              <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>Intelligence Platform</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Groups */}
      <div className={`flex-1 overflow-y-auto ${compact ? "space-y-4" : "space-y-6"}`}>
        {navigationGroups.map((group) => (
          <div key={group.label}>
            {!compact && (
              <p className={`mb-3 text-xs font-semibold uppercase tracking-widest ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                {group.label}
              </p>
            )}
            <ul className="space-y-2">
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={`${group.label}-${item.label}`}>
                    <a
                      href={`#${item.target}`}
                      onClick={(event) => {
                        event.preventDefault();
                        navigateTo(item.target);
                      }}
                      title={compact ? item.label : undefined}
                      className={`group flex items-center rounded-xl text-sm font-medium transition-all ${
                        compact ? "justify-center px-3 py-3" : "gap-3 px-4 py-3"
                      } ${isDark ? "text-slate-200 hover:bg-slate-800/70 hover:text-white" : "text-slate-700 hover:bg-gradient-to-r hover:from-slate-100 hover:to-transparent hover:text-slate-900"}`}
                    >
                      <Icon className={`h-5 w-5 transition-transform group-hover:scale-110 ${item.color}`} />
                      {!compact && <span className="flex-1">{item.label}</span>}
                      {!compact && <div className={`h-1 w-1 rounded-full opacity-0 transition-opacity group-hover:opacity-100 ${isDark ? "bg-slate-500" : "bg-slate-300"}`} />}
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      {compact && (
        <div className={`mb-4 border-t pt-4 ${isDark ? "border-slate-700/80" : "border-slate-200"}`}>
          <div className="space-y-2">
            <a
              href="#settings-section"
              onClick={(event) => {
                event.preventDefault();
                navigateTo("settings-section");
              }}
              title="Settings"
              className={`flex items-center justify-center rounded-lg px-3 py-2 text-xs transition ${isDark ? "border border-slate-700/80 bg-slate-800/85 text-slate-200 hover:bg-slate-700/85" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
            >
              <Settings className="h-4 w-4" />
            </a>
            <button
              type="button"
              onClick={() => {
                closeMobile();
                onLogout();
              }}
              title="Log out"
              className={`flex w-full items-center justify-center rounded-lg px-3 py-2 text-xs font-medium transition ${isDark ? "border border-rose-900/60 bg-rose-950/50 text-rose-300 hover:bg-rose-900/45" : "bg-rose-50 text-rose-700 hover:bg-rose-100"}`}
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Quick Stats */}
      {!compact && (
        <div className={`mb-6 rounded-2xl border p-4 ${isDark ? "border-slate-700/80 bg-slate-900/70 shadow-[0_14px_30px_-24px_rgba(2,6,23,0.95)]" : "border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100/50"}`}>
        <p className={`mb-3 text-xs font-semibold uppercase tracking-widest ${isDark ? "text-slate-300" : "text-slate-600"}`}>
          Quick Stats
        </p>
        <div className="space-y-2">
          <div className={`flex items-center justify-between rounded-lg border px-3 py-2 ${isDark ? "border-slate-700/80 bg-slate-800/80" : "border-transparent bg-white"}`}>
            <span className={`text-xs ${isDark ? "text-slate-300" : "text-slate-600"}`}>Model Status</span>
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <div className={`flex items-center justify-between rounded-lg border px-3 py-2 ${isDark ? "border-slate-700/80 bg-slate-800/80" : "border-transparent bg-white"}`}>
            <span className={`text-xs ${isDark ? "text-slate-300" : "text-slate-600"}`}>Data Sync</span>
            <span className={`text-xs font-semibold ${isDark ? "text-emerald-300" : "text-slate-700"}`}>Active</span>
          </div>
        </div>
        </div>
      )}

      {/* User Profile Card */}
      {!compact && (
        <div className={`mb-4 rounded-2xl border p-4 shadow-sm ${isDark ? "border-slate-700/80 bg-slate-900/75 shadow-[0_14px_30px_-24px_rgba(2,6,23,0.95)]" : "border-slate-200 bg-gradient-to-br from-white to-slate-50"}`}>
        <p className={`mb-2 text-xs uppercase tracking-widest font-semibold ${isDark ? "text-teal-300" : "text-teal-700"}`}>
          Account
        </p>
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-teal-400 to-emerald-500">
            <span className="text-sm font-bold text-white">
              {activeUser?.charAt(0).toUpperCase() || "U"}
            </span>
          </div>
          <div>
            <p className={`truncate text-sm font-semibold ${isDark ? "text-slate-100" : "text-slate-900"}`}>
              {activeUser?.split("@")[0] || "User"}
            </p>
            <p className={`truncate text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>{activeUser}</p>
          </div>
        </div>

        <div className="space-y-2">
          <a
            href="#settings-section"
            onClick={(event) => {
              event.preventDefault();
              navigateTo("settings-section");
            }}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs transition ${isDark ? "border border-slate-700/80 bg-slate-800/85 text-slate-200 hover:bg-slate-700/85" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
          >
            <Settings className="h-4 w-4" />
            Settings
          </a>
          <button
            type="button"
            onClick={() => {
              closeMobile();
              onLogout();
            }}
            className={`w-full flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition ${isDark ? "border border-rose-900/60 bg-rose-950/50 text-rose-300 hover:bg-rose-900/45" : "bg-rose-50 text-rose-700 hover:bg-rose-100"}`}
          >
            <LogOut className="h-4 w-4" />
            Log out
          </button>
        </div>
        </div>
      )}

      {/* Footer Info */}
      {!compact && (
        <div className={`border-t pt-4 ${isDark ? "border-slate-700/80" : "border-slate-200"}`}>
        <p className={`text-xs leading-relaxed ${isDark ? "text-slate-300" : "text-slate-600"}`}>
          🔒 <span className="font-semibold">100% Private.</span> All transaction processing happens locally. Your data never leaves your device.
        </p>
        </div>
      )}
    </>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className={`sidebar-shell sticky top-0 hidden h-screen shrink-0 flex-col p-3 shadow-lg backdrop-blur transition-all duration-300 lg:flex ${isCollapsed ? "w-24" : "w-72"} ${theme === "dark" ? "border-r border-slate-700/80 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800/70" : "border-r border-slate-200/80 bg-gradient-to-b from-white via-white to-slate-50/30"}`}>
        <button
          type="button"
          onClick={onToggleCollapse}
          className={`mb-3 inline-flex h-9 w-9 items-center justify-center self-end rounded-lg border transition ${isDark ? "border-slate-700/80 bg-slate-800/85 text-slate-200 hover:bg-slate-700/85" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"}`}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>
        <SidebarContent compact={isCollapsed} />
      </aside>

      {/* Mobile Toggle Button */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="fixed bottom-6 right-6 z-50 flex lg:hidden h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-teal-600 to-emerald-600 text-white shadow-lg hover:shadow-xl transition-all"
      >
        {isMobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {/* Mobile Sidebar Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`sidebar-shell fixed left-0 top-0 z-40 flex h-screen w-72 flex-col p-5 shadow-lg backdrop-blur transition-transform duration-300 lg:hidden ${theme === "dark" ? "border-r border-slate-700/80 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800/70" : "border-r border-slate-200/80 bg-gradient-to-b from-white via-white to-slate-50/30"} ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <SidebarContent compact={false} />
      </div>
    </>
  );
}