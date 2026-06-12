// Diagnostic LECTURE SEULE — état du référentiel & suivi des compétences
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const [secteurs, filieres, refModules, competences, groupes] = await Promise.all([
  prisma.secteur.count(),
  prisma.filiere.findMany({ select: { id: true, nom: true } }),
  prisma.refModule.count(),
  prisma.competence.count(),
  prisma.groupe.findMany({ select: { id: true, nom: true, filiere: true } }),
]);

console.log("=== TOTAUX ===");
console.log({ secteurs, filieres: filieres.length, refModules, competences, groupes: groupes.length });

console.log("\n=== COMPÉTENCES PAR FILIÈRE ===");
for (const f of filieres) {
  const cnt = await prisma.competence.count({ where: { module: { filiereId: f.id } } });
  const mods = await prisma.refModule.count({ where: { filiereId: f.id } });
  console.log(`- ${f.nom} (id=${f.id.slice(0, 8)}…): ${mods} modules, ${cnt} compétences`);
}

console.log("\n=== GROUPES → compétences disponibles dans le suivi ===");
for (const g of groupes) {
  const cnt = await prisma.competence.count({ where: { module: { filiereId: g.filiere } } });
  const f = filieres.find((x) => x.id === g.filiere);
  console.log(`- "${g.nom}" → filiere=${f ? f.nom : "(introuvable id=" + g.filiere.slice(0,8) + "…)"} → ${cnt} compétences`);
}

await prisma.$disconnect();
