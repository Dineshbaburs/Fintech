import { useState } from "react";
import axios from "axios";
console.log("Clicked");

export default function Predict() {
  const [desc, setDesc] = useState("");
  const [category, setCategory] = useState("");

  const fetchData = async () => {
    try {
      console.log("Clicked"); // debug

      const res = await axios.post("http://127.0.0.1:8000/predict", {
        description: desc,
      });

      setCategory(res.data.category);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="bg-[#1c1f26] p-5 rounded-2xl mb-6 border border-gray-800">
      <h2 className="mb-4 text-lg font-semibold">Try Prediction</h2>

      <input
        className="p-3 rounded-lg bg-[#0E1117] border border-gray-700 w-full mb-3"
        placeholder="Enter transaction..."
        onChange={(e) => setDesc(e.target.value)}
      />

      <button
        className="bg-green-500 px-5 py-2 rounded-lg hover:bg-green-600"
        onClick={fetchData}
      >
        Predict
      </button>

      <h3 className="mt-4 text-green-400">
        Category: {category}
      </h3>
    </div>
  );
}