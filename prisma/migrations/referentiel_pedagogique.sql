-- Migration: Référentiel Pédagogique OFPPT
-- Tables: Secteur, Filiere, RefModule, Competence, Objectif, CriterePerformance

CREATE TABLE IF NOT EXISTS "Secteur" (
  "id"        TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "nom"       TEXT NOT NULL,
  "code"      TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Secteur_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Filiere" (
  "id"        TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "nom"       TEXT NOT NULL,
  "code"      TEXT,
  "secteurId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Filiere_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Filiere_secteurId_fkey" FOREIGN KEY ("secteurId") REFERENCES "Secteur"("id") ON DELETE CASCADE
);

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

CREATE TABLE IF NOT EXISTS "Competence" (
  "id"        TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "titre"     TEXT NOT NULL,
  "moduleId"  TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Competence_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Competence_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "RefModule"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "Objectif" (
  "id"           TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "titre"        TEXT NOT NULL,
  "competenceId" TEXT NOT NULL,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Objectif_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Objectif_competenceId_fkey" FOREIGN KEY ("competenceId") REFERENCES "Competence"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "CriterePerformance" (
  "id"          TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "description" TEXT NOT NULL,
  "objectifId"  TEXT NOT NULL,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CriterePerformance_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CriterePerformance_objectifId_fkey" FOREIGN KEY ("objectifId") REFERENCES "Objectif"("id") ON DELETE CASCADE
);
