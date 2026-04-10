import { Home, BarChart2, Upload } from "lucide-react";

export default function Sidebar({ activeUser, onLogout }) {
  const navItems = [
    { label: "Dashboard", icon: Home, target: "dashboard-section" },
    { label: "Analytics", icon: BarChart2, target: "analytics-section" },
    { label: "Upload", icon: Upload, target: "upload-section" },
  ];

  return (
    <div className="flex w-full flex-col border-b border-slate-200/80 bg-white/75 p-5 shadow-sm backdrop-blur lg:h-screen lg:w-72 lg:border-b-0 lg:border-r">
      <h1 className="mb-8 text-2xl font-bold text-teal-700">
        FinData Intelligence
      </h1>

      <ul className="space-y-4 text-sm text-slate-600">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.target}>
              <a
                href={`#${item.target}`}
                className="flex items-center gap-2 rounded-2xl px-3 py-2 transition hover:bg-teal-50 hover:text-teal-700"
              >
                <Icon size={18} /> {item.label}
              </a>
            </li>
          );
        })}
      </ul>

      <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-600">
        <p className="mb-2 text-xs uppercase tracking-[0.2em] text-teal-700/80">
          Signed in
        </p>
        <p className="truncate text-sm font-medium text-slate-900">{activeUser || "User"}</p>

        <p className="mt-3 text-sm text-slate-600">
          Hybrid text classification with local rule fallbacks for noisy merchants.
        </p>

        <button
          type="button"
          onClick={onLogout}
          className="mt-4 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-100"
        >
          Log out
        </button>
      </div>
    </div>
  );
}