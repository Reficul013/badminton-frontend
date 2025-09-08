// src/components/AuthForm.jsx
import { useState } from "react";
import { signIn, signUp, resetPassword } from "../lib/auth";

export default function AuthForm({ onSuccess }) {
  const [mode, setMode] = useState("login"); // 'login' | 'register'
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      if (mode === "login") {
        await signIn(email, password);
      } else {
        await signUp(email, password, name);
      }
      onSuccess?.();
    } catch (e) {
      setErr(e?.code || e?.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  async function onForgot() {
    setErr("");
    if (!email) return setErr("Enter your email then click “Forgot password”.");
    try {
      await resetPassword(email);
      setErr("Password reset email sent (check your inbox).");
    } catch (e) {
      setErr(e?.code || e?.message || String(e));
    }
  }

  return (
    <div className="p-3 border rounded bg-amber-50 max-w-md">
      <form className="grid gap-2" onSubmit={submit}>
        <div className="font-semibold">
          {mode === "login" ? "Sign in" : "Create account"}
        </div>

        {mode === "register" && (
          <input
            className="border p-2 rounded"
            placeholder="Display name (optional)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        )}

        <input
          className="border p-2 rounded"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className="border p-2 rounded"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {err && <div className="text-sm text-red-600">{err}</div>}

        <div className="flex gap-2 items-center">
          <button className="px-3 py-2 rounded bg-black text-white" disabled={busy}>
            {busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
          </button>
          <button
            type="button"
            className="text-sm underline"
            onClick={() => setMode(mode === "login" ? "register" : "login")}
          >
            {mode === "login" ? "Create an account" : "Have an account? Sign in"}
          </button>
          <button type="button" className="text-sm underline ml-auto" onClick={onForgot}>
            Forgot password?
          </button>
        </div>
      </form>
    </div>
  );
}
