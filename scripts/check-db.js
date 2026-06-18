const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const secteurs = await p.secteur.findMany({
    include: {
      filieres: {
        include: { modules: { select: { id: true, nom: true, code: true } } }
      }
    }
  });

  secteurs.forEach(s => {
    console.log(`SECTEUR: "${s.nom}" (id: ${s.id})`);
    s.filieres.forEach(f => {
      console.log(`  FILIERE: "${f.nom}" (id: ${f.id}) — ${f.modules.length} modules`);
      f.modules.slice(0, 3).forEach(m => console.log(`    ${m.code ?? '—'} | ${m.nom}`));
      if (f.modules.length > 3) console.log(`    ... +${f.modules.length - 3} autres`);
    });
  });
}

main().catch(console.error).then(() => p.$disconnect());
