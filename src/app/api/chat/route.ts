import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import Anthropic from "@anthropic-ai/sdk";
import { buildChatSystemPrompt } from "@/lib/prompts";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return new Response("Non autorisé", { status: 401 });

  const { message, sessionId, domaine, module: moduleName, modulesContext } = await req.json();

  if (!message || !sessionId) return new Response("Paramètres manquants", { status: 400 });

  const chatSession = await prisma.chatSession.findFirst({
    where: { id: sessionId, userId: session.user.id },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!chatSession) return new Response("Session introuvable", { status: 404 });

  await prisma.chatMessage.create({
    data: { role: "user", content: message, sessionId },
  });

  const history = chatSession.messages.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));
  history.push({ role: "user", content: message });

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  let fullResponse = "";

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const response = anthropic.messages.stream({
          model: "claude-opus-4-8",
          max_tokens: 2048,
          system: buildChatSystemPrompt(domaine ?? "Général", moduleName, modulesContext),
          messages: history,
        });

        for await (const chunk of response) {
          if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
            const text = chunk.delta.text;
            fullResponse += text;
            controller.enqueue(new TextEncoder().encode(text));
          }
        }
      } catch {
        controller.enqueue(new TextEncoder().encode("Désolé, une erreur s'est produite. Réessayez."));
      } finally {
        await prisma.chatMessage.create({
          data: { role: "assistant", content: fullResponse || "Erreur de génération", sessionId },
        });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "X-Content-Type-Options": "nosniff" },
  });
}
