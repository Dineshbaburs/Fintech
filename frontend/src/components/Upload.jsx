import axios from "axios";
import { useState } from "react";

export default function Upload() {
  const [file, setFile] = useState(null);
  const [data, setData] = useState([]);

  const uploadFile = async () => {
    const formData = new FormData();
    formData.append("file", file);

    const res = await axios.post(
      "http://127.0.0.1:8000/bulk_predict",
      formData
    );

    setData(res.data);
  };

  return (
    <div className="bg-[#1c1f26] p-5 rounded-2xl">
      <h2 className="mb-4">Upload CSV</h2>

      <input type="file" onChange={(e) => setFile(e.target.files[0])} />

      <button
        className="bg-blue-500 px-4 py-2 ml-3 rounded"
        onClick={uploadFile}
      >
        Upload
      </button>

      <div className="mt-4">
        {data.slice(0, 5).map((row, i) => (
          <div key={i} className="flex justify-between border-b py-2">
            <span>{row.description}</span>
            <span>{row.predicted}</span>
          </div>
        ))}
      </div>
    </div>
  );
}