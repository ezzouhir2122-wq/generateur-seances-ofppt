import { prisma } from "@/lib/db";

/**
 * Résolution des clés IA — STRICTEMENT par formateur.
 *
 * Il n'y a volontairement AUCUN repli sur les clés serveur (process.env.*) :
 * sinon tout formateur nouvellement approuvé génère avec la clé — et sur le
 * quota — du propriétaire de l'instance. Chaque compte doit configurer sa
 * propre clé dans Paramètres → Clés API & Modèle IA.
 */

export type Provider =
  | "claude" | "openai" | "openrouter" | "google" | "grok" | "glm" | "mistral";

const FIELD: Record<Provider, string> = {
  claude: "claudeApiKey",
  openai: "openaiApiKey",
  openrouter: "openrouterApiKey",
  google: "googleApiKey",
  grok: "grokApiKey",
  glm: "glmApiKey",
  mistral: "mistralApiKey",
};

const LABEL: Record<Provider, string> = {
  claude: "Anthropic (Claude)",
  openai: "OpenAI (GPT)",
  openrouter: "OpenRouter",
  google: "Google (Gemini)",
  grok: "xAI (Grok)",
  glm: "Zhipu AI (GLM)",
  mistral: "Mistral",
};

export type UserAiKeys = Partial<Record<Provider, string>> & { preferredModel: string };

/** Charge les clés du formateur. Ne retourne jamais de clé serveur. */
export async function getUserAiKeys(userId: string): Promise<UserAiKeys> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      claudeApiKey: true, openaiApiKey: true, openrouterApiKey: true,
      googleApiKey: true, grokApiKey: true, glmApiKey: true,
      mistralApiKey: true, preferredModel: true,
    },
  });
  return {
    claude: u?.claudeApiKey ?? undefined,
    openai: u?.openaiApiKey ?? undefined,
    openrouter: u?.openrouterApiKey ?? undefined,
    google: u?.googleApiKey ?? undefined,
    grok: u?.grokApiKey ?? undefined,
    glm: u?.glmApiKey ?? undefined,
    mistral: u?.mistralApiKey ?? undefined,
    preferredModel: u?.preferredModel ?? "claude-sonnet-4-6",
  };
}

/** Message d'erreur uniforme renvoyé quand aucune clé n'est configurée. */
export function missingKeyError(...providers: Provider[]) {
  const noms = providers.map((p) => LABEL[p]).join(" ou ");
  return {
    error: `Aucune clé API configurée pour ${noms}. Ouvrez Paramètres → Clés API & Modèle IA et enregistrez votre propre clé.`,
    code: "NO_API_KEY",
    settingsUrl: "/parametres?tab=api",
  };
}

export { FIELD as API_KEY_FIELDS, LABEL as PROVIDER_LABELS };
