import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";

/**
 * Server-side file upload, replacing the old Netlify Function
 * (reference-netlify-functions/functions/upload-file.js) which used
 * Netlify Blobs. This ports the same folder allowlist + 15MB cap logic,
 * but stores into a private Supabase Storage bucket ("assam-uploads")
 * using the service-role key — never exposed to the browser.
 *
 * Accepts multipart/form-data: fields `folder` ("screenshots" | "aadhaar")
 * and `file`. Returns { key } — an opaque storage path, not a public URL.
 * Files are served back only via the authenticated GET /api/files/[key]
 * route (see app/api/files/[...key]/route.ts).
 */

const MAX_BYTES = 15 * 1024 * 1024; // 15MB
const ALLOWED_FOLDERS = new Set(["screenshots", "aadhaar"]);

export async function POST(req: NextRequest) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const folder = form.get("folder");
  const file = form.get("file");

  if (typeof folder !== "string" || !ALLOWED_FOLDERS.has(folder)) {
    return NextResponse.json({ error: "Invalid or missing folder" }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File too large (max 15MB)" }, { status: 413 });
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9_.-]/g, "_");
  const key = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2, 9)}_${safeName}`;

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const sb = supabaseAdmin();
    const { error } = await sb.storage.from("assam-uploads").upload(key, buffer, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });
    if (error) {
      return NextResponse.json({ error: "Upload failed: " + error.message }, { status: 500 });
    }
    return NextResponse.json({ key });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: "Upload failed: " + message }, { status: 500 });
  }
}
