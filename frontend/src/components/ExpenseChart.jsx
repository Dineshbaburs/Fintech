import { PieChart, Pie, Cell } from "recharts";

const data = [
  { name: "Food", value: 4000 },
  { name: "Transport", value: 2000 },
  { name: "Shopping", value: 3000 },
];

const COLORS = ["#00C896", "#4CAF50", "#8884d8"];

export default function ExpenseChart() {
  return (
    <div className="bg-[#1c1f26] p-5 rounded-2xl mb-6 flex justify-center">
      <PieChart width={400} height={300}>
        <Pie data={data} dataKey="value" outerRadius={120}>
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i]} />
          ))}
        </Pie>
      </PieChart>
    </div>
  );
}