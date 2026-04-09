export default function Transactions() {
  const data = [
    { desc: "Swiggy", amt: 250, cat: "Food" },
    { desc: "Uber", amt: 500, cat: "Transport" },
  ];

  return (
    <div className="bg-[#1c1f26] p-5 rounded-2xl">
      <h2 className="mb-4">Transactions</h2>

      {data.map((t, i) => (
        <div key={i} className="flex justify-between border-b py-2">
          <span>{t.desc}</span>
          <span>{t.cat}</span>
          <span>₹{t.amt}</span>
        </div>
      ))}
    </div>
  );
}