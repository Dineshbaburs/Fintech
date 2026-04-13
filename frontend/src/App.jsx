import { useState } from "react";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import UploadOnboarding from "./pages/UploadOnboarding";

function App() {
  const UPLOAD_GATE_KEY = "fintech:initialUploadDone";

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeUser, setActiveUser] = useState("");
  const [initialUploadDone, setInitialUploadDone] = useState(
    false,
  );
  const [initialUploadPayload, setInitialUploadPayload] = useState(null);

  const handleLogin = (email, rememberMe = true) => {
    const storage = rememberMe ? localStorage : sessionStorage;
    const otherStorage = rememberMe ? sessionStorage : localStorage;

    storage.setItem("fintech:isAuthenticated", "true");
    storage.setItem("fintech:user", email);
    otherStorage.removeItem("fintech:isAuthenticated");
    otherStorage.removeItem("fintech:user");

    setActiveUser(email);
    setIsAuthenticated(true);
    setInitialUploadDone(false);
    setInitialUploadPayload(null);
    sessionStorage.removeItem(UPLOAD_GATE_KEY);
  };

  const handleLogout = () => {
    localStorage.removeItem("fintech:isAuthenticated");
    localStorage.removeItem("fintech:user");
    sessionStorage.removeItem("fintech:isAuthenticated");
    sessionStorage.removeItem("fintech:user");
    sessionStorage.removeItem(UPLOAD_GATE_KEY);
    setActiveUser("");
    setIsAuthenticated(false);
    setInitialUploadDone(false);
    setInitialUploadPayload(null);
  };

  const handleInitialUploadComplete = (payload) => {
    setInitialUploadPayload(payload);
    setInitialUploadDone(true);
    sessionStorage.setItem(UPLOAD_GATE_KEY, "true");
  };

  const handleNavigate = (target) => {
    const element = document.getElementById(target);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  if (!initialUploadDone) {
    return <UploadOnboarding onUploadComplete={handleInitialUploadComplete} />;
  }

  return (
    <div className="flex min-h-screen w-full flex-col overflow-hidden bg-transparent text-slate-900 lg:flex-row">
      <Sidebar activeUser={activeUser} onLogout={handleLogout} onNavigate={handleNavigate} />
      <Dashboard activeUser={activeUser} initialPayload={initialUploadPayload} />
    </div>
  );
}

export default App;