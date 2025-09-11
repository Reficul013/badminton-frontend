// src/pages/HostRide.jsx
import React, { useEffect, useState } from 'react'
import api from '../lib/api'
import { watchAuth } from '../lib/auth'  // small wrapper around onAuthStateChanged

export default function HostRide({ setTab }) {
  const [authed, setAuthed] = useState(false)
  const [me, setMe] = useState(null)
  const [vehicles, setVehicles] = useState([])
  const [form, setForm] = useState({
    origin: '',
    destination: 'Rally',
    departure_time: '',
    seats_total: 3,
    notes: ''
  })
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  // listen to Firebase auth
  useEffect(() => watchAuth(u => setAuthed(!!u)), [])

  // pre-load user & vehicles when signed in
  useEffect(() => {
    if (!authed) return
    let alive = true
    ;(async () => {
      try {
        const u = await api.me()
        if (!alive) return
        setMe(u)
        const v = await api.listVehicles()     // <-- FIX: listVehicles(), not vehicles()
        if (!alive) return
        setVehicles(v)
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
      alert('Ride hosted!')
      setTab?.('browse')
    } catch (e) {
      alert(`Failed: ${e.message || e}`)
    } finally {
      setSaving(false)
    }
  }

  if (!authed) return (
    <div className="p-4 border rounded bg-amber-50">
      Sign in (top-right) to host a ride.
    </div>
  )
  if (error)  return <div className="text-red-600">{error}</div>
  if (!me)    return <div>Loading…</div>

  const canHost = me.owns_car && vehicles.some(v => v.owner_id === me.id)

  return (
    <div className="max-w-xl bg-white border rounded-xl p-5 shadow-sm">
      {!me.owns_car && (
        <div className="mb-3 p-3 rounded bg-amber-50 border border-amber-200">
          Enable <b>I own a car</b> in Profile and add a vehicle.
        </div>
      )}
      {me.owns_car && vehicles.length === 0 && (
        <div className="mb-3 p-3 rounded bg-amber-50 border border-amber-200">
          Add a vehicle in Profile first.
        </div>
      )}

      <h3 className="text-lg font-semibold mb-3">Host a ride</h3>
      <form onSubmit={submit} className="grid gap-3">
        <input name="origin" placeholder="Origin"
               className="border p-2 rounded" value={form.origin}
               onChange={onChange} required />
        <input name="destination" placeholder="Destination"
               className="border p-2 rounded" value={form.destination}
               onChange={onChange} required />
        <input type="datetime-local" name="departure_time"
               className="border p-2 rounded" value={form.departure_time}
               onChange={onChange} required />
        <input type="number" min="1" name="seats_total"
               className="border p-2 rounded" value={form.seats_total}
               onChange={onChange} required />
        <textarea name="notes" placeholder="Notes (optional)"
                  className="border p-2 rounded" value={form.notes}
                  onChange={onChange} />
        <button className="px-3 py-2 bg-black text-white rounded disabled:opacity-50"
                disabled={!canHost || saving}>
          {saving ? 'Hosting…' : 'Host ride'}
        </button>
      </form>
    </div>
  )
}
