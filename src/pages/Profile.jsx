// src/pages/Profile.jsx
import { useEffect, useMemo, useState, useCallback } from "react";
import api from "../lib/api";
import { uploadAvatar, uploadVehiclePhoto } from "../lib/storage";

import { getAuth, onIdTokenChanged } from "firebase/auth";
import { app } from "../lib/firebase";
const auth = getAuth(app);

const ACCEPTED = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const MAX_MB = 8;

export default function Profile() {
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  // user fields
  const [nickname, setNickname] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [owns, setOwns] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState("");

  // vehicle fields
  const [vName, setVName] = useState("");
  const [vModel, setVModel] = useState("");
  const [vPlate, setVPlate] = useState("");
  const [vPhoto, setVPhoto] = useState(null);
  const [vPhotoUrl, setVPhotoUrl] = useState("");

  // baselines (to compute "dirty")
  const [baseUser, setBaseUser] = useState(null);
  const [baseVeh, setBaseVeh] = useState(null);

  // previews
  const avatarPreview = useMemo(
    () => (avatarFile ? URL.createObjectURL(avatarFile) : avatarUrl || ""),
    [avatarFile, avatarUrl]
  );
  const vehiclePreview = useMemo(
    () => (vPhoto ? URL.createObjectURL(vPhoto) : vPhotoUrl || ""),
    [vPhoto, vPhotoUrl]
  );

  // helpers
  const resetForm = useCallback(() => {
    setMe(null);
    setNickname(""); setPhone(""); setBio(""); setOwns(false);
    setAvatarFile(null); setAvatarUrl("");
    setVName(""); setVModel(""); setVPlate(""); setVPhoto(null); setVPhotoUrl("");
    setBaseUser(null); setBaseVeh(null);
    setMsg(""); setLoading(false);
  }, []);

  const loadEverything = useCallback(async () => {
    setLoading(true);
    setMsg("");
    try {
      const u = await api.me();
      setMe(u);
      setNickname(u.nickname || "");
      setPhone(u.phone || "");
      setBio(u.bio || "");
      setOwns(!!u.owns_car);
      setAvatarUrl(u.avatar_url || "");
      setBaseUser({
        nickname: u.nickname || "",
        phone: u.phone || "",
        bio: u.bio || "",
        owns_car: !!u.owns_car,
        avatar_url: u.avatar_url || "",
      });

      let v0 = null;
      try {
        const vehicles = await api.listVehicles();
        v0 = vehicles?.[0] || null;
      } catch { /* ignore */ }

      setVName(v0?.name || "");
      setVModel(v0?.model || "");
      setVPlate(v0?.license_plate || "");
      setVPhotoUrl(v0?.photo_url || "");
      setBaseVeh({
        name: v0?.name || "",
        model: v0?.model || "",
        license_plate: v0?.license_plate || "",
        photo_url: v0?.photo_url || "",
      });
    } catch (e) {
      const unauthorized = /401|403|auth|authorization|token/i.test(e?.message || "");
      if (unauthorized) resetForm();
      else setMsg(`Failed to load profile: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }, [resetForm]);

  function checkImage(file) {
    if (!file) return null;
    if (!ACCEPTED.includes(file.type)) return "Please choose a PNG, JPG, WEBP or GIF.";
    if (file.size > MAX_MB * 1024 * 1024) return `Image is too large. Max ${MAX_MB}MB.`;
    return null;
  }

  // single SAVE (user + vehicle)
  async function saveAll() {
    if (!me || saving) return;
    setMsg("");
    setSaving(true);
    try {
      // Upload images (if changed)
      let newAvatarUrl = avatarUrl;
      if (avatarFile) {
        const err = checkImage(avatarFile);
        if (err) throw new Error(err);
        newAvatarUrl = await uploadAvatar(avatarFile, me.id);
      }

      let newVehUrl = vPhotoUrl;
      if (vPhoto) {
        const err = checkImage(vPhoto);
        if (err) throw new Error(err);
        newVehUrl = await uploadVehiclePhoto(vPhoto, me.id);
      }

      // Update user
      const userPayload = {
        nickname, phone, bio, owns_car: owns,
        ...(avatarFile ? { avatar_url: newAvatarUrl } : {}),
      };

      // Save vehicle (upsert → fallback to legacy create)
      const vehPayload = {
        name: vName, model: vModel, license_plate: vPlate, photo_url: newVehUrl,
      };

      // Run sequentially so messages make sense if one fails
      await api.updateUser(me.id, userPayload);
      try {
        await api.saveVehicle(vehPayload);
      } catch (e) {
        if (/404|405|not\s+found|not\s+allowed/i.test(e.message || "")) {
          await api.createVehicle(vehPayload);
        } else {
          throw e;
        }
      }

      // refresh & reset "dirty"
      await loadEverything();
      setAvatarFile(null);
      setVPhoto(null);
      setMsg("Profile saved ✓");
    } catch (e) {
      setMsg(`Save failed: ${e.message}`);
    } finally {
      setSaving(false);
    }
  }

  // react to auth changes
  useEffect(() => {
    if (auth.currentUser) loadEverything();
    else resetForm();
    const unsub = onIdTokenChanged(auth, user => (user ? loadEverything() : resetForm()));
    return () => unsub();
  }, [loadEverything, resetForm]);

  // detect unsaved changes
  const isDirty = useMemo(() => {
    if (!baseUser || !baseVeh) return false;
    const userChanged =
      nickname !== baseUser.nickname ||
      phone !== baseUser.phone ||
      bio !== baseUser.bio ||
      owns !== baseUser.owns_car ||
      !!avatarFile;
    const vehChanged =
      vName !== baseVeh.name ||
      vModel !== baseVeh.model ||
      vPlate !== baseVeh.license_plate ||
      !!vPhoto;
    return userChanged || vehChanged;
  }, [baseUser, baseVeh, nickname, phone, bio, owns, avatarFile, vName, vModel, vPlate, vPhoto]);

  const disabled = !me || loading || saving;

  return (
    <div className="max-w-4xl mx-auto p-6 pb-24">
      <h1 className="text-2xl font-semibold mb-4">Profile</h1>

      {msg && (
        <div
          className={`mb-4 rounded border px-4 py-3 text-sm ${
            /✓/.test(msg)
              ? "border-green-200 bg-green-50 text-green-800"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {msg}
        </div>
      )}

      {/* Card: About you */}
      <div className="rounded-xl border border-neutral-200 bg-white p-5 md:p-6 shadow-sm mb-6">
        <h2 className="text-lg font-medium mb-4">About you</h2>
        <div className="grid grid-cols-1 md:grid-cols-[160px_1fr] gap-5 items-start">
          {/* Avatar */}
          <div className="flex flex-col items-center gap-3">
            <div className="w-32 h-32 rounded-full bg-neutral-100 overflow-hidden ring-1 ring-neutral-200">
              {avatarPreview ? (
                <img src={avatarPreview} className="w-full h-full object-cover" alt="avatar" />
              ) : null}
            </div>
            <label className="text-sm px-3 py-1.5 rounded-md border bg-neutral-50 hover:bg-neutral-100 cursor-pointer">
              Upload photo
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={disabled}
                onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
              />
            </label>
          </div>

          {/* Fields */}
          <div className="grid gap-3">
            <div className="grid md:grid-cols-2 gap-3">
              <label className="text-sm">
                <span className="block mb-1 text-neutral-600">Nickname</span>
                <input
                  className="w-full rounded-md border px-3 py-2"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="Your display name"
                  disabled={disabled}
                />
              </label>
              <label className="text-sm">
                <span className="block mb-1 text-neutral-600">Phone</span>
                <input
                  className="w-full rounded-md border px-3 py-2"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g., 555-1234"
                  disabled={disabled}
                />
              </label>
            </div>

            <label className="text-sm">
              <span className="block mb-1 text-neutral-600">Bio</span>
              <textarea
                className="w-full min-h-[120px] rounded-md border px-3 py-2"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell riders a bit about you…"
                disabled={disabled}
              />
            </label>

            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={owns}
                onChange={(e) => setOwns(e.target.checked)}
                disabled={disabled}
              />
              I own a car
            </label>
          </div>
        </div>
      </div>

      {/* Card: Vehicle */}
      <div className="rounded-xl border border-neutral-200 bg-white p-5 md:p-6 shadow-sm">
        <h2 className="text-lg font-medium mb-4">My car</h2>
        <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-5 items-start">
          {/* Photo */}
          <div className="flex flex-col items-center gap-3">
            <div className="w-40 h-28 rounded-lg bg-neutral-100 overflow-hidden ring-1 ring-neutral-200">
              {vehiclePreview ? (
                <img src={vehiclePreview} className="w-full h-full object-cover" alt="vehicle" />
              ) : null}
            </div>
            <label className="text-sm px-3 py-1.5 rounded-md border bg-neutral-50 hover:bg-neutral-100 cursor-pointer">
              Choose image
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={disabled}
                onChange={(e) => setVPhoto(e.target.files?.[0] || null)}
              />
            </label>
          </div>

          {/* Fields */}
          <div className="grid gap-3">
            <div className="grid md:grid-cols-2 gap-3">
              <label className="text-sm">
                <span className="block mb-1 text-neutral-600">Car name</span>
                <input
                  className="w-full rounded-md border px-3 py-2"
                  value={vName}
                  onChange={(e) => setVName(e.target.value)}
                  placeholder="e.g., Corolla"
                  disabled={disabled}
                />
              </label>
              <label className="text-sm">
                <span className="block mb-1 text-neutral-600">Model / year</span>
                <input
                  className="w-full rounded-md border px-3 py-2"
                  value={vModel}
                  onChange={(e) => setVModel(e.target.value)}
                  placeholder="e.g., 2019"
                  disabled={disabled}
                />
              </label>
            </div>

            <label className="text-sm">
              <span className="block mb-1 text-neutral-600">License plate (optional)</span>
              <input
                className="w-full rounded-md border px-3 py-2"
                value={vPlate}
                onChange={(e) => setVPlate(e.target.value)}
                placeholder="Plate number"
                disabled={disabled}
              />
            </label>
          </div>
        </div>
      </div>

      {/* Sticky save bar */}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 flex justify-center">
        <div
          className={`pointer-events-auto flex items-center gap-3 rounded-full border px-4 py-2 shadow-md transition ${
            isDirty
              ? "bg-black text-white border-black"
              : "bg-white text-neutral-500 border-neutral-200"
          }`}
        >
          <span className="text-sm">
            {saving ? "Saving…" : isDirty ? "You have unsaved changes" : "All changes saved"}
          </span>
          <button
            onClick={saveAll}
            disabled={!isDirty || saving || !me}
            className="rounded-full bg-white/10 px-4 py-1.5 text-sm ring-1 ring-white/30 disabled:opacity-50"
          >
            Save changes
          </button>
        </div>
      </div>
    </div>
  );
}
