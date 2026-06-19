-- ============================================================
-- MIGRATION : Suppression du modèle Secteur
-- À exécuter DANS CET ORDRE dans Supabase > SQL Editor
-- Toutes les étapes sont idempotentes (IF EXISTS / IF NOT EXISTS)
-- ============================================================

-- Étape 1 : Ajouter la colonne "filiere" à la table Filiere (si absente)
ALTER TABLE "Filiere" ADD COLUMN IF NOT EXISTS "filiere" TEXT;

-- Étape 2 : Copier Secteur.nom → Filiere.filiere pour les données existantes
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'Secteur'
  ) THEN
    UPDATE "Filiere" f
    SET "filiere" = s.nom
    FROM "Secteur" s
    WHERE f."secteurId" = s.id
      AND f."filiere" IS NULL;
  END IF;
END $$;

-- Étape 3 : Supprimer la contrainte FK Filiere → Secteur (si existante)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Filiere_secteurId_fkey') THEN
    ALTER TABLE "Filiere" DROP CONSTRAINT "Filiere_secteurId_fkey";
  END IF;
END $$;

-- Étape 4 : Supprimer la colonne secteurId de Filiere (si existante)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Filiere' AND column_name = 'secteurId'
  ) THEN
    ALTER TABLE "Filiere" DROP COLUMN "secteurId";
  END IF;
END $$;

-- Étape 5 : Supprimer la table Secteur (CASCADE supprime FK restantes)
DROP TABLE IF EXISTS "Secteur" CASCADE;

-- Étape 6 : Vérification finale
SELECT
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'Filiere'
ORDER BY ordinal_position;
