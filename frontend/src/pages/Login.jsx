import { useState } from "react";
import { Zap, TrendingUp, Lock, BarChart3, ArrowRight, Eye, EyeOff } from "lucide-react";

export default function Login({ onLogin }) {
  const USERS_STORAGE_KEY = "fintech:users";
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const passwordStrength = (() => {
    if (!password) {
      return { label: "", score: 0 };
    }

    let score = 0;
    if (password.length >= 8) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;

    if (score <= 1) return { label: "Weak", score: 1 };
    if (score <= 3) return { label: "Medium", score: 2 };
    return { label: "Strong", score: 3 };
  })();

  const readUsers = () => {
    try {
      const rawUsers = localStorage.getItem(USERS_STORAGE_KEY);
      const parsedUsers = rawUsers ? JSON.parse(rawUsers) : [];
      return Array.isArray(parsedUsers) ? parsedUsers : [];
    } catch {
      return [];
    }
  };

  const saveUsers = (users) => {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  };

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setError("");
    setSuccess("");
    setPassword("");
    setConfirmPassword("");
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const ensureDemoAccount = () => {
    const users = readUsers();
    const demoEmail = "demo@findata.app";
    const demoPassword = "Demo@123";
    const hasDemo = users.some((user) => user.email === demoEmail);

    if (!hasDemo) {
      saveUsers([...users, { email: demoEmail, password: demoPassword }]);
    }

    setMode("login");
    setEmail(demoEmail);
    setPassword(demoPassword);
    setConfirmPassword("");
    setSuccess("Demo account loaded. Click Sign in to continue.");
    setError("");
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    const normalizedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();
    const users = readUsers();

    if (!normalizedEmail || !trimmedPassword) {
      setError("Please enter both email and password.");
      return;
    }

    if (!emailRegex.test(normalizedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (mode === "register") {
      if (trimmedPassword.length < 6) {
        setError("Password must be at least 6 characters long.");
        return;
      }

      if (trimmedPassword !== confirmPassword.trim()) {
        setError("Passwords do not match.");
        return;
      }

      const existingUser = users.find((user) => user.email === normalizedEmail);
      if (existingUser) {
        setError("This email is already registered. Please sign in.");
        return;
      }

      const nextUsers = [...users, { email: normalizedEmail, password: trimmedPassword }];
      saveUsers(nextUsers);
      setSuccess("Registration successful. Signing you in...");
      onLogin(normalizedEmail, rememberMe);
      return;
    }

    const matchedUser = users.find((user) => user.email === normalizedEmail);
    if (!matchedUser) {
      setError("No account found. Please register first.");
      return;
    }

    if (matchedUser.password !== trimmedPassword) {
      setError("Incorrect password. Please try again.");
      return;
    }

    onLogin(normalizedEmail, rememberMe);
  };

    const features = [
      { label: "Real-time", icon: Zap, color: "text-amber-400" },
      { label: "Analytics", icon: TrendingUp, color: "text-emerald-400" },
      { label: "Secure", icon: Lock, color: "text-sky-400" },
      { label: "ML-Powered", icon: BarChart3, color: "text-purple-400" },
    ];
  
    return (
      <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_#0f172a_0%,_#0b1324_40%,_#050b18_100%)] text-white">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-40 top-0 h-96 w-96 rounded-full bg-teal-500/25 blur-3xl animate-pulse" />
          <div className="absolute -right-40 bottom-0 h-96 w-96 rounded-full bg-cyan-500/15 blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
          <div className="absolute left-1/2 top-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/10 blur-3xl" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.06)_1px,transparent_1px)] bg-[size:44px_44px]" />
        </div>
  
        <div className="relative min-h-screen">
          <div className="flex min-h-screen flex-col lg:flex-row">
            <div className="flex flex-col justify-between border-b border-white/10 bg-gradient-to-b from-slate-900/70 to-slate-900/40 px-6 py-10 backdrop-blur-sm sm:px-10 lg:w-1/2 lg:border-b-0 lg:border-r lg:border-white/10 lg:py-12">
              <div>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600">
                    <Zap className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text text-transparent">FinData Intelligence</h2>
                    <p className="text-xs text-slate-400">AI Finance</p>
                  </div>
                </div>
              </div>
  
              <div className="my-12">
                <h1 className="text-4xl font-black leading-tight sm:text-5xl xl:text-6xl">
                  Intelligent
                  <span className="block bg-gradient-to-r from-teal-400 via-emerald-400 to-cyan-400 bg-clip-text text-transparent">Expense</span>
                  <span className="text-slate-400">Management</span>
                </h1>
  
                <p className="mt-6 text-lg leading-relaxed text-slate-300">
                  Categorize transactions with AI, analyze spending patterns in real-time, and unlock actionable financial insights instantly.
                </p>
  
                <div className="mt-10 grid grid-cols-2 gap-4">
                  {features.map((feature) => {
                    const Icon = feature.icon;
                    return (
                      <div key={feature.label} className="group rounded-xl border border-slate-700/50 bg-slate-800/30 p-4 transition hover:border-slate-600 hover:bg-slate-800/50">
                        <Icon className={`h-6 w-6 ${feature.color} mb-2 transition group-hover:scale-110`} />
                        <p className="text-sm font-semibold">{feature.label}</p>
                      </div>
                    );
                  })}
                </div>
  
                <div className="mt-12 flex gap-8">
                  <div>
                    <p className="text-3xl font-black text-teal-400">100%</p>
                    <p className="text-xs text-slate-400">Private & Secure</p>
                  </div>
                  <div>
                    <p className="text-3xl font-black text-emerald-400">Real-time</p>
                    <p className="text-xs text-slate-400">Live Analytics</p>
                  </div>
                </div>
              </div>
  
              <div className="text-xs text-slate-500">All processing happens locally. Your data never leaves your device. 🔒</div>
            </div>
  
              <div className="flex flex-col items-center justify-center px-6 py-10 sm:px-10 lg:w-1/2">
                <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/[0.03] p-6 shadow-[0_20px_40px_-24px_rgba(6,182,212,0.5)] backdrop-blur-xl sm:p-7">
                <div className="mb-8">
                  <h3 className="text-3xl font-black">{mode === "login" ? "Welcome back" : "Create account"}</h3>
                  <p className="mt-2 text-sm text-slate-400">{mode === "login" ? "Sign in to access your analytics dashboard" : "Start your financial intelligence journey"}</p>
                </div>
  
                <button type="button" onClick={ensureDemoAccount} className="mb-6 w-full flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-cyan-300/40 hover:bg-cyan-500/10">
                  <Zap className="h-4 w-4 text-amber-500" />
                  Try demo account
                </button>
  
                <div className="relative mb-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-700" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-slate-800 px-3 text-xs text-slate-500">or</span>
                  </div>
                </div>
  
                <div className="mb-6 flex gap-2 rounded-xl border border-white/10 bg-white/5 p-1">
                  <button onClick={() => switchMode("login")} className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${mode === "login" ? "bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-lg shadow-teal-500/30" : "text-slate-400 hover:text-slate-200"}`}>Sign In</button>
                  <button onClick={() => switchMode("register")} className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${mode === "register" ? "bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-lg shadow-teal-500/30" : "text-slate-400 hover:text-slate-200"}`}>Register</button>
                </div>
  
                {error && <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}
                {success && <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">{success}</div>}
  
                <form className="space-y-4" onSubmit={handleSubmit}>
                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-slate-300">Email</span>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-slate-500 transition focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/20 outline-none" />
                  </label>
  
                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-slate-300">Password</span>
                    <div className="flex items-center rounded-xl border border-white/10 bg-white/5 transition focus-within:border-cyan-400/60 focus-within:ring-2 focus-within:ring-cyan-400/20">
                      <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" className="w-full bg-transparent px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="px-3 text-slate-400 hover:text-slate-200">
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </label>
  
                  {mode === "register" && (
                    <>
                      <div>
                        <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
                          <span>Password strength</span>
                          <span className={passwordStrength.score === 1 ? "text-red-400" : passwordStrength.score === 2 ? "text-amber-400" : "text-emerald-400"}>{passwordStrength.label || "-"}</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-slate-700/80">
                          <div className={`h-full transition-all ${passwordStrength.score === 1 ? "w-1/3 bg-red-500" : passwordStrength.score === 2 ? "w-2/3 bg-amber-500" : "w-full bg-emerald-500"}`} />
                        </div>
                      </div>
  
                      <label className="block">
                        <span className="mb-2 block text-sm font-semibold text-slate-300">Confirm Password</span>
                        <div className="flex items-center rounded-xl border border-white/10 bg-white/5 transition focus-within:border-cyan-400/60 focus-within:ring-2 focus-within:ring-cyan-400/20">
                          <input type={showConfirmPassword ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Re-enter your password" className="w-full bg-transparent px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none" />
                          <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="px-3 text-slate-400 hover:text-slate-200">
                            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </label>
                    </>
                  )}
  
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="h-4 w-4 rounded border-slate-600 bg-slate-700/30 text-teal-600" />
                    <span className="text-sm text-slate-400">Remember me</span>
                  </label>
  
                  <button type="submit" className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-emerald-600 px-4 py-3 font-semibold text-white shadow-lg shadow-cyan-500/30 transition hover:shadow-cyan-400/50 active:scale-[0.98]">
                    {mode === "login" ? "Sign In" : "Create Account"}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </form>
  
                <p className="mt-6 text-center text-xs text-slate-500">
                  {mode === "login" ? "Don't have an account? " : "Already have an account? "}
                  <button type="button" onClick={() => switchMode(mode === "login" ? "register" : "login")} className="text-teal-400 hover:text-teal-300 font-semibold">
                    {mode === "login" ? "Register" : "Sign In"}
                  </button>
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }
