import { useState } from "react";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";

function App() {
  const getInitialAuthState = () =>
    localStorage.getItem("fintech:isAuthenticated") === "true" ||
    sessionStorage.getItem("fintech:isAuthenticated") === "true";

  const getInitialUser = () =>
    localStorage.getItem("fintech:user") ??
    sessionStorage.getItem("fintech:user") ??
    "";

  const [isAuthenticated, setIsAuthenticated] = useState(
    getInitialAuthState,
  );
  const [activeUser, setActiveUser] = useState(
    getInitialUser,
  );

  const handleLogin = (email, rememberMe = true) => {
    const storage = rememberMe ? localStorage : sessionStorage;
    const otherStorage = rememberMe ? sessionStorage : localStorage;

    storage.setItem("fintech:isAuthenticated", "true");
    storage.setItem("fintech:user", email);
    otherStorage.removeItem("fintech:isAuthenticated");
    otherStorage.removeItem("fintech:user");

    setActiveUser(email);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem("fintech:isAuthenticated");
    localStorage.removeItem("fintech:user");
    sessionStorage.removeItem("fintech:isAuthenticated");
    sessionStorage.removeItem("fintech:user");
    setActiveUser("");
    setIsAuthenticated(false);
  };

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-transparent text-slate-900 lg:flex-row">
      <Sidebar activeUser={activeUser} onLogout={handleLogout} />
      <Dashboard activeUser={activeUser} />
    </div>
  );
}

export default App;