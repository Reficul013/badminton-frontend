// Firebase Storage helpers
import { getApp } from "firebase/app";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { idToken } from "./auth";

// Make sure your firebase app is initialized in src/lib/firebase.js
let storage;
function s() {
  if (!storage) storage = getStorage(getApp());
  return storage;
}

function extFromName(name = "") {
  const dot = name.lastIndexOf(".");
  return dot > -1 ? name.slice(dot + 1).toLowerCase() : "jpg";
}

export async function uploadAvatar(file, userId) {
  // Ensure user is authed (matches your storage rules)
  await idToken();
  const ext = extFromName(file.name);
  const key = `avatars/${userId}-${Date.now()}.${ext}`;
  const snap = await uploadBytes(ref(s(), key), file, { contentType: file.type });
  return await getDownloadURL(snap.ref);
}

export async function uploadVehiclePhoto(file, userId) {
  await idToken();
  const ext = extFromName(file.name);
  const key = `vehicle_photos/${userId}-${Date.now()}.${ext}`;
  const snap = await uploadBytes(ref(s(), key), file, { contentType: file.type });
  return await getDownloadURL(snap.ref);
}
