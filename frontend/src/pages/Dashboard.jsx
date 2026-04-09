import SummaryCards from "../components/SummaryCards";
import ExpenseChart from "../components/ExpenseChart";
import Predict from "../components/Predict";
import Upload from "../components/Upload";

export default function Dashboard() {
  return (
    <div className="flex-1 p-6 w-full">
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>

      <SummaryCards />
      <ExpenseChart />
      <Predict />
      <Upload /> {/* 🔥 MAIN FEATURE */}
    </div>
  );
}