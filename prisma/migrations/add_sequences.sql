-- Migration: Ajout du niveau Séquence au référentiel pédagogique
-- Additif et non destructif : nouvelle table "Sequence" + colonne nullable "Competence.sequenceId".
-- Hiérarchie : RefModule → Sequence → Competence (Competence.moduleId reste requis).

CREATE TABLE IF NOT EXISTS "Sequence" (
  "id"        TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "titre"     TEXT NOT NULL,
  "code"      TEXT,
  "ordre"     INTEGER,
  "moduleId"  TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Sequence_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Sequence_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "RefModule"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "Sequence_moduleId_idx" ON "Sequence"("moduleId");

ALTER TABLE "Competence" ADD COLUMN IF NOT EXISTS "sequenceId" TEXT;

-- La FK n'est créée que si elle n'existe pas déjà (Postgres n'a pas de IF NOT EXISTS sur ADD CONSTRAINT).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Competence_sequenceId_fkey'
  ) THEN
    ALTER TABLE "Competence"
      ADD CONSTRAINT "Competence_sequenceId_fkey"
      FOREIGN KEY ("sequenceId") REFERENCES "Sequence"("id") ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "Competence_sequenceId_idx" ON "Competence"("sequenceId");
