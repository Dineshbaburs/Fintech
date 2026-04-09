import axios from "axios";
import { useState } from "react";

export default function Upload() {
  const [file, setFile] = useState(null);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const uploadFile = async () => {
    if (!file) {
      alert("Please select a file first!");
      return;
    }

    try {
      setLoading(true);

      const formData = new FormData();
      formData.append("file", file);

      const res = await axios.post(
        "http://127.0.0.1:8000/bulk_predict",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      setData(res.data);
      console.log(res.data);
    } catch (err) {
      console.error("Upload error:", err);
      alert("Upload failed! Check backend.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#1c1f26] p-5 rounded-2xl border border-gray-800">
      <h2 className="mb-4 text-lg font-semibold">Upload CSV</h2>

      <input
        type="file"
        className="mb-3"
        onChange={(e) => setFile(e.target.files[0])}
      />

      <button
        className="bg-blue-500 px-4 py-2 rounded hover:bg-blue-600"
        onClick={uploadFile}
      >
        {loading ? "Uploading..." : "Upload"}
      </button>

      <div className="mt-4">
        {data.length > 0 && (
          <h3 className="mb-2 text-green-400">Results:</h3>
        )}

        {data.slice(0, 5).map((row, i) => (
          <div key={i} className="flex justify-between border-b py-2 text-sm">
            <span>{row.description}</span>
            <span className="text-green-400">{row.predicted}</span>
          </div>
        ))}
      </div>
    </div>
  );
}