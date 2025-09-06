import React, { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { loginWithEmail } from '../lib/auth'

export default function Browse({ setTab }) {
  const [rides, setRides] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [reserving, setReserving] = useState(null)

  const loggedIn = !!localStorage.getItem('idToken')

  async function load() {
    try {
      setLoading(true)
      const data = await api.rides()
      setRides(data)
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleReserve(rideId) {
    if (!loggedIn) {
      alert('Please sign in first to reserve a seat.')
      return
    }
    try {
      setReserving(rideId)
      await api.reserve(rideId)
      await load()
      alert('Seat reserved!')
    } catch (e) {
      alert('Failed: ' + e)
    } finally {
      setReserving(null)
    }
  }

  return (
    <div className="space-y-3">
      {error && <div className="text-red-600">{error}</div>}
      {loading && <div>Loading rides…</div>}
      {!loading && !rides.length && (
        <div className="text-gray-700">
          No rides yet. <button className="underline" onClick={() => setTab('host')}>Host one</button>
        </div>
      )}

      {rides.map(r => {
        const isFull = r.seats_taken >= r.seats_total
        const disabled = isFull || reserving === r.id || !loggedIn
        return (
          <div key={r.id} className="border rounded p-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {r.host_avatar_url
                ? <img src={r.host_avatar_url} alt="avatar" className="w-10 h-10 rounded-full object-cover" />
                : <div className="w-10 h-10 rounded-full bg-gray-200" />}
              <div>
                <div className="font-medium">{r.host_nickname || `User #${r.host_id}`}</div>
                <div className="text-xs text-gray-600">
                  {r.vehicle_make ? `${r.vehicle_make} ${r.vehicle_model} • ${r.vehicle_color || ''}` : 'Car not specified'}
                </div>
                <div className="text-sm mt-1">{r.origin} → {r.destination}</div>
                <div className="text-xs text-gray-600">{new Date(r.departure_time).toLocaleString()}</div>
                {r.notes && <div className="text-xs text-gray-700 mt-1">{r.notes}</div>}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm mb-1">Seats: {r.seats_taken}/{r.seats_total}</div>
              <button
                className="px-3 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
                disabled={disabled}
                onClick={() => handleReserve(r.id)}
              >
                {reserving === r.id ? 'Reserving…' : isFull ? 'Full' : (loggedIn ? 'Reserve' : 'Sign in to reserve')}
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
