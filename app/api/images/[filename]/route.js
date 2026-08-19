import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";

// Serves files written by /api/upload-image. Deliberately public/unauthenticated
// — TikTok's servers must be able to fetch this URL directly for
// PULL_FROM_URL photo posting, so it can't sit behind a login check.

const CONTENT_TYPES = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

export async function GET(req, { params }) {
  const filename = params.filename;

  // Reject anything with path separators or traversal attempts —
  // filename should always be the plain hex-name+ext we generated in
  // /api/upload-image, never a nested path.
  if (!filename || filename.includes("/") || filename.includes("..")) {
    return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
  }

  const ext = path.extname(filename).toLowerCase();
  const contentType = CONTENT_TYPES[ext];
  if (!contentType) {
    return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
  }

  const filePath = path.join(process.cwd(), "data", "uploads", filename);
  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const buffer = fs.readFileSync(filePath);
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
