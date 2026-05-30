// Equipment : Créer un formateur en base de données
// Usage : npx tsx equipment/create-formateur.ts

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2] ?? "formateur@ofppt.ma";
  const password = process.argv[3] ?? "ofppt2024";
  const name = process.argv[4] ?? "Formateur OFPPT";

  const hash = await bcrypt.hash(password, 12);

  const user = await prisma.user.upsert({
    where: { email },
    update: { password: hash, name },
    create: { email, password: hash, name },
  });

  console.log(`Formateur créé : ${user.email} (id: ${user.id})`);
  console.log(`Mot de passe : ${password}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
