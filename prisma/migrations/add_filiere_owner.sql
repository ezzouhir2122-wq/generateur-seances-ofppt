-- Isolation du référentiel par formateur.
-- Modèle : catalogue commun (userId NULL) + référentiels privés (userId = formateur).
-- Les filières déjà en base restent NULL → elles deviennent le catalogue officiel
-- OFPPT, visible par tous en lecture, modifiable par l'admin seulement.

ALTER TABLE "Filiere" ADD COLUMN IF NOT EXISTS "userId" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Filiere_userId_fkey'
  ) THEN
    ALTER TABLE "Filiere"
      ADD CONSTRAINT "Filiere_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "Filiere_userId_idx" ON "Filiere"("userId");
