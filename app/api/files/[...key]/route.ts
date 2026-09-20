import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { auth } from "@/lib/auth";

/**
 * Authenticated file download, replacing the old Netlify Function
 * (reference-netlify-functions/functions/get-file.js). Aadhaar images and
 * payment screenshots are sensitive — this route requires an authenticated
 * admin session (checked here explicitly, since this path is not under
 * /api/admin and so isn't covered by the proxy.ts matcher).
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ key: string[] }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { key: keyParts } = await params;
  const key = keyParts.join("/");
  if (!key) {
    return NextResponse.json({ error: "Missing key" }, { status: 400 });
  }

  const sb = supabaseAdmin();
  const { data, error } = await sb.storage.from("assam-uploads").download(key);
  if (error || !data) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const arrayBuffer = await data.arrayBuffer();
  return new NextResponse(arrayBuffer, {
    status: 200,
    headers: {
      "Content-Type": data.type || "application/octet-stream",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
