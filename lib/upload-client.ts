"use client";

/**
 * Uploads a file to /api/upload and returns the opaque storage key.
 * Only "aadhaar" is used today — the old "screenshots" (manual UPI payment
 * proof) folder was removed when the booking flow switched fully to
 * Razorpay, which verifies payment server-side instead of relying on a
 * user-submitted screenshot.
 */
export async function uploadFile(file: File, folder: "aadhaar"): Promise<string> {
  const form = new FormData();
  form.append("folder", folder);
  form.append("file", file);
  const res = await fetch("/api/upload", { method: "POST", body: form });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "Upload failed");
  }
  const data = await res.json();
  return data.key as string;
}
