import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";

function App() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-[#0E1117] text-white lg:flex-row">
      <Sidebar />
      <Dashboard />
    </div>
  );
}

export default App;