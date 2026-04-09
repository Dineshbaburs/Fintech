import { Home, BarChart2, Upload } from "lucide-react";

export default function Sidebar() {
  return (
    <div className="w-64 h-screen bg-[#1c1f26] p-5">
      <h1 className="text-2xl font-bold mb-8 text-green-400">
        SmartSpend 💰
      </h1>

      <ul className="space-y-4">
        <li className="flex items-center gap-2 hover:text-green-400 cursor-pointer">
          <Home size={18} /> Dashboard
        </li>
        <li className="flex items-center gap-2 hover:text-green-400 cursor-pointer">
          <BarChart2 size={18} /> Analytics
        </li>
        <li className="flex items-center gap-2 hover:text-green-400 cursor-pointer">
          <Upload size={18} /> Upload
        </li>
      </ul>
    </div>
  );
}