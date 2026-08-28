import { NextResponse } from "next/server";
import { auth } from "@/auth";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import type { CorrectionFormData } from "@/types/correction";

function buildCorrectionPrompt(data: CorrectionFormData): string {
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

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const data: CorrectionFormData = await req.json();

  if (!data.filiere || !data.module || !data.copieEtudiant?.trim()) {
    return NextResponse.json({ error: "Paramètres manquants (filière, module, copie)" }, { status: 400 });
  }

  const prompt = buildCorrectionPrompt(data);
  let contenu = "";

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const msg = await anthropic.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 5000,
      messages: [{ role: "user", content: prompt }],
    });
    const block = msg.content[0];
    contenu = block.type === "text" ? block.text : "";
  } catch {
    try {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 5000,
      });
      contenu = completion.choices[0].message.content ?? "";
    } catch {
      return NextResponse.json({ error: "Les deux services IA sont indisponibles" }, { status: 503 });
    }
  }

  return NextResponse.json({ contenu });
}
