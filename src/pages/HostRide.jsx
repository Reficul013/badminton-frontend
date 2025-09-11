// src/pages/HostRide.jsx
import React, { useEffect, useState } from 'react'
import api from '../lib/api'
import { watchAuth } from '../lib/auth'

export default function HostRide({ setTab }) {
  const [authed, setAuthed] = useState(false)
  const [me, setMe] = useState(null)
  const [vehicles, setVehicles] = useState([])
  const [myRides, setMyRides] = useState([])
  const [form, setForm] = useState({
    origin: '',
    destination: 'Rally',
    departure_time: '',
    seats_total: 3,
    notes: ''
  })
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState("")

  useEffect(() => watchAuth(u => setAuthed(!!u)), [])

  useEffect(() => {
    if (!authed) return
    let alive = true
    ;(async () => {
      try {
        setMsg("")
        const u = await api.me()
        if (!alive) return
        setMe(u)
        const v = await api.listVehicles()
        if (!alive) return
        setVehicles(v)
        const mine = await api.listRides()
        if (!alive) return
        setMyRides((mine || []).filter(r => r.host_id === u.id))
      } catch (e) {
        if (!alive) return
        setError(String(e.message || e))
        console.error('Host preload error:', e)
      }
    })()
    return () => { alive = false }
  }, [authed])

  function onChange(e) {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: name === 'seats_total' ? Number(value) : value }))
  }

  async function submit(e) {
    e.preventDefault()
    try {
      setSaving(true)
      await api.createRide({ ...form, seats_total: Number(form.seats_total) })
      setMsg("Ride hosted ✓")
      setForm({ origin: '', destination: 'Rally', departure_time: '', seats_total: 3, notes: '' })
      // refresh my list
      const mine = await api.listRides()
      setMyRides((mine || []).filter(r => r.host_id === me.id))
      setTab?.('browse')
    } catch (e) {
      setMsg(e.message || "Failed to host ride")
    } finally {
      setSaving(false)
    }
  }

  async function unhost(id) {
    try {
      await api.deleteRide(id)
      setMyRides(rs => rs.filter(r => r.id !== id))
      setMsg("Ride removed ✓")
    } catch (e) {
      setMsg(e.message || "Failed to remove ride")
    }
  }

  if (!authed) return <div className="p-3 border rounded bg-amber-50">Sign in (top-right) to host a ride.</div>
  if (error)  return <div className="text-red-600">{error}</div>
  if (!me)    return <div>Loading…</div>

  const canHost = me.owns_car && vehicles.some(v => v.owner_id === me.id)

  return (
    <div className="grid gap-6">
      {msg && (
        <div className={`text-sm ${/✓/.test(msg) ? "text-green-700" : "text-red-600"}`}>{msg}</div>
      )}

      {!me.owns_car && <div className="p-3 border rounded bg-amber-50">Enable <b>I own a car</b> in Profile and add a vehicle.</div>}
      {me.owns_car && vehicles.length === 0 && (
        <div className="p-3 border rounded bg-amber-50">Add a vehicle in Profile first.</div>
      )}

      <form onSubmit={submit} className="grid gap-2 max-w-md">
        <h3 className="font-semibold">Host a ride</h3>
        <input name="origin" placeholder="Origin" className="border p-2 rounded" value={form.origin} onChange={onChange} required />
        <input name="destination" placeholder="Destination" className="border p-2 rounded" value={form.destination} onChange={onChange} required />
        <input type="datetime-local" name="departure_time" className="border p-2 rounded" value={form.departure_time} onChange={onChange} required />
        <input type="number" min="1" name="seats_total" className="border p-2 rounded" value={form.seats_total} onChange={onChange} required />
        <textarea name="notes" placeholder="Notes (optional)" className="border p-2 rounded" value={form.notes} onChange={onChange} />
        <button className="px-3 py-2 bg-black text-white rounded disabled:opacity-50" disabled={!canHost || saving}>
          {saving ? 'Hosting…' : 'Host ride'}
        </button>
      </form>

      <div className="max-w-2xl">
        <h3 className="font-semibold mb-2">My hosted rides</h3>
        {myRides.length === 0 && <div className="text-neutral-500 text-sm">You haven’t hosted any rides yet.</div>}
        <div className="grid gap-3">
          {myRides.map(r => (
            <div key={r.id} className="border rounded p-3 flex items-center justify-between">
              <div className="text-sm">
                <div className="font-medium">{r.origin} → {r.destination || 'Rally'}</div>
                <div className="text-neutral-500">{fmt(r.departure_time)} · {r.seats_total} seats</div>
              </div>
              <button className="px-3 py-1.5 bg-red-600 text-white rounded" onClick={() => unhost(r.id)}>Unhost</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function fmt(dt) {
  try {
    return new Date(dt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
  } catch { return String(dt) }
}
