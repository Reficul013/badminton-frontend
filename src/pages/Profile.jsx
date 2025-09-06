import React, { useEffect, useState } from 'react'
import { api } from '../lib/api'

export default function Profile() {
  const [me, setMe] = useState(null)
  const [profile, setProfile] = useState({ nickname: '', avatar_url: '', owns_car: false })
  const [vehicle, setVehicle] = useState({ make: '', model: '', color: '', plate_number: '', photo_url: '' })
  const [myVehicles, setMyVehicles] = useState([])

  useEffect(() => {
    async function load() {
      try {
        const m = await api.me()
        setMe(m)
        setProfile({ nickname: m.nickname || '', avatar_url: m.avatar_url || '', owns_car: !!m.owns_car })
        const all = await api.vehicles()
        setMyVehicles(all.filter(v => v.owner_id === m.id))
      } catch (e) {
        console.error(e)
        alert('Make sure backend is running and a user exists (X-User-Id=1)')
      }
    }
    load()
  }, [])

  function onProfileChange(e) {
    const { name, value, type, checked } = e.target
    setProfile(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }
  function onVehicleChange(e) {
    const { name, value } = e.target
    setVehicle(prev => ({ ...prev, [name]: value }))
  }

  async function saveProfile(e) {
    e.preventDefault()
    await api.updateMe(me.id, profile)
    const fresh = await api.me()
    setMe(fresh)
    alert('Profile updated')
  }
  async function addVehicle(e) {
    e.preventDefault()
    const v = await api.createVehicle(vehicle)
    setMyVehicles([...myVehicles, v])
    setVehicle({ make: '', model: '', color: '', plate_number: '', photo_url: '' })
    alert('Vehicle saved')
  }

  if (!me) return <div>Loading…</div>

  return (
    <div className="space-y-6">
      <section className="flex items-center gap-3">
        {profile.avatar_url ? <img src={profile.avatar_url} className="w-16 h-16 rounded-full object-cover" /> : <div className="w-16 h-16 rounded-full bg-gray-200" />}
        <div>
          <div className="font-semibold">{me.name || `User #${me.id}`}</div>
          <div className="text-sm text-gray-600">User ID: {me.id}</div>
        </div>
      </section>

      <section>
        <h2 className="font-semibold mb-2">Profile</h2>
        <form className="grid gap-2 max-w-xl" onSubmit={saveProfile}>
          <label className="block">
            <div className="text-sm">Nickname (display)</div>
            <input name="nickname" value={profile.nickname} onChange={onProfileChange} className="border p-2 rounded w-full" />
          </label>
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" name="owns_car" checked={profile.owns_car} onChange={onProfileChange} />
            <span>I own a car</span>
          </label>
          <button className="px-3 py-2 bg-black text-white rounded w-max">Save Profile</button>
        </form>
      </section>

      {profile.owns_car && (
        <section>
          <h2 className="font-semibold mb-2">Car details</h2>
          <form className="grid grid-cols-2 gap-2 max-w-xl" onSubmit={addVehicle}>
            <input name="make" placeholder="Make" className="border p-2 rounded" value={vehicle.make} onChange={onVehicleChange} required />
            <input name="model" placeholder="Model" className="border p-2 rounded" value={vehicle.model} onChange={onVehicleChange} required />
            <input name="color" placeholder="Color" className="border p-2 rounded" value={vehicle.color} onChange={onVehicleChange} />
            <input name="plate_number" placeholder="Plate" className="border p-2 rounded" value={vehicle.plate_number} onChange={onVehicleChange} />
            <button className="col-span-2 px-3 py-2 bg-black text-white rounded">Save Vehicle</button>
          </form>

          <div className="grid gap-2 mt-3">
            {myVehicles.map(v => (
              <div key={v.id} className="border p-2 rounded">
                <div className="text-sm">{v.make} {v.model} — {v.color || '—'} (Plate: {v.plate_number || '—'})</div>
              </div>
            ))}
            {!myVehicles.length && <div className="text-sm text-gray-600">No vehicles yet.</div>}
          </div>
        </section>
      )}
    </div>
  )
}
