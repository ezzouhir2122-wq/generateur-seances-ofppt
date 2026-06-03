-- CreateTable
CREATE TABLE "UserModule" (
    "id" TEXT NOT NULL,
    "groupe" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "mhg" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserModule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserModule_groupe_module_userId_key" ON "UserModule"("groupe", "module", "userId");

-- AddForeignKey
ALTER TABLE "UserModule" ADD CONSTRAINT "UserModule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
