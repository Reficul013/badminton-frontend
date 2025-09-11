// src/lib/api.js
import { idToken } from "./auth";

// Trim trailing "/" to avoid //api/...
const BASE = (import.meta.env.VITE_API_BASE || "http://127.0.0.1:8002").replace(/\/$/, "");

async function request(path, opts = {}) {
  const method = (opts.method || "GET").toUpperCase();
  const token  = await idToken().catch(() => null);

  const headers = {
    ...(opts.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  // Only set Content-Type when sending JSON
  const hasBody = ["POST","PUT","PATCH"].includes(method);
  if (hasBody && !headers["Content-Type"]) headers["Content-Type"] = "application/json";

  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...opts,
      headers,
      mode: "cors",
      credentials: "omit", // use Bearer
    });
  } catch {
    throw new Error("Network error. Please check your connection.");
  }

  const text = await res.text();
  let data = null;
  if (text) { try { data = JSON.parse(text); } catch { data = { raw: text }; } }

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      throw new Error("Please sign in to continue.");
    }
    const msg = data?.detail || data?.message || data?.error || `HTTP ${res.status}`;
    throw new Error(msg);
  }

  return data;
}

const get   = (p)       => request(p, { method: "GET" });
const post  = (p, body) => request(p, { method: "POST",  body: JSON.stringify(body) });
const patch = (p, body) => request(p, { method: "PATCH", body: JSON.stringify(body) });
const put   = (p, body) => request(p, { method: "PUT",   body: JSON.stringify(body) });
const del   = (p)       => request(p, { method: "DELETE" });

// ---------------- Users ----------------
async function me() { return get(`/api/users/me`); }
async function updateUser(userId, payload) {
  try { return await patch(`/api/users/${userId}`, payload); }
  catch (e) {
    if (/404|405|not\s+allowed|not\s+found/i.test(e.message || "")) {
      return await patch(`/api/users/me`, payload);
    }
    throw e;
  }
}

// ---------------- Vehicles --------------
async function listVehicles()         { return get(`/api/vehicles`); }
async function myVehicle()            { return get(`/api/vehicles/me`); }
// Backend POST /api/vehicles is UPSERT (200)
async function saveVehicle(payload)   { return post(`/api/vehicles`, payload); }
async function createVehicle(payload) { return post(`/api/vehicles`, payload); }

// ---------------- Rides -----------------
async function listRides()            { return get(`/api/rides`); }
async function createRide(payload)    { return post(`/api/rides`, payload); }

// ---------------- Reservations ----------
async function reserve(ride_id)             { return post(`/api/reservations`, { ride_id }); }
async function cancelReservation(rideId)    { return del(`/api/reservations/${rideId}`); }
async function myReservations()             { return get(`/api/reservations/me`); }

export default {
  health: () => get(`/api/health`),

  me, updateUser,
  listVehicles, myVehicle, saveVehicle, createVehicle,
  listRides, createRide,
  reserve, cancelReservation, myReservations,
};

export {
  me, updateUser,
  listVehicles, myVehicle, saveVehicle, createVehicle,
  listRides, createRide,
  reserve, cancelReservation, myReservations,
};
