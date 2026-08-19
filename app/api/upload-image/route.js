import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { getCurrentUser } from "../../../lib/session";

// Images are written to ./data/uploads, the same directory that holds
// app.db — that path is backed by the Railway volume, so files persist
// across deploys without ever touching git. This exists specifically so
// test/demo images for TikTok's PULL_FROM_URL photo posting don't need
// to be committed to the (public) repo.

const ALLOWED_TYPES = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};
const MAX_BYTES = 10 * 1024 * 1024; // 10MB

export async function POST(req) {
  const user = getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  const form = await req.formData();
  const file = form.get("file");

  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const ext = ALLOWED_TYPES[file.type];
  if (!ext) {
    return NextResponse.json(
      { error: "Only JPEG, PNG, or WEBP images are allowed (TikTok also rejects PNG for photo posts — use JPEG or WEBP for TikTok specifically)." },
      { status: 400 }
    );
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });
  }

  const uploadsDir = path.join(process.cwd(), "data", "uploads");
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

  const filename = `${crypto.randomBytes(16).toString("hex")}${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(path.join(uploadsDir, filename), buffer);

  return NextResponse.json({ url: `/api/images/${filename}` });
}
