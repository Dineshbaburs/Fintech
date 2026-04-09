import { useState } from "react";
import axios from "axios";

function App() {
  const [desc, setDesc] = useState("");
  const [category, setCategory] = useState("");

  const predict = async () => {
    const res = await axios.post("http://127.0.0.1:8000/predict", {
      description: desc
    });
    setCategory(res.data.category);
  };

  return (
    <div style={{ padding: "40px" }}>
      <h1>SmartSpend AI 💰</h1>

      <input
        placeholder="Enter transaction"
        onChange={(e) => setDesc(e.target.value)}
      />

      <button onClick={predict}>Predict</button>

      <h2>Category: {category}</h2>
    </div>
  );
}

export default App;