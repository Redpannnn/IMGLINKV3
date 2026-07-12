import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { createClient } from "@libsql/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";

export async function GET() {
  const dbUrl = process.env.DATABASE_URL || "";

  try {
    const libsql = createClient({ url: dbUrl });
    const adapter = new PrismaLibSQL(libsql);
    const prisma = new PrismaClient({ adapter });
    const count = await prisma.image.count();

    return NextResponse.json({
      status: "OK",
      prefix: dbUrl.substring(0, 30),
      image_count: count,
    });
  } catch (error: any) {
    return NextResponse.json({
      status: "ERROR",
      prefix: dbUrl.substring(0, 30),
      error: error.message,
      code: error.code,
    });
  }
}