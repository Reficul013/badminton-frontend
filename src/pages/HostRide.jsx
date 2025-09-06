import React, { useEffect, useState } from 'react'
import { api } from '../lib/api'

export default function HostRide({ setTab }) {
  const [me, setMe] = useState(null)
  const [vehicles, setVehicles] = useState([])
  const [form, setForm] = useState({
    origin: '',
    destination: 'Rally',
    departure_time: '',
    seats_total: 3,
    notes: ''
  })

  useEffect(() => {
    async function load() {
      const m = await api.me()
      setMe(m)
      const all = await api.vehicles()
      setVehicles(all.filter(v => v.owner_id === m.id))
    }
    load()
  }, [])

  function onChange(e) {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  async function submit(e) {
    e.preventDefault()
    await api.createRide({ ...form, seats_total: Number(form.seats_total) })
    alert('Ride created!')
    setTab('browse')
  }

  if (!me) return <div>Loading…</div>

  const hasCar = me?.owns_car && vehicles.length > 0
  const myVehicle = vehicles[0]

  if (!hasCar) {
    return (
      <div className="border rounded p-4">
        <div className="font-medium mb-2">Add your car to host a ride</div>
        <p className="text-sm text-gray-600 mb-3">
          Go to your Profile, toggle “I own a car”, and add your car details.
        </p>
        <button className="px-3 py-2 bg-black text-white rounded" onClick={() => setTab('profile')}>
          Go to Profile
        </button>
      </div>
    )
  }

  return (
    <form className="space-y-3 max-w-xl" onSubmit={submit}>
      <div className="p-3 border rounded bg-gray-50">
        <div className="text-sm text-gray-600 mb-1">Hosting as</div>
        <div className="font-medium">{me.nickname || me.name}</div>
        <div className="text-sm text-gray-600 mt-2">Vehicle</div>
        <div className="text-sm">{myVehicle.make} {myVehicle.model} {myVehicle.color ? `• ${myVehicle.color}` : ''}</div>
      </div>

      <label className="block">
        <div className="text-sm">Origin</div>
        <input name="origin" value={form.origin} onChange={onChange} className="border p-2 rounded w-full" required />
      </label>
      <label className="block">
        <div className="text-sm">Destination</div>
        <input name="destination" value={form.destination} onChange={onChange} className="border p-2 rounded w-full" required />
      </label>
      <label className="block">
        <div className="text-sm">Departure Time</div>
        <input type="datetime-local" name="departure_time" value={form.departure_time} onChange={onChange} className="border p-2 rounded w-full" required />
      </label>
      <label className="block">
        <div className="text-sm">Seats Total</div>
        <input type="number" min="1" name="seats_total" value={form.seats_total} onChange={onChange} className="border p-2 rounded w-full" required />
      </label>
      <label className="block">
        <div className="text-sm">Notes</div>
        <textarea name="notes" value={form.notes} onChange={onChange} className="border p-2 rounded w-full" />
      </label>

      <button className="px-3 py-2 bg-black text-white rounded" type="submit">Create Ride</button>
    </form>
  )
}
