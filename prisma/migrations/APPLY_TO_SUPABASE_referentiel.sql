-- ============================================================
-- À EXÉCUTER UNE SEULE FOIS dans Supabase > SQL Editor
-- Crée les tables du référentiel pédagogique OFPPT
-- Toutes les instructions utilisent IF NOT EXISTS (idempotent)
-- ============================================================

-- 1. Secteur (= Filière niveau 1)
CREATE TABLE IF NOT EXISTS "Secteur" (
  "id"        TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "nom"       TEXT NOT NULL,
  "code"      TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Secteur_pkey" PRIMARY KEY ("id")
);

-- 2. Filiere (= Niveau de formation)
CREATE TABLE IF NOT EXISTS "Filiere" (
  "id"        TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "nom"       TEXT NOT NULL,
  "code"      TEXT,
  "secteurId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Filiere_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Filiere_secteurId_fkey" FOREIGN KEY ("secteurId") REFERENCES "Secteur"("id") ON DELETE CASCADE
);

-- 3. RefModule
CREATE TABLE IF NOT EXISTS "RefModule" (
  "id"        TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "nom"       TEXT NOT NULL,
  "code"      TEXT,
  "mhg"       INTEGER,
  "filiereId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RefModule_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RefModule_filiereId_fkey" FOREIGN KEY ("filiereId") REFERENCES "Filiere"("id") ON DELETE CASCADE
);

-- 4. Competence
CREATE TABLE IF NOT EXISTS "Competence" (
  "id"         TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "titre"      TEXT NOT NULL,
  "moduleId"   TEXT NOT NULL,
  "sequenceId" TEXT,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Competence_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Competence_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "RefModule"("id") ON DELETE CASCADE
);

-- 5. Sequence (optionnel, niveau entre module et compétence)
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

-- 6. Objectif
CREATE TABLE IF NOT EXISTS "Objectif" (
  "id"           TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "titre"        TEXT NOT NULL,
  "competenceId" TEXT NOT NULL,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Objectif_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Objectif_competenceId_fkey" FOREIGN KEY ("competenceId") REFERENCES "Competence"("id") ON DELETE CASCADE
);

-- 7. CriterePerformance
CREATE TABLE IF NOT EXISTS "CriterePerformance" (
  "id"          TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "description" TEXT NOT NULL,
  "objectifId"  TEXT NOT NULL,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CriterePerformance_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CriterePerformance_objectifId_fkey" FOREIGN KEY ("objectifId") REFERENCES "Objectif"("id") ON DELETE CASCADE
);

-- 8. FK Competence → Sequence (ajout si absent)
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

-- 9. GroupeCompetence (suivi compétences par groupe)
CREATE TABLE IF NOT EXISTS "GroupeCompetence" (
  "id"           TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "groupeId"     TEXT NOT NULL,
  "competenceId" TEXT NOT NULL,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GroupeCompetence_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'GroupeCompetence_groupeId_fkey') THEN
    ALTER TABLE "GroupeCompetence"
      ADD CONSTRAINT "GroupeCompetence_groupeId_fkey"
      FOREIGN KEY ("groupeId") REFERENCES "Groupe"("id") ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'GroupeCompetence_competenceId_fkey') THEN
    ALTER TABLE "GroupeCompetence"
      ADD CONSTRAINT "GroupeCompetence_competenceId_fkey"
      FOREIGN KEY ("competenceId") REFERENCES "Competence"("id") ON DELETE CASCADE;
  END IF;
END $$;

-- 10. Index
CREATE INDEX IF NOT EXISTS "Sequence_moduleId_idx"        ON "Sequence"("moduleId");
CREATE INDEX IF NOT EXISTS "Competence_sequenceId_idx"    ON "Competence"("sequenceId");
CREATE INDEX IF NOT EXISTS "GroupeCompetence_groupeId_idx" ON "GroupeCompetence"("groupeId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'GroupeCompetence_groupeId_competenceId_key'
  ) THEN
    CREATE UNIQUE INDEX "GroupeCompetence_groupeId_competenceId_key"
      ON "GroupeCompetence"("groupeId", "competenceId");
  END IF;
END $$;
