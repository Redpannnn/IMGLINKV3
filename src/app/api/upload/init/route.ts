import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { db } from "@/lib/db";

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB
const IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "image/bmp",
  "image/tiff",
  "image/avif",
];

// Starts a chunked upload session for files larger than the platform
// request-body limit (Netlify/Vercel cap single requests at ~4.5-6MB).
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const originalName =
      typeof body.originalName === "string" ? body.originalName : "";
    const mimeType = typeof body.mimeType === "string" ? body.mimeType : "";
    const size = typeof body.size === "number" ? Math.floor(body.size) : NaN;

    if (!originalName || !mimeType || !Number.isFinite(size) || size <= 0) {
      return NextResponse.json(
        { error: "Invalid upload metadata" },
        { status: 400 }
      );
    }

    const isVideo = mimeType.startsWith("video/");
    const isImage = IMAGE_TYPES.includes(mimeType);

    if (!isImage && !isVideo) {
      return NextResponse.json(
        { error: "File type not supported. Only images and videos are allowed." },
        { status: 400 }
      );
    }

    const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
    if (size > maxSize) {
      return NextResponse.json(
        {
          error: `File too large. Maximum size is ${
            isVideo ? "50MB" : "10MB"
          } for ${isVideo ? "video" : "image"}`,
        },
        { status: 400 }
      );
    }

    const sessionId = randomUUID();
    await db.upload.createSession({
      data: { id: sessionId, originalName, mimeType, size },
    });

    return NextResponse.json({ sessionId, chunkSize: 4 * 1024 * 1024 });
  } catch (error) {
    console.error("Upload init error:", error);
    return NextResponse.json(
      { error: "Failed to initialize upload" },
      { status: 500 }
    );
  }
}
