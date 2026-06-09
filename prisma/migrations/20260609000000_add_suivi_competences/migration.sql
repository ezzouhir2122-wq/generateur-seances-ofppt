-- CreateTable
CREATE TABLE "Groupe" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "filiere" TEXT NOT NULL,
    "annee" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Groupe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Stagiaire" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "cne" TEXT,
    "groupeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Stagiaire_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgressionCompetence" (
    "id" TEXT NOT NULL,
    "stagiaireId" TEXT NOT NULL,
    "competenceId" TEXT NOT NULL,
    "pourcentage" INTEGER NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'manuel',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProgressionCompetence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProgressionCompetence_stagiaireId_competenceId_key" ON "ProgressionCompetence"("stagiaireId", "competenceId");

-- AddForeignKey
ALTER TABLE "Groupe" ADD CONSTRAINT "Groupe_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stagiaire" ADD CONSTRAINT "Stagiaire_groupeId_fkey" FOREIGN KEY ("groupeId") REFERENCES "Groupe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgressionCompetence" ADD CONSTRAINT "ProgressionCompetence_stagiaireId_fkey" FOREIGN KEY ("stagiaireId") REFERENCES "Stagiaire"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgressionCompetence" ADD CONSTRAINT "ProgressionCompetence_competenceId_fkey" FOREIGN KEY ("competenceId") REFERENCES "Competence"("id") ON DELETE CASCADE ON UPDATE CASCADE;
