// src/pages/Browse.jsx
import { useEffect, useState, useMemo } from "react";
import api from "../lib/api";

function fmt(dt) {
  try {
    return new Date(dt).toLocaleString([], {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return String(dt);
  }
}

function Avatar({ url, name }) {
  if (url) {
    return (
      <img
        src={url}
        alt={name || "Host"}
        className="w-8 h-8 rounded-full object-cover"
        loading="lazy"
      />
    );
  }
  // fallback: initials bubble
  const initial = (name || "?").trim().charAt(0).toUpperCase();
  return (
    <div className="w-8 h-8 rounded-full bg-neutral-300 flex items-center justify-center text-sm font-medium">
      {initial}
    </div>
  );
}

function CarImage({ url }) {
  if (url) {
    return (
      <img
        src={url}
        alt="Vehicle"
        className="w-full h-full object-cover"
        loading="lazy"
      />
    );
  }
  // simple placeholder
  return (
    <div className="w-full h-full flex items-center justify-center text-xs text-neutral-500 bg-neutral-100">
      No car photo
    </div>
  );
}

export default function Browse() {
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let dead = false;
    (async () => {
      setErr("");
      setLoading(true);
      try {
        const list = await api.listRides();
        if (dead) return;
        setRides(Array.isArray(list) ? list : []);
      } catch (e) {
        if (!dead) setErr(e.message || "Failed to load rides");
      } finally {
        if (!dead) setLoading(false);
      }
    })();
    return () => { dead = true; };
  }, []);

  const sorted = useMemo(() => {
    return [...rides].sort(
      (a, b) => new Date(a.departure_time) - new Date(b.departure_time)
    );
  }, [rides]);

  async function onReserve(id) {
    try {
      await api.reserve(id);
      alert("Seat reserved!");
      // refresh list to update seats_taken
      const list = await api.listRides();
      setRides(Array.isArray(list) ? list : []);
    } catch (e) {
      alert(e.message || "Reserve failed");
    }
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h2 className="text-xl font-semibold mb-4">Browse</h2>

      {err && <div className="mb-4 text-red-600">Error: {err}</div>}
      {loading && (
        <div className="text-neutral-500">Loading rides…</div>
      )}

      {!loading && sorted.length === 0 && (
        <div className="text-neutral-600">No rides yet.</div>
      )}

      <div className="flex flex-col gap-4">
        {sorted.map((r) => {
          const seatsLeft = Math.max(0, (r.seats_total ?? 0) - (r.seats_taken ?? 0));
          return (
            <div
              key={r.id}
              className="w-full border rounded-xl overflow-hidden shadow-sm"
            >
              <div className="grid grid-cols-12 gap-0">
                {/* Left: vehicle image */}
                <div className="col-span-12 md:col-span-3 h-40 md:h-44 bg-neutral-100">
                  <CarImage url={r.vehicle_photo_url} />
                </div>

                {/* Right: details */}
                <div className="col-span-12 md:col-span-9 p-4">
                  {/* Host row */}
                  <div className="flex items-center gap-2 mb-2">
                    <Avatar url={r.host_avatar_url} name={r.host_nickname} />
                    <div className="text-sm">
                      <div className="font-medium">
                        {r.host_nickname || "Host"}
                      </div>
                      <div className="text-neutral-500">
                        {r.vehicle_name || "Car"}{r.vehicle_model ? ` · ${r.vehicle_model}` : ""}
                      </div>
                    </div>
                  </div>

                  {/* Ride info */}
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
                      <div className="font-medium">
                        {r.seats_total} total · {seatsLeft} left
                      </div>
                    </div>
                  </div>

                  {r.notes && (
                    <div className="mt-2 text-sm text-neutral-700">
                      {r.notes}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="mt-3">
                    <button
                      className="px-4 py-2 rounded bg-black text-white disabled:opacity-50"
                      onClick={() => onReserve(r.id)}
                      disabled={seatsLeft <= 0}
                      title={seatsLeft <= 0 ? "Ride is full" : "Reserve a seat"}
                    >
                      {seatsLeft <= 0 ? "Full" : "Reserve"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
