import { Home, BarChart2, Upload } from "lucide-react";

export default function Sidebar() {
  const navItems = [
    { label: "Dashboard", icon: Home, target: "dashboard-section" },
    { label: "Analytics", icon: BarChart2, target: "analytics-section" },
    { label: "Upload", icon: Upload, target: "upload-section" },
  ];

  return (
    <div className="flex w-full flex-col border-b border-white/10 bg-[#1c1f26] p-5 lg:h-screen lg:w-72 lg:border-b-0 lg:border-r">
      <h1 className="mb-8 text-2xl font-bold text-emerald-300">
        FinData Intelligence
      </h1>

      <ul className="space-y-4 text-sm text-slate-300">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.target}>
              <a
                href={`#${item.target}`}
                className="flex items-center gap-2 rounded-2xl px-3 py-2 transition hover:bg-white/5 hover:text-emerald-300"
              >
                <Icon size={18} /> {item.label}
              </a>
            </li>
          );
        })}
      </ul>

      <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
        Hybrid text classification with local rule fallbacks for noisy merchants.
      </div>
    </div>
  );
}