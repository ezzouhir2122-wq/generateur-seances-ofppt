const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash('ofppt2024', 12);
  const user = await prisma.user.upsert({
    where: { email: 'ezzouhir2122@gmail.com' },
    update: { password: hash },
    create: {
      id: 'cuid_ezzouhir_001',
      email: 'ezzouhir2122@gmail.com',
      name: 'Elmustapha Ezzouhir',
      password: hash,
    },
  });
  console.log('OK:', user.email, '| hash:', hash.substring(0, 20) + '...');
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
