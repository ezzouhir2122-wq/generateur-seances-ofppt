import { prisma } from "../src/lib/db";
import bcrypt from "bcryptjs";

async function main() {
  const email = (process.env.ADMIN_EMAIL || "").toLowerCase().trim();
  const password = process.env.ADMIN_PASSWORD || "";
  const name = process.env.ADMIN_NAME || "Elmustapha Ezzouhir";
  if (!email || !password) throw new Error("ADMIN_EMAIL et ADMIN_PASSWORD requis");

  const hash = await bcrypt.hash(password, 10);
  await prisma.user.upsert({
    where: { email },
    update: { role: "ADMIN", status: "APPROVED", password: hash, approvedAt: new Date() },
    create: { email, name, password: hash, role: "ADMIN", status: "APPROVED", approvedAt: new Date() },
  });
  console.log("Admin pret :", email);
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
