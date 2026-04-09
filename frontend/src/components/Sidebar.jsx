import { Home, BarChart2, Upload } from "lucide-react";

export default function Sidebar() {
  return (
    <div className="flex w-full flex-col border-b border-white/10 bg-[#1c1f26] p-5 lg:h-screen lg:w-72 lg:border-b-0 lg:border-r">
      <h1 className="mb-8 text-2xl font-bold text-emerald-300">
        SmartSpend 💰
      </h1>

      <ul className="space-y-4 text-sm text-slate-300">
        <li className="flex cursor-pointer items-center gap-2 rounded-2xl px-3 py-2 transition hover:bg-white/5 hover:text-emerald-300">
          <Home size={18} /> Dashboard
        </li>
        <li className="flex cursor-pointer items-center gap-2 rounded-2xl px-3 py-2 transition hover:bg-white/5 hover:text-emerald-300">
          <BarChart2 size={18} /> Analytics
        </li>
        <li className="flex cursor-pointer items-center gap-2 rounded-2xl px-3 py-2 transition hover:bg-white/5 hover:text-emerald-300">
          <Upload size={18} /> Upload
        </li>
      </ul>

      <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
        Hybrid text classification with local rule fallbacks for noisy merchants.
      </div>
    </div>
  );
}