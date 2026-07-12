import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const count = await db.image.count();
    return NextResponse.json({
      status: "OK",
      database_url: process.env.DATABASE_URL ? "ADA" : "UNDEFINED",
      image_count: count,
    });
  } catch (error: any) {
    return NextResponse.json({
      status: "ERROR",
      database_url: process.env.DATABASE_URL ? "ADA" : "UNDEFINED",
      error: error.message,
      code: error.code,
    });
  }
}