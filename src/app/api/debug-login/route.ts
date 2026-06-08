import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function GET() {
  try {
    const user = await prisma.user.findUnique({
      where: { email: "ezzouhir2122@gmail.com" },
    });

    if (!user) {
      return NextResponse.json({ status: "USER_NOT_FOUND" });
    }

    const passwordMatch = await bcrypt.compare("ofppt2024", user.password);
    const hashPreview = user.password.substring(0, 15);

    return NextResponse.json({
      status: "OK",
      userFound: true,
      passwordMatch,
      hashPreview,
      dbUrl: process.env.DATABASE_URL?.substring(0, 40) + "...",
    });
  } catch (err) {
    return NextResponse.json({
      status: "ERROR",
      error: String(err),
      dbUrl: process.env.DATABASE_URL?.substring(0, 40) + "...",
    });
  }
}
