import { useState } from "react";

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

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10 text-slate-900">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 top-0 h-80 w-80 rounded-full bg-teal-300/30 blur-3xl" />
        <div className="absolute -right-20 bottom-0 h-72 w-72 rounded-full bg-sky-300/30 blur-3xl" />
      </div>

      <section className="relative w-full max-w-md rounded-3xl border border-slate-200 bg-white/90 p-7 shadow-xl shadow-slate-300/35 backdrop-blur sm:p-8">
        <p className="text-xs uppercase tracking-[0.3em] text-teal-700/80">Welcome</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">Sign in to FinData Intelligence</h1>
        <p className="mt-2 text-sm text-slate-600">
          Access your expense analytics workspace and upload transaction data securely.
        </p>

        <button
          type="button"
          onClick={ensureDemoAccount}
          className="mt-4 w-full rounded-xl border border-sky-300/50 bg-sky-50 px-4 py-2.5 text-sm text-sky-800 transition hover:bg-sky-100"
        >
          Use demo account
        </button>

        <div className="mt-6 grid grid-cols-2 rounded-xl border border-slate-200 bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => switchMode("login")}
            className={`rounded-lg px-3 py-2 text-sm transition ${
              mode === "login"
                ? "bg-emerald-400 text-[#0b111c]"
                : "text-slate-600 hover:bg-white"
            }`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => switchMode("register")}
            className={`rounded-lg px-3 py-2 text-sm transition ${
              mode === "register"
                ? "bg-emerald-400 text-[#0b111c]"
                : "text-slate-600 hover:bg-white"
            }`}
          >
            Register
          </button>
        </div>

        <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm text-slate-700">
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@company.com"
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-400/40 focus:ring-2 focus:ring-emerald-300/30"
              autoComplete="email"
            />
          </label>

          <label className="block text-sm text-slate-700">
            Password
            <div className="mt-2 flex items-center rounded-xl border border-slate-300 bg-white px-3 focus-within:border-emerald-400/40 focus-within:ring-2 focus-within:ring-emerald-300/30">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                className="w-full bg-transparent px-1 py-2.5 text-sm text-slate-900 outline-none"
                autoComplete={mode === "register" ? "new-password" : "current-password"}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="px-2 text-xs text-slate-500 transition hover:text-slate-800"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </label>

          {mode === "register" && (
            <>
              <div>
                <div className="mb-1 flex items-center justify-between text-xs text-slate-600">
                  <span>Password strength</span>
                  <span>{passwordStrength.label || "-"}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className={`h-full transition-all ${
                      passwordStrength.score === 1
                        ? "w-1/3 bg-rose-400"
                        : passwordStrength.score === 2
                          ? "w-2/3 bg-amber-400"
                          : passwordStrength.score === 3
                            ? "w-full bg-emerald-400"
                            : "w-0"
                    }`}
                  />
                </div>
              </div>

              <label className="block text-sm text-slate-700">
                Confirm password
                <div className="mt-2 flex items-center rounded-xl border border-slate-300 bg-white px-3 focus-within:border-emerald-400/40 focus-within:ring-2 focus-within:ring-emerald-300/30">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="Re-enter your password"
                    className="w-full bg-transparent px-1 py-2.5 text-sm text-slate-900 outline-none"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="px-2 text-xs text-slate-500 transition hover:text-slate-800"
                  >
                    {showConfirmPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </label>
            </>
          )}

          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(event) => setRememberMe(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 bg-white"
            />
            Remember me on this device
          </label>

          {error && (
            <p className="rounded-xl border border-rose-300/60 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </p>
          )}

          {success && (
            <p className="rounded-xl border border-emerald-300/60 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {success}
            </p>
          )}

          <button
            type="submit"
            className="w-full rounded-xl bg-emerald-400 px-4 py-2.5 text-sm font-semibold text-[#0b111c] transition hover:bg-emerald-300"
          >
            {mode === "register" ? "Create account" : "Sign in"}
          </button>
        </form>
      </section>
    </main>
  );
}
