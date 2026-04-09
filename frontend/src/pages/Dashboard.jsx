import SummaryCards from "../components/SummaryCards";
import ExpenseChart from "../components/ExpenseChart";
import Predict from "../components/Predict";
import Upload from "../components/Upload";

export default function Dashboard() {
  return (
    <div className="flex-1 p-6 w-full">
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>

      <div className="mb-6">
        <SummaryCards />
      </div>

      <div className="mb-6">
        <ExpenseChart />
      </div>

      <div className="mb-6">
        <Predict />
      </div>

      <Upload />
    </div>
  );
}