// src/components/Nav.jsx
import { useEffect, useRef, useState } from "react";
import { watchAuth, signOut } from "../lib/auth";
import AuthForm from "./AuthForm.jsx";

export default function Nav({ tab, setTab }) {
  const [user, setUser] = useState(null);
  const [showAuth, setShowAuth] = useState(false);
  const popref = useRef(null);

  useEffect(() => watchAuth(u => { setUser(u); if (u) setShowAuth(false); }), []);

  useEffect(() => {
    function onDocClick(e) {
      if (popref.current && !popref.current.contains(e.target)) setShowAuth(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const Tab = ({ id, label }) => (
    <button
      onClick={() => setTab(id)}
      className={
        "px-3 py-2 rounded " +
        (tab === id ? "bg-black text-white" : "bg-neutral-100 hover:bg-neutral-200")
      }
    >
      {label}
    </button>
  );

  return (
    <header className="flex items-center justify-between gap-4 p-4 border-b bg-white/80 backdrop-blur sticky top-0">
      <div className="flex items-center gap-2">
        <Tab id="browse" label="Browse" />
        <Tab id="host" label="Host" />
        <Tab id="profile" label="Profile" />
      </div>

      <div className="relative" ref={popref}>
        {user ? (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm">
              {(user.displayName || user.email || "U").slice(0, 1).toUpperCase()}
            </div>
            <span className="text-sm">{user.displayName || user.email}</span>
            <button className="text-sm underline" onClick={signOut}>Sign out</button>
          </div>
        ) : (
          <>
            <button
              className="px-3 py-2 rounded bg-black text-white"
              onClick={() => setShowAuth(v => !v)}
            >
              Sign in
            </button>
            {showAuth && (
              <div className="absolute right-0 top-full mt-2 z-50 w-[360px] border rounded bg-white shadow-lg p-3">
                <AuthForm onSuccess={() => setShowAuth(false)} />
              </div>
            )}
          </>
        )}
      </div>
    </header>
  );
}
