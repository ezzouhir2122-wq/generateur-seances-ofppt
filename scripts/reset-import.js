/**
 * reset-import.js
 * Supprime toutes les données référentiel puis réimporte depuis le CSV fourni.
 * Autorisé explicitement par l'utilisateur (confirmation "oui").
 */

const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

// ── Corrections de noms corrompus (doublons de texte dans le CSV source) ──
function cleanNom(nom, code) {
  if (!nom) return nom;
  if (code === 'M205') return 'Bureautique avancée';
  if (code === 'M209') return 'Contrôle de gestion - budgets et tableau de bord';
  // "Gestion deprojet" → "Gestion de projet"
  return nom.replace(/deprojet/gi, 'de projet').trim();
}

// ── Parser CSV semicolon ──
function parseCsv(text) {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(l => l.trim());
  if (lines.length < 2) return [];

  function splitRow(line) {
    const cols = [];
    let cur = '', inQ = false;
    for (const ch of line) {
      if (ch === '"') { inQ = !inQ; }
      else if (ch === ';' && !inQ) { cols.push(cur.trim()); cur = ''; }
      else { cur += ch; }
    }
    cols.push(cur.trim());
    return cols.map(c => c.replace(/^"|"$/g, '').trim());
  }

  const headers = splitRow(lines[0]);
  return lines.slice(1).map(line => {
    const vals = splitRow(line);
    const row = {};
    headers.forEach((h, i) => { row[h.trim()] = vals[i] ?? ''; });
    return row;
  });
}

async function main() {
  // ── 1. Suppression dans le bon ordre (FK constraints) ──
  console.log('\n⏳ Suppression des anciennes données...');
  await p.$executeRaw`DELETE FROM "CriterePerformance"`;
  await p.$executeRaw`DELETE FROM "Objectif"`;
  await p.$executeRaw`DELETE FROM "Competence"`;
  await p.$executeRaw`DELETE FROM "Sequence"`;
  await p.$executeRaw`DELETE FROM "RefModule"`;
  await p.$executeRaw`DELETE FROM "Filiere"`;
  await p.$executeRaw`DELETE FROM "Secteur"`;
  console.log('✅ Base nettoyée.\n');

  // ── 2. Lire et parser le CSV ──
  const fs = require('fs');
  const path = require('path');
  const csvPath = path.join(__dirname, 'referentiel.csv');
  const csvText = fs.readFileSync(csvPath, 'utf-8').replace(/^﻿/, ''); // strip BOM
  const rows = parseCsv(csvText);

  // ── 3. Grouper par Filière + Niveau de formation ──
  const groupMap = new Map();
  const groupOrder = [];

  for (const row of rows) {
    const filiere  = row['Filière'] || row['Filiere'] || '';
    const niveau   = row['Niveau de formation'] || row['Niveau'] || '';
    const mCode    = row['N° Module'] || row['N°Module'] || '';
    const mNomRaw  = row['Intitulé du module'] || row['Intitule du module'] || '';
    const mNom     = cleanNom(mNomRaw, mCode);
    const mhgStr   = row['Masse horaire (h)'] || row['Masse horaire'] || '';
    const mhg      = mhgStr && !isNaN(parseFloat(mhgStr)) ? parseFloat(mhgStr) : null;
    const compTitre = (row['Compétences Pedagogiques'] || row['Competences Pedagogiques'] ||
                       row['Compétences Pedagogique'] || '').trim();

    if (!mNom || !filiere) continue; // skip incomplete rows

    const key = `${filiere}||${niveau}`;
    if (!groupMap.has(key)) {
      groupMap.set(key, { secteurNom: filiere, filiereNom: niveau || 'Formation', modules: [] });
      groupOrder.push(key);
    }
    const group = groupMap.get(key);

    let mod = group.modules.find(m =>
      (mCode && m.code && m.code.toLowerCase() === mCode.toLowerCase()) ||
      m.nom.toLowerCase() === mNom.toLowerCase()
    );
    if (!mod) {
      mod = { nom: mNom, code: mCode || null, mhg, competences: [] };
      group.modules.push(mod);
    }
    if (mhg && !mod.mhg) mod.mhg = mhg;

    if (!compTitre) continue;
    if (!mod.competences.some(c => c.toLowerCase() === compTitre.toLowerCase())) {
      mod.competences.push(compTitre);
    }
  }

  // ── 4. Sauvegarder en base ──
  let totalSecteurs = 0, totalFilieres = 0, totalModules = 0, totalComps = 0;

  for (const key of groupOrder) {
    const { secteurNom, filiereNom, modules } = groupMap.get(key);

    let secteur = await p.secteur.findFirst({ where: { nom: secteurNom } });
    if (!secteur) {
      secteur = await p.secteur.create({ data: { nom: secteurNom } });
      totalSecteurs++;
    }

    let filiere = await p.filiere.findFirst({ where: { nom: filiereNom, secteurId: secteur.id } });
    if (!filiere) {
      filiere = await p.filiere.create({ data: { nom: filiereNom, secteurId: secteur.id } });
      totalFilieres++;
    }

    const createdMods = await Promise.all(
      modules.map(m => p.refModule.create({
        data: { nom: m.nom, code: m.code, mhg: m.mhg, filiereId: filiere.id }
      }))
    );
    totalModules += modules.length;

    const compsToCreate = [];
    for (let i = 0; i < modules.length; i++) {
      const moduleId = createdMods[i].id;
      for (const titre of modules[i].competences) {
        compsToCreate.push({ titre, moduleId, sequenceId: null });
      }
    }
    if (compsToCreate.length > 0) {
      await p.competence.createMany({ data: compsToCreate });
      totalComps += compsToCreate.length;
    }

    console.log(`  ✔ ${secteurNom} / ${filiereNom} — ${modules.length} modules`);
  }

  console.log(`\n✅ Import terminé :`);
  console.log(`   ${totalSecteurs} secteur(s) | ${totalFilieres} filière(s) | ${totalModules} modules | ${totalComps} compétences`);
}

main().catch(err => { console.error('❌ Erreur:', err); process.exit(1); }).then(() => p.$disconnect());
