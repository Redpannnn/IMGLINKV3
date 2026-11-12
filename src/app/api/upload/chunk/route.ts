import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

const MAX_CHUNK_SIZE = 6 * 1024 * 1024; // hard safety cap per request

// Handles chunked uploads:
//   POST /api/upload/chunk?sessionId=X&index=N  -> append chunk N (raw body)
//   POST /api/upload/chunk?sessionId=X&done=1   -> join chunks & save to Image
//   DELETE /api/upload/chunk?sessionId=X        -> abort & cleanup
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");
    const done = searchParams.get("done") === "1";

    if (!sessionId) {
      return NextResponse.json(
        { error: "sessionId is required" },
        { status: 400 }
      );
    }

    if (!done) {
      const index = parseInt(searchParams.get("index") ?? "", 10);
      if (!Number.isInteger(index) || index < 0) {
        return NextResponse.json(
          { error: "Invalid chunk index" },
          { status: 400 }
        );
      }

      const bytes = await request.arrayBuffer();
      if (bytes.byteLength === 0) {
        return NextResponse.json({ error: "Empty chunk" }, { status: 400 });
      }
      if (bytes.byteLength > MAX_CHUNK_SIZE) {
        return NextResponse.json({ error: "Chunk too large" }, { status: 413 });
      }

      await db.upload.insertChunk({
        sessionId,
        index,
        data: Buffer.from(bytes),
      });
      return NextResponse.json({ ok: true });
    }

    const image = await db.upload.finalize({ sessionId });
    if (!image) {
      return NextResponse.json(
        { error: "Upload session not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(image);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Chunk upload failed";
    console.error("Chunk upload error:", message);

    const known =
      message.includes("not found") ||
      message.includes("exceed") ||
      message.includes("mismatch") ||
      message.includes("No chunks");
    return NextResponse.json(
      { error: known ? message : "Failed to process chunk" },
      { status: known ? 400 : 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const sessionId = new URL(request.url).searchParams.get("sessionId");
    if (sessionId) {
      await db.upload.cancel({ sessionId });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
