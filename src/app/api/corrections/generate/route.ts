import { NextResponse } from "next/server";
import { auth } from "@/auth";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import type { CorrectionFormData } from "@/types/correction";

function buildTextPrompt(data: CorrectionFormData): string {
  const typeLabel = data.type === "copie" ? "copie d'examen" : "devoir/TP";
  const corrigeSection = data.corrigeType?.trim()
    ? `\n**Corrigé type de référence :**\n${data.corrigeType}\n`
    : "";
  const baremeSection = data.bareme?.trim()
    ? `\n**Barème :**\n${data.bareme}\n`
    : "";
  const stagiaire = data.nomStagiaire?.trim() ? data.nomStagiaire : "le stagiaire";

  return `Tu es un formateur expert OFPPT spécialisé en correction pédagogique. Corrige la ${typeLabel} suivante avec précision et bienveillance.

**Contexte :**
- Filière : ${data.filiere}
- Module : ${data.module}
- Type : ${typeLabel}
${baremeSection}${corrigeSection}
**Copie à corriger :**
${data.copieEtudiant}

**Instructions :**
- Attribue une note précise sur 20
- Analyse chaque question ou partie de la copie
- Identifie les erreurs, les points forts et les lacunes
- Rédige un feedback personnalisé et encourageant adressé à ${stagiaire}
- Sois pédagogique : explique pourquoi c'est juste ou faux, pas seulement la correction

**Format de sortie attendu (Markdown) :**

# Rapport de correction — ${data.module}

## Note obtenue
**XX / 20**
(Justification en 1-2 phrases)

## Analyse détaillée
(Pour chaque question/partie : ce qui est juste ✓, ce qui est faux ✗, la correction attendue)

### Question 1 — ...
- **Réponse du stagiaire :** ...
- **Évaluation :** ✓ / ✗ / Partiel
- **Correction :** ...
- **Points attribués :** X/Y

(Répète pour chaque question)

## Points forts
(Liste des éléments bien maîtrisés)

## Axes d'amélioration
(Liste des notions à retravailler avec des conseils concrets)

## Feedback personnalisé
(Message bienveillant et motivant adressé directement à ${stagiaire}, en « tu » ou « vous », qui valorise les efforts et oriente vers la progression)

Génère un rapport complet, précis et directement utilisable par le formateur.`;
}

function buildFilePrompt(data: CorrectionFormData): string {
  const typeLabel = data.type === "copie" ? "copie d'examen" : "devoir/TP";
  const corrigeSection = data.corrigeType?.trim()
    ? `\n**Corrigé type de référence :**\n${data.corrigeType}\n`
    : "";
  const baremeSection = data.bareme?.trim()
    ? `\n**Barème :**\n${data.bareme}\n`
    : "";
  const stagiaire = data.nomStagiaire?.trim() ? data.nomStagiaire : "le stagiaire";

  return `Tu es un formateur expert OFPPT spécialisé en correction pédagogique. Corrige la ${typeLabel} ci-jointe avec précision et bienveillance.

**Contexte :**
- Filière : ${data.filiere}
- Module : ${data.module}
- Type : ${typeLabel}
${baremeSection}${corrigeSection}
**Instructions :**
- Lis attentivement le contenu de la copie (image ou PDF joint)
- Attribue une note précise sur 20
- Analyse chaque question ou partie de la copie
- Identifie les erreurs, les points forts et les lacunes
- Rédige un feedback personnalisé et encourageant adressé à ${stagiaire}
- Sois pédagogique : explique pourquoi c'est juste ou faux, pas seulement la correction

**Format de sortie attendu (Markdown) :**

# Rapport de correction — ${data.module}

## Note obtenue
**XX / 20**
(Justification en 1-2 phrases)

## Analyse détaillée
(Pour chaque question/partie : ce qui est juste ✓, ce qui est faux ✗, la correction attendue)

### Question 1 — ...
- **Réponse du stagiaire :** ...
- **Évaluation :** ✓ / ✗ / Partiel
- **Correction :** ...
- **Points attribués :** X/Y

(Répète pour chaque question)

## Points forts
(Liste des éléments bien maîtrisés)

## Axes d'amélioration
(Liste des notions à retravailler avec des conseils concrets)

## Feedback personnalisé
(Message bienveillant et motivant adressé directement à ${stagiaire}, en « tu » ou « vous », qui valorise les efforts et oriente vers la progression)

Génère un rapport complet, précis et directement utilisable par le formateur.`;
}

type AnthropicContent =
  | { type: "text"; text: string }
  | { type: "image"; source: { type: "base64"; media_type: string; data: string } }
  | { type: "document"; source: { type: "base64"; media_type: "application/pdf"; data: string } };

function buildAnthropicContent(data: CorrectionFormData): AnthropicContent[] {
  const isFile = data.inputMode === "image" || data.inputMode === "pdf";

  if (!isFile || !data.fichierBase64 || !data.fichierMimeType) {
    return [{ type: "text", text: buildTextPrompt(data) }];
  }

  const promptText = buildFilePrompt(data);

  if (data.inputMode === "image") {
    return [
      {
        type: "image",
        source: { type: "base64", media_type: data.fichierMimeType, data: data.fichierBase64 },
      },
      { type: "text", text: promptText },
    ];
  }

  // PDF
  return [
    {
      type: "document",
      source: { type: "base64", media_type: "application/pdf", data: data.fichierBase64 },
    },
    { type: "text", text: promptText },
  ];
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const data: CorrectionFormData = await req.json();

  const isFileMode = data.inputMode === "image" || data.inputMode === "pdf";
  const hasFile = isFileMode && !!data.fichierBase64;
  const hasText = !isFileMode && data.copieEtudiant?.trim();

  if (!data.filiere || !data.module || (!hasFile && !hasText)) {
    return NextResponse.json(
      { error: "Paramètres manquants (filière, module, copie)" },
      { status: 400 }
    );
  }

  const content = buildAnthropicContent(data);
  let contenu = "";

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const msg = await anthropic.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 5000,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      messages: [{ role: "user", content: content as any }],
    });
    const block = msg.content[0];
    contenu = block.type === "text" ? block.text : "";
  } catch {
    // Fallback OpenAI : texte uniquement (OpenAI ne reçoit pas le fichier)
    try {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const textPrompt = isFileMode
        ? buildFilePrompt(data) + "\n\n⚠️ Note : le fichier n'a pu être transmis au modèle de secours. Indique que la copie était illisible et invite le formateur à réessayer avec Claude."
        : buildTextPrompt(data);
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: textPrompt }],
        max_tokens: 5000,
      });
      contenu = completion.choices[0].message.content ?? "";
    } catch {
      return NextResponse.json({ error: "Les deux services IA sont indisponibles" }, { status: 503 });
    }
  }

  return NextResponse.json({ contenu });
}
