import { SCENARIO_TEMPLATES } from './templates';
import type { ScenarioTemplate, SimulatorConfig } from './types';

export function selectTemplates(config: SimulatorConfig): ScenarioTemplate[] {
  const eligible = SCENARIO_TEMPLATES.filter(t =>
    t.niveaux.includes(config.difficulte)
  );

  const categories = [...new Set(eligible.map(t => t.categorie))] as string[];
  const selected: ScenarioTemplate[] = [];

  // Pick one from each category to ensure variety
  for (const cat of categories) {
    const pool = eligible.filter(t => t.categorie === cat);
    selected.push(pool[Math.floor(Math.random() * pool.length)]);
  }

  // Fill up to target count
  const target = config.difficulte === 'AVANCE' ? 10 : config.difficulte === 'INTERMEDIAIRE' ? 9 : 8;
  const remaining = eligible.filter(t => !selected.includes(t));

  while (selected.length < target && remaining.length > 0) {
    const idx = Math.floor(Math.random() * remaining.length);
    selected.push(...remaining.splice(idx, 1));
  }

  return selected.sort(() => Math.random() - 0.5);
}

export function buildTemplateList(templates: ScenarioTemplate[]): string {
  return templates
    .map((t, i) => `${i + 1}. ${t.type} (${t.categorie}) — ${t.titre_generique}`)
    .join('\n');
}
