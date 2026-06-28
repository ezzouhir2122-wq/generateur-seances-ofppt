import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  const session = await auth();
  const { provider, apiKey, model } = (await req.json()) as {
    provider: string;
    apiKey?: string;
    model?: string;
  };

  // If no key passed (or masked), fetch stored key from DB
  let key = apiKey && !apiKey.includes("•") ? apiKey.trim() : null;

  if (!key && session?.user?.id) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        claudeApiKey: true,
        openaiApiKey: true,
        googleApiKey: true,
        openrouterApiKey: true,
        grokApiKey: true,
        glmApiKey: true,
      },
    });
    if (provider === "anthropic")  key = user?.claudeApiKey ?? null;
    if (provider === "openai")     key = user?.openaiApiKey ?? null;
    if (provider === "google")     key = user?.googleApiKey ?? null;
    if (provider === "openrouter") key = user?.openrouterApiKey ?? null;
    if (provider === "xai")        key = user?.grokApiKey ?? null;
    if (provider === "zhipu")      key = user?.glmApiKey ?? null;
  }

  if (!key) {
    return NextResponse.json({ message: "Clé API manquante — saisissez ou sauvegardez une clé." }, { status: 400 });
  }

  try {
    if (provider === "anthropic") {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": key,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: model || "claude-haiku-4-5-20251001",
          max_tokens: 1,
          messages: [{ role: "user", content: "hi" }],
        }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({})) as { error?: { message?: string } };
        return NextResponse.json({ message: e?.error?.message ?? "Clé Anthropic invalide" }, { status: 400 });
      }
      return NextResponse.json({ message: "✓ Connexion Anthropic réussie" });
    }

    if (provider === "openai") {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: model || "gpt-4o-mini",
          max_tokens: 1,
          messages: [{ role: "user", content: "hi" }],
        }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({})) as { error?: { message?: string } };
        return NextResponse.json({ message: e?.error?.message ?? "Clé OpenAI invalide" }, { status: 400 });
      }
      return NextResponse.json({ message: "✓ Connexion OpenAI réussie" });
    }

    if (provider === "google") {
      const testModel = model || "gemini-2.0-flash";
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${testModel}:generateContent?key=${key}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: "hi" }] }],
            generationConfig: { maxOutputTokens: 1 },
          }),
        }
      );
      if (!res.ok) {
        const e = await res.json().catch(() => ({})) as { error?: { message?: string } };
        return NextResponse.json({ message: e?.error?.message ?? "Clé Google AI invalide" }, { status: 400 });
      }
      return NextResponse.json({ message: "✓ Connexion Google AI réussie" });
    }

    if (provider === "openrouter") {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: model || "openrouter/meta-llama/llama-4-maverick",
          max_tokens: 1,
          messages: [{ role: "user", content: "hi" }],
        }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({})) as { error?: { message?: string } };
        return NextResponse.json({ message: e?.error?.message ?? "Clé OpenRouter invalide" }, { status: 400 });
      }
      return NextResponse.json({ message: "✓ Connexion OpenRouter réussie" });
    }

    if (provider === "xai") {
      const res = await fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: model || "grok-3",
          max_tokens: 1,
          messages: [{ role: "user", content: "hi" }],
        }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({})) as { error?: { message?: string } };
        return NextResponse.json({ message: e?.error?.message ?? "Clé xAI invalide" }, { status: 400 });
      }
      return NextResponse.json({ message: "✓ Connexion xAI (Grok) réussie" });
    }

    if (provider === "zhipu") {
      const res = await fetch("https://open.bigmodel.cn/api/paie/v4/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: model || "glm-4-flash",
          max_tokens: 1,
          messages: [{ role: "user", content: "hi" }],
        }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({})) as { error?: { message?: string } };
        return NextResponse.json({ message: e?.error?.message ?? "Clé Zhipu AI (GLM) invalide" }, { status: 400 });
      }
      return NextResponse.json({ message: "✓ Connexion Zhipu AI (GLM) réussie" });
    }

    return NextResponse.json({ message: "Fournisseur inconnu" }, { status: 400 });
  } catch {
    return NextResponse.json({ message: "Erreur réseau lors du test" }, { status: 500 });
  }
}
