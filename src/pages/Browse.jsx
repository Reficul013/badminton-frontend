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
  if (url) return <img src={url} alt={name || "Host"} className="w-8 h-8 rounded-full object-cover" loading="lazy" />;
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
  const [me, setMe]           = useState(null);      // backend user (id/nick)
  const [loading, setLoading] = useState(true);
  const [msg, setMsg]         = useState("");

  // Load list, then (optionally) my reservations and user.
  async function load() {
    setLoading(true);
    setMsg("");

    // 1) Primary call – only this controls the red banner
    try {
      const list = await api.listRides();
      setRides(Array.isArray(list) ? list : []);
    } catch (e) {
      setRides([]);
      setMsg(e.message || "Failed to load rides.");
      setLoading(false);
      return; // don't run secondary calls if list failed
    }

    // 2) Secondary calls – never trigger the red banner
    if (auth.currentUser) {
      api.myReservations()
        .then(ids => setMine(new Set(Array.isArray(ids) ? ids : [])))
        .catch(() => setMine(new Set()));
      api.me()
        .then(u => setMe(u || null))
        .catch(() => setMe(null));
    } else {
      setMine(new Set());
      setMe(null);
    }

    setLoading(false);
  }

  // React to sign-in/out immediately
  useEffect(() => {
    let alive = true;
    const unsub = onAuthStateChanged(auth, () => { if (alive) load(); });
    load(); // initial
    return () => { alive = false; unsub(); };
  }, []);

  const sorted = useMemo(
    () => [...rides].sort((a, b) => new Date(a.departure_time) - new Date(b.departure_time)),
    [rides]
  );

  async function onReserve(id) {
    if (!auth.currentUser) { setMsg("Please sign in to reserve a seat."); return; }
    try {
      await api.reserve(id);
      setMine(prev => new Set(prev).add(id));
      setRides(rs => rs.map(r => r.id === id ? { ...r, seats_taken: (r.seats_taken ?? 0) + 1 } : r));
      setMsg("Seat reserved ✓");
    } catch (e) { setMsg(e.message || "Reserve failed"); }
  }

  async function onCancel(id) {
    if (!auth.currentUser) { setMsg("Please sign in to manage reservations."); return; }
    try {
      await api.cancelReservation(id);
      setMine(prev => { const n = new Set(prev); n.delete(id); return n; });
      setRides(rs => rs.map(r => r.id === id ? { ...r, seats_taken: Math.max(0, (r.seats_taken ?? 1) - 1) } : r));
      setMsg("Reservation canceled ✓");
    } catch (e) { setMsg(e.message || "Cancel failed"); }
  }

  async function onDelete(rideId) {
    if (!auth.currentUser) { setMsg("Please sign in to manage rides."); return; }
    if (!confirm("Delete this ride? This will remove all reservations for it.")) return;
    try {
      await api.deleteRide(rideId);
      setRides(rs => rs.filter(r => r.id !== rideId));
      setMsg("Ride deleted ✓");
    } catch (e) { setMsg(e.message || "Delete failed"); }
  }

  const isListError = /Network error|Failed to load rides/i.test(msg);

  return (
    <div className="min-h-[calc(100vh-80px)] bg-gradient-to-b from-white to-neutral-50">
      <div className="max-w-5xl mx-auto p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold">Browse rides</h2>
          <p className="text-neutral-500 text-sm">
            Find a seat or host your own. You’ll need to sign in to reserve.
          </p>
        </div>

        {/* Only show the red banner when the primary list failed */}
        {isListError && (
          <div className="mb-4 rounded-lg px-3 py-2 text-sm bg-red-50 text-red-700 border border-red-200">
            {msg}
          </div>
        )}

        {loading && <div className="text-neutral-500">Loading rides…</div>}
        {!loading && sorted.length === 0 && <div className="text-neutral-600">No rides yet.</div>}

        <div className="flex flex-col gap-4">
          {sorted.map((r) => {
            const seatsLeft    = Math.max(0, (r.seats_total ?? 0) - (r.seats_taken ?? 0));
            const reservedByMe = mine.has(r.id);
            const isHost       = me && r.host_id === me.id;

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
                      {/* Success / info messages (non-fatal) */}
                      {!isListError && msg && (
                        <div className={`text-sm ${/✓/.test(msg) ? "text-green-700" : "text-red-600"} self-center`}>
                          {msg}
                        </div>
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
