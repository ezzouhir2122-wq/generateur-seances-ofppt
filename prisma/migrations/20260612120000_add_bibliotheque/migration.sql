-- CreateTable
CREATE TABLE "SharedResource" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "description" TEXT,
    "filiere" TEXT,
    "module" TEXT,
    "niveau" TEXT,
    "contenu" TEXT,
    "fileUrl" TEXT,
    "fileName" TEXT,
    "fileType" TEXT,
    "fileSize" INTEGER,
    "authorId" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SharedResource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResourceLike" (
    "id" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResourceLike_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResourceComment" (
    "id" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "contenu" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResourceComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SharedResource_type_idx" ON "SharedResource"("type");
CREATE INDEX "SharedResource_filiere_idx" ON "SharedResource"("filiere");
CREATE INDEX "SharedResource_createdAt_idx" ON "SharedResource"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ResourceLike_resourceId_userId_key" ON "ResourceLike"("resourceId", "userId");
CREATE INDEX "ResourceLike_resourceId_idx" ON "ResourceLike"("resourceId");

-- CreateIndex
CREATE INDEX "ResourceComment_resourceId_idx" ON "ResourceComment"("resourceId");

-- AddForeignKey
ALTER TABLE "SharedResource" ADD CONSTRAINT "SharedResource_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceLike" ADD CONSTRAINT "ResourceLike_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "SharedResource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ResourceLike" ADD CONSTRAINT "ResourceLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceComment" ADD CONSTRAINT "ResourceComment_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "SharedResource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ResourceComment" ADD CONSTRAINT "ResourceComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
