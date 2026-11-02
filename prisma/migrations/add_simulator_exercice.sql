-- Exercices chiffrés à saisie libre dans le Competencia Simulator
-- Additif et non destructif : widening (NOT NULL -> nullable) + nouvelles colonnes nullables.

-- RunEvent : les choix deviennent optionnels (un événement peut être un exercice sans QCM)
ALTER TABLE "RunEvent" ALTER COLUMN "choixA" DROP NOT NULL;
ALTER TABLE "RunEvent" ALTER COLUMN "choixB" DROP NOT NULL;
ALTER TABLE "RunEvent" ALTER COLUMN "choixC" DROP NOT NULL;
-- RunEvent : définition de l'exercice chiffré (énoncé, réponse attendue, tolérance, impacts...)
ALTER TABLE "RunEvent" ADD COLUMN IF NOT EXISTS "exercice" JSONB;

-- RunDecision : réponse saisie par le stagiaire et résultat de la validation
ALTER TABLE "RunDecision" ADD COLUMN IF NOT EXISTS "reponseSaisie" TEXT;
ALTER TABLE "RunDecision" ADD COLUMN IF NOT EXISTS "correct" BOOLEAN;
