-- CreateTable
CREATE TABLE "GroupeCompetence" (
    "id" TEXT NOT NULL,
    "groupeId" TEXT NOT NULL,
    "competenceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GroupeCompetence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GroupeCompetence_groupeId_idx" ON "GroupeCompetence"("groupeId");

-- CreateIndex
CREATE UNIQUE INDEX "GroupeCompetence_groupeId_competenceId_key" ON "GroupeCompetence"("groupeId", "competenceId");

-- AddForeignKey
ALTER TABLE "GroupeCompetence" ADD CONSTRAINT "GroupeCompetence_groupeId_fkey" FOREIGN KEY ("groupeId") REFERENCES "Groupe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupeCompetence" ADD CONSTRAINT "GroupeCompetence_competenceId_fkey" FOREIGN KEY ("competenceId") REFERENCES "Competence"("id") ON DELETE CASCADE ON UPDATE CASCADE;
