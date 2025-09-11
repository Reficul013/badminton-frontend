// src/lib/api.js
import { idToken } from "./auth";

const BASE = (import.meta.env.VITE_API_BASE || "http://127.0.0.1:8002").replace(/\/$/, "");

async function request(path, opts = {}) {
  const method = (opts.method || "GET").toUpperCase();
  const token  = await idToken().catch(() => null);

  const headers = {
    ...(opts.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  if (["POST","PUT","PATCH"].includes(method)) headers["Content-Type"] = "application/json";

  let res;
  try {
    res = await fetch(`${BASE}${path}`, { ...opts, headers, mode: "cors", credentials: "omit" });
  } catch {
    throw new Error("Network error. Is the backend running and VITE_API_BASE correct?");
  }

  const text = await res.text();
  let data = null;
  if (text) { try { data = JSON.parse(text); } catch { data = { raw: text }; } }

  if (!res.ok) {
    const msg = data?.detail || data?.message || data?.error || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

const get   = (p)       => request(p, { method: "GET" });
const post  = (p, body) => request(p, { method: "POST",  body: JSON.stringify(body) });
const patch = (p, body) => request(p, { method: "PATCH", body: JSON.stringify(body) });
const del   = (p)       => request(p, { method: "DELETE" });

// Users
const me         = () => get(`/api/users/me`);
const updateUser = async (userId, payload) => {
  try { return await patch(`/api/users/${userId}`, payload); }
  catch (e) {
    if (/404|405|not\s+allowed|not\s+found/i.test(e.message || "")) {
      return await patch(`/api/users/me`, payload);
    }
    throw e;
  }
};

// Vehicles
const listVehicles   = () => get(`/api/vehicles`);
const createVehicle  = (payload) => post(`/api/vehicles`, payload);
const saveVehicle    = async (payload) => {
  try { return await post(`/api/vehicles/upsert`, payload); }
  catch (e) {
    if (/404|405/i.test(e.message || "")) return await post(`/api/vehicles`, payload);
    throw e;
  }
};

// Rides
const listRides  = () => get(`/api/rides`);
const createRide = (payload) => post(`/api/rides`, payload);

// Reservations
const reserve            = (ride_id) => post(`/api/reservations`, { ride_id });
const myReservations     = () => get(`/api/reservations/me`);
const cancelReservation  = (ride_id) => del(`/api/reservations/${ride_id}`);

export default {
  health: () => get(`/api/health`),

  me, updateUser,

  listVehicles, createVehicle, saveVehicle,

  listRides, createRide,

  reserve, myReservations, cancelReservation,
};
