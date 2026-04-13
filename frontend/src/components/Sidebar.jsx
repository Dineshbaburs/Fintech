import { Home, BarChart2, Upload, MessageSquare, Zap, Settings, TrendingUp, PieChart, Send, LogOut, Menu, X } from "lucide-react";
import { useState } from "react";

export default function Sidebar({ activeUser, onLogout, theme = "light" }) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

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
        { label: "AI Chat", icon: MessageSquare, target: "analytics-section", color: "text-pink-600" },
        { label: "Expenses", icon: PieChart, target: "analytics-section", color: "text-orange-600" },
      ],
    },
  ];

  const closeMobile = () => setIsMobileOpen(false);

  const SidebarContent = () => (
    <>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <div className="rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 p-2">
            <Zap className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-teal-700 to-emerald-600 bg-clip-text text-transparent">
              FinData Intelligence
            </h1>
            <p className="text-xs text-slate-500">Intelligence Platform</p>
          </div>
        </div>
      </div>

      {/* Navigation Groups */}
      <div className="flex-1 space-y-6 overflow-y-auto">
        {navigationGroups.map((group) => (
          <div key={group.label}>
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">
              {group.label}
            </p>
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
                      className="group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 transition-all hover:bg-gradient-to-r hover:from-slate-100 hover:to-transparent hover:text-slate-900"
                    >
                      <Icon className={`h-5 w-5 transition-transform group-hover:scale-110 ${item.color}`} />
                      <span className="flex-1">{item.label}</span>
                      <div className="h-1 w-1 rounded-full bg-slate-300 opacity-0 transition-opacity group-hover:opacity-100" />
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      {/* Quick Stats */}
      <div className="mb-6 rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100/50 p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-600">
          Quick Stats
        </p>
        <div className="space-y-2">
          <div className="flex items-center justify-between rounded-lg bg-white px-3 py-2">
            <span className="text-xs text-slate-600">Model Status</span>
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <div className="flex items-center justify-between rounded-lg bg-white px-3 py-2">
            <span className="text-xs text-slate-600">Data Sync</span>
            <span className="text-xs font-semibold text-slate-700">Active</span>
          </div>
        </div>
      </div>

      {/* User Profile Card */}
      <div className="mb-4 rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4 shadow-sm">
        <p className="mb-2 text-xs uppercase tracking-widest font-semibold text-teal-700">
          Account
        </p>
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-teal-400 to-emerald-500">
            <span className="text-sm font-bold text-white">
              {activeUser?.charAt(0).toUpperCase() || "U"}
            </span>
          </div>
          <div>
            <p className="truncate text-sm font-semibold text-slate-900">
              {activeUser?.split("@")[0] || "User"}
            </p>
            <p className="truncate text-xs text-slate-500">{activeUser}</p>
          </div>
        </div>

        <div className="space-y-2">
          <a
            href="#settings-section"
            onClick={(event) => {
              event.preventDefault();
              navigateTo("settings-section");
            }}
            className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-700 transition hover:bg-slate-200"
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
            className="w-full flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 transition hover:bg-rose-100"
          >
            <LogOut className="h-4 w-4" />
            Log out
          </button>
        </div>
      </div>

      {/* Footer Info */}
      <div className="border-t border-slate-200 pt-4">
        <p className="text-xs leading-relaxed text-slate-600">
          🔒 <span className="font-semibold">100% Private.</span> All transaction processing happens locally. Your data never leaves your device.
        </p>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className={`sidebar-shell sticky top-0 hidden h-screen w-72 shrink-0 flex-col p-5 shadow-lg backdrop-blur lg:flex ${theme === "dark" ? "border-r border-slate-700/80 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800/70" : "border-r border-slate-200/80 bg-gradient-to-b from-white via-white to-slate-50/30"}`}>
        <SidebarContent />
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
        <SidebarContent />
      </div>
    </>
  );
}