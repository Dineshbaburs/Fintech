export default function SummaryCards() {
  const data = [
    { title: "Total Spend", value: "₹12,000" },
    { title: "Food", value: "₹4,000" },
    { title: "Transport", value: "₹2,000" },
  ];

  return (
    <div className="grid grid-cols-3 gap-4 mb-6">
      {data.map((item, i) => (
        <div
          key={i}
          className="bg-[#1c1f26] p-6 rounded-2xl border border-gray-800 shadow-lg"
        >
          <h3 className="text-gray-400">{item.title}</h3>
          <p className="text-2xl font-bold text-green-400">
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}