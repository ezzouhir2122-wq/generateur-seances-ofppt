-- Bibliothèque collaborative : portée de publication + lien vers la source.
-- Additif : les ressources déjà publiées restent PUBLIC, rien ne disparaît.

ALTER TABLE "SharedResource" ADD COLUMN IF NOT EXISTS "visibilite" TEXT NOT NULL DEFAULT 'PUBLIC';
ALTER TABLE "SharedResource" ADD COLUMN IF NOT EXISTS "sourceId" TEXT;

CREATE INDEX IF NOT EXISTS "SharedResource_visibilite_idx" ON "SharedResource"("visibilite");
CREATE INDEX IF NOT EXISTS "SharedResource_authorId_sourceId_idx" ON "SharedResource"("authorId", "sourceId");
