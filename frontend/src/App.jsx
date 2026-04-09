import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";

function App() {
  return (
    <div className="flex w-full min-h-screen bg-[#0E1117] text-white">
      <Sidebar />
      <Dashboard />
    </div>
  );
}

export default App;