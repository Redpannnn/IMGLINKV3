import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import sharp from "sharp";

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

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Video: accept any "video/*" mime type (mp4, webm, mov, mkv, avi, etc.)
    const isVideo = file.type.startsWith("video/");
    const isImage = IMAGE_TYPES.includes(file.type);

    if (!isImage && !isVideo) {
      return NextResponse.json(
        { error: "File type not supported. Only images and videos are allowed." },
        { status: 400 }
      );
    }

    const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
    if (file.size > maxSize) {
      return NextResponse.json(
        {
          error: `File too large. Maximum size is ${
            isVideo ? "50MB" : "10MB"
          } for ${isVideo ? "video" : "image"}`,
        },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Get image dimensions using sharp (images only, videos are skipped)
    let width: number | null = null;
    let height: number | null = null;
    if (!isVideo) {
      try {
        const metadata = await sharp(buffer).metadata();
        width = metadata.width ?? null;
        height = metadata.height ?? null;
      } catch {
        // SVG or other formats may not have sharp support
      }
    }

    // Save to database (file data stored as BLOB)
    const image = await db.image.create({
      data: {
        originalName: file.name,
        mimeType: file.type,
        size: file.size,
        width,
        height,
        data: buffer,
      },
    });

    return NextResponse.json({
      id: image.id,
      originalName: image.originalName,
      mimeType: image.mimeType,
      size: image.size,
      width: image.width,
      height: image.height,
      createdAt: image.createdAt,
      url: `/api/images/${image.id}/file`,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}
