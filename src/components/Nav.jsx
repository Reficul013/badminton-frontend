// src/components/Nav.jsx
import { useEffect, useState } from 'react'
import { watchAuth, registerWithEmail, loginWithEmail, logout } from '../lib/auth'

export default function Nav({ tab, setTab }) {
  const [user, setUser] = useState(null)
  const [mode, setMode] = useState('login') // 'login' | 'register'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')

  useEffect(() => watchAuth(setUser), [])

  async function onSubmit(e) {
    e.preventDefault()
    try {
      if (mode === 'register') {
        await registerWithEmail(email, password, displayName)
      } else {
        await loginWithEmail(email, password)
      }
      setEmail(''); setPassword(''); setDisplayName('')
    } catch (err) {
      alert(String(err))
    }
  }

  return (
    <header className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
      <button onClick={() => setTab('browse')} className="text-lg font-semibold">
        Rides to Rally
      </button>
      <div className="flex items-center gap-3">
        <button onClick={() => setTab('host')} className="px-3 py-2 rounded-full bg-blue-600 text-white">
          🚘 Driving to Rally?
        </button>

        {user ? (
          <>
            <button onClick={() => setTab('profile')} className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm">
                {(user.displayName || 'Me').slice(0,1).toUpperCase()}
              </div>
              <span className="text-sm">{user.displayName || user.email}</span>
            </button>
            <button className="text-sm" onClick={logout}>Sign out</button>
          </>
        ) : (
          <form onSubmit={onSubmit} className="flex items-center gap-2">
            {mode === 'register' && (
              <input
                type="text" placeholder="Display name"
                value={displayName} onChange={e => setDisplayName(e.target.value)}
                className="border rounded px-2 py-1"
              />
            )}
            <input
              type="email" placeholder="you@example.com" required
              value={email} onChange={e => setEmail(e.target.value)}
              className="border rounded px-2 py-1"
            />
            <input
              type="password" placeholder="••••••••" required
              value={password} onChange={e => setPassword(e.target.value)}
              className="border rounded px-2 py-1"
            />
            <button type="submit" className="text-sm px-3 py-1 rounded bg-black text-white">
              {mode === 'register' ? 'Register' : 'Login'}
            </button>
            <button
              type="button"
              className="text-xs underline"
              onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
            >
              {mode === 'login' ? 'Create account' : 'Have an account? Login'}
            </button>
          </form>
        )}
      </div>
    </header>
  )
}
