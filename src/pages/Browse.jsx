// src/pages/Browse.jsx
import { useEffect, useMemo, useState } from "react";
import api from "../lib/api";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { app } from "../lib/firebase";

function fmt(dt) {
  try {
    return new Date(dt).toLocaleString([], {
      weekday: "short", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return String(dt); }
}

function Avatar({ url, name }) {
  if (url) {
    return <img src={url} alt={name || "Host"} className="w-8 h-8 rounded-full object-cover" loading="lazy" />;
  }
  const initial = (name || "?").trim().charAt(0).toUpperCase();
  return (
    <div className="w-8 h-8 rounded-full bg-neutral-300 flex items-center justify-center text-sm font-medium">
      {initial}
    </div>
  );
}

function CarImage({ url }) {
  if (url) return <img src={url} alt="Vehicle" className="w-full h-full object-cover" loading="lazy" />;
  return (
    <div className="w-full h-full flex items-center justify-center text-xs text-neutral-500 bg-neutral-100">
      No car photo
    </div>
  );
}

export default function Browse() {
  const auth = getAuth(app);

  const [rides, setRides]     = useState([]);
  const [mine, setMine]       = useState(new Set()); // ride ids I reserved
  const [me, setMe]           = useState(null);      // backend user
  const [loading, setLoading] = useState(true);

  // banner shown only if listRides fails (fatal)
  const [banner, setBanner]   = useState("");

  // ephemeral per-ride flash (e.g., deletion) to avoid one message affecting all cards
  const [flash, setFlash]     = useState({}); // { [rideId]: "Ride deleted ✓" }

  // load rides (fatal if it fails)
  async function loadRides() {
    setBanner(""); setLoading(true);
    try {
      const list = await api.listRides();
      setRides(Array.isArray(list) ? list : []);
    } catch (e) {
      setBanner(e.message || "Failed to load rides.");
    } finally {
      setLoading(false);
    }
  }

  // load “optional” authed data (never fatal)
  async function loadAuthedExtras() {
    if (!auth.currentUser) {
      setMine(new Set());
      setMe(null);
      return;
    }
    try {
      const [ids, u] = await Promise.all([api.myReservations(), api.me()]);
      setMine(new Set(ids));
      setMe(u);
    } catch (e) {
      // degrade gracefully; don’t show a banner that suggests the API is down
      console.warn("Optional authed fetch failed:", e);
      setMine(new Set());
      setMe(null);
    }
  }

  // React to sign-in/out immediately
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async () => {
      await loadRides();
      await loadAuthedExtras();
    });
    // initial
    (async () => { await loadRides(); await loadAuthedExtras(); })();
    return () => unsub();
  }, []);


  const sorted = useMemo(() => {
    const now = Date.now();
    // keep only upcoming rides (1 minute grace to avoid flapping on clock skews)
    const upcoming = rides.filter(r => {
        const t = Date.parse(r.departure_time);
        return Number.isFinite(t) ? t >= now - 60_000 : true;
    });
    return upcoming.sort((a, b) => new Date(a.departure_time) - new Date(b.departure_time));
    }, [rides]);

  async function onReserve(id) {
    if (!auth.currentUser) { setBanner("Please sign in to reserve a seat."); return; }
    try {
      await api.reserve(id);
      setMine(prev => new Set(prev).add(id));
      setRides(rs => rs.map(r => r.id === id ? { ...r, seats_taken: (r.seats_taken ?? 0) + 1 } : r));
      setFlash(prev => ({ ...prev, [id]: "Seat reserved ✓" }));
      setTimeout(() => setFlash(prev => ({ ...prev, [id]: undefined })), 2200);
    } catch (e) {
      setFlash(prev => ({ ...prev, [id]: e.message || "Reserve failed" }));
      setTimeout(() => setFlash(prev => ({ ...prev, [id]: undefined })), 2600);
    }
  }

  async function onCancel(id) {
    if (!auth.currentUser) { setBanner("Please sign in to manage reservations."); return; }
    try {
      await api.cancelReservation(id);
      setMine(prev => { const n = new Set(prev); n.delete(id); return n; });
      setRides(rs => rs.map(r => r.id === id ? { ...r, seats_taken: Math.max(0, (r.seats_taken ?? 1) - 1) } : r));
      setFlash(prev => ({ ...prev, [id]: "Reservation canceled ✓" }));
      setTimeout(() => setFlash(prev => ({ ...prev, [id]: undefined })), 2200);
    } catch (e) {
      setFlash(prev => ({ ...prev, [id]: e.message || "Cancel failed" }));
      setTimeout(() => setFlash(prev => ({ ...prev, [id]: undefined })), 2600);
    }
  }

  async function onDelete(rideId) {
    if (!auth.currentUser) { setBanner("Please sign in to manage rides."); return; }
    const idx = rides.findIndex(r => r.id === rideId);
    const hasReservations = idx >= 0 && (rides[idx].seats_taken ?? 0) > 0;
    const msg = hasReservations
      ? "This ride already has reservations. Deleting it will also cancel those seats. Proceed?"
      : "Delete this ride?";
    if (!confirm(msg)) return;

    try {
      await api.deleteRide(rideId);
      setRides(rs => rs.filter(r => r.id !== rideId));
      setFlash(prev => ({ ...prev, [rideId]: "Ride deleted ✓" }));
      setTimeout(() => setFlash(prev => ({ ...prev, [rideId]: undefined })), 2200);
    } catch (e) {
      setFlash(prev => ({ ...prev, [rideId]: e.message || "Delete failed" }));
      setTimeout(() => setFlash(prev => ({ ...prev, [rideId]: undefined })), 2800);
    }
  }

  return (
    <div className="min-h-[calc(100vh-80px)] bg-gradient-to-b from-white to-neutral-50">
      <div className="max-w-5xl mx-auto p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold">Browse rides</h2>
          <p className="text-neutral-500 text-sm">
            Find a seat or host your own. You’ll need to sign in to reserve.
          </p>
        </div>

        {banner && (
          <div className="mb-4 rounded-lg px-3 py-2 text-sm bg-red-50 text-red-700 border border-red-200">
            {banner}
          </div>
        )}

        {loading && <div className="text-neutral-500">Loading rides…</div>}
        {!loading && sorted.length === 0 && <div className="text-neutral-600">No rides yet.</div>}

        <div className="flex flex-col gap-4">
          {sorted.map((r) => {
            const seatsLeft    = Math.max(0, (r.seats_total ?? 0) - (r.seats_taken ?? 0));
            const reservedByMe = mine.has(r.id);
            const isHost       = me && r.host_id === me.id;
            const flashMsg     = flash[r.id];

            return (
              <div key={r.id} className="w-full border rounded-xl overflow-hidden shadow-sm bg-white">
                <div className="grid grid-cols-12 gap-0">
                  <div className="col-span-12 md:col-span-3 h-40 md:h-44 bg-neutral-100">
                    <CarImage url={r.vehicle_photo_url} />
                  </div>
                  <div className="col-span-12 md:col-span-9 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Avatar url={r.host_avatar_url} name={r.host_nickname} />
                        <div className="text-sm">
                          <div className="font-medium">{r.host_nickname || "Host"}</div>
                          <div className="text-neutral-500">
                            {r.vehicle_name || "Car"}{r.vehicle_model ? ` · ${r.vehicle_model}` : ""}
                          </div>
                        </div>
                      </div>
                      {isHost && (
                        <button
                          className="text-xs px-2 py-1 rounded bg-red-50 text-red-700 hover:bg-red-100 border border-red-200"
                          onClick={() => onDelete(r.id)}
                          title="Delete this ride"
                        >
                          Delete
                        </button>
                      )}
                    </div>

                    <div className="grid md:grid-cols-4 gap-2 text-sm">
                      <div>
                        <div className="text-neutral-500">From</div>
                        <div className="font-medium">{r.origin}</div>
                      </div>
                      <div>
                        <div className="text-neutral-500">To</div>
                        <div className="font-medium">{r.destination || "Rally"}</div>
                      </div>
                      <div>
                        <div className="text-neutral-500">When</div>
                        <div className="font-medium">{fmt(r.departure_time)}</div>
                      </div>
                      <div>
                        <div className="text-neutral-500">Seats</div>
                        <div className="font-medium">{r.seats_total} total · {seatsLeft} left</div>
                      </div>
                    </div>

                    {r.notes && <div className="mt-2 text-sm text-neutral-700">{r.notes}</div>}

                    {flashMsg && (
                      <div className={`mt-3 text-sm ${
                        /✓/.test(flashMsg) ? "text-green-700" : "text-red-600"
                      }`}>
                        {flashMsg}
                      </div>
                    )}

                    <div className="mt-3 flex gap-2">
                      {!isHost && !reservedByMe && (
                        <button
                          className="px-4 py-2 rounded bg-black text-white disabled:opacity-50"
                          onClick={() => onReserve(r.id)}
                          disabled={seatsLeft <= 0}
                          title={seatsLeft <= 0 ? "Ride is full" : "Reserve a seat"}
                        >
                          {seatsLeft <= 0 ? "Full" : "Reserve"}
                        </button>
                      )}
                      {!isHost && reservedByMe && (
                        <button
                          className="px-4 py-2 rounded bg-neutral-200 hover:bg-neutral-300"
                          onClick={() => onCancel(r.id)}
                        >
                          Cancel reservation
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-10 text-xs text-neutral-500 text-center">
          This app is <b>not affiliated with UB or UB SA</b>.
        </div>
      </div>
    </div>
  );
}
