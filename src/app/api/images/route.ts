import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const images = await db.image.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        originalName: true,
        mimeType: true,
        size: true,
        width: true,
        height: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      images.map((img) => ({
        id: img.id,
        originalName: img.originalName,
        mimeType: img.mimeType,
        size: img.size,
        width: img.width,
        height: img.height,
        createdAt: img.createdAt,
        url: `/api/images/${img.id}/file`,
      }))
    );
  } catch (error) {
    console.error("Fetch images error:", error);
    return NextResponse.json(
      { error: "Failed to fetch images" },
      { status: 500 }
    );
  }
}