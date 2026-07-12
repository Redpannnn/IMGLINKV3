import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    database_url: process.env.DATABASE_URL ? "ADA" : "UNDEFINED",
    prefix: process.env.DATABASE_URL
      ? process.env.DATABASE_URL.substring(0, 25) + "..."
      : "undefined",
    node_env: process.env.NODE_ENV,
  });
}