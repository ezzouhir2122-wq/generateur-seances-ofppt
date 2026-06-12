// Répare les groupes dont le champ `filiere` pointe vers une Filiere supprimée.
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const filieres = await prisma.filiere.findMany({ select: { id: true, nom: true } });
const validIds = new Set(filieres.map((f) => f.id));
const groupes = await prisma.groupe.findMany({ select: { id: true, nom: true, filiere: true } });

const orphans = groupes.filter((g) => !validIds.has(g.filiere));
console.log(`Filières valides: ${filieres.length} | Groupes: ${groupes.length} | Orphelins: ${orphans.length}`);

if (orphans.length === 0) {
  console.log("Rien à corriger.");
} else if (filieres.length === 1) {
  const target = filieres[0];
  for (const g of orphans) {
    await prisma.groupe.update({ where: { id: g.id }, data: { filiere: target.id } });
    console.log(`✓ "${g.nom}" re-pointé vers "${target.nom}" (${target.id})`);
  }
} else {
  console.log("⚠ Plusieurs filières — correction manuelle requise. Orphelins:");
  orphans.forEach((g) => console.log(`  - ${g.nom} (filiere morte=${g.filiere})`));
}

await prisma.$disconnect();
