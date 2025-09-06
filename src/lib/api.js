// src/lib/api.js
import { getIdToken } from './auth'

const baseURL = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8002'

async function authHeaders() {
  const headers = { 'Content-Type': 'application/json' }
  const token = await getIdToken()
  if (token) headers['Authorization'] = `Bearer ${token}`
  return headers
}

export async function apiGet(path) {
  const r = await fetch(baseURL + path, { headers: await authHeaders() })
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

export async function apiPost(path, body) {
  const r = await fetch(baseURL + path, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify(body),
  })
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

export async function apiPatch(path, body) {
  const r = await fetch(baseURL + path, {
    method: 'PATCH',
    headers: await authHeaders(),
    body: JSON.stringify(body),
  })
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

export const api = {
  health: () => apiGet('/api/health'),
  me: () => apiGet('/api/users/me'),
  users: () => apiGet('/api/users'),
  updateMe: (id, data) => apiPatch(`/api/users/${id}`, data),
  vehicles: () => apiGet('/api/vehicles'),
  createVehicle: (data) => apiPost('/api/vehicles', data),
  rides: () => apiGet('/api/rides'),
  createRide: (data) => apiPost('/api/rides', data),
  reserve: (ride_id) => apiPost('/api/reservations', { ride_id }),
}
