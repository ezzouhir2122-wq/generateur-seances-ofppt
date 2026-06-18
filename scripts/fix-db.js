const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  console.log('Lecture de la structure actuelle...');

  const secteurs = await p.secteur.findMany({
    include: { filieres: { include: { modules: { select: { id: true } } } } }
  });

  console.log('Secteurs actuels:');
  secteurs.forEach(s => {
    s.filieres.forEach(f => {
      console.log(`  "${s.nom}" > "${f.nom}" (${f.modules.length} modules)`);
    });
  });

  console.log('\nSuppression dans l\'ordre correct...');

  // Supprimer dans le bon ordre (FK constraints)
  await p.$executeRaw`DELETE FROM "CriterePerformance"`;
  console.log('  CriterePerformance OK');

  await p.$executeRaw`DELETE FROM "Objectif"`;
  console.log('  Objectif OK');

  await p.$executeRaw`DELETE FROM "Competence"`;
  console.log('  Competence OK');

  await p.$executeRaw`DELETE FROM "Sequence"`;
  console.log('  Sequence OK');

  await p.$executeRaw`DELETE FROM "RefModule"`;
  console.log('  RefModule OK');

  await p.$executeRaw`DELETE FROM "Filiere"`;
  console.log('  Filiere OK');

  await p.$executeRaw`DELETE FROM "Secteur"`;
  console.log('  Secteur OK');

  console.log('\nBase nettoyee avec succes. Veuillez re-importer votre fichier CSV/MD.');
}

main().catch(console.error).then(() => p.$disconnect());
