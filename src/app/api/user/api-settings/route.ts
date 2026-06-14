import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { claudeApiKey: true, openaiApiKey: true, preferredModel: true },
  });

  return NextResponse.json({
    claudeApiKey: user?.claudeApiKey ? maskKey(user.claudeApiKey) : "",
    openaiApiKey: user?.openaiApiKey ? maskKey(user.openaiApiKey) : "",
    preferredModel: user?.preferredModel ?? "claude-sonnet-4-6",
    hasClaudeKey: !!user?.claudeApiKey,
    hasOpenaiKey: !!user?.openaiApiKey,
  });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const body = await req.json();
  const { claudeApiKey, openaiApiKey, preferredModel } = body as {
    claudeApiKey?: string;
    openaiApiKey?: string;
    preferredModel?: string;
  };

  const data: Record<string, string | null> = {};
  if (preferredModel !== undefined) data.preferredModel = preferredModel;
  // Only update key if non-empty and not a masked value
  if (claudeApiKey !== undefined && claudeApiKey !== "" && !claudeApiKey.includes("•")) {
    data.claudeApiKey = claudeApiKey.trim();
  }
  if (openaiApiKey !== undefined && openaiApiKey !== "" && !openaiApiKey.includes("•")) {
    data.openaiApiKey = openaiApiKey.trim();
  }
  // Allow explicit clear
  if (claudeApiKey === "") data.claudeApiKey = null;
  if (openaiApiKey === "") data.openaiApiKey = null;

  await prisma.user.update({ where: { id: session.user.id }, data });

  return NextResponse.json({ ok: true });
}

function maskKey(key: string): string {
  if (key.length <= 8) return "••••••••";
  return key.slice(0, 6) + "•".repeat(Math.min(key.length - 8, 20)) + key.slice(-4);
}
