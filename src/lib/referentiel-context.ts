import type { ReferentielContext } from "@/types/seance";

const KEY = "referentielContext";

/** Dépose le contexte référentiel avant de naviguer vers un générateur. */
export function setReferentielContext(ctx: ReferentielContext): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(KEY, JSON.stringify(ctx));
}

/** Lit puis SUPPRIME le contexte (consommation unique) pour ne pas polluer les générations manuelles. */
export function consumeReferentielContext(): ReferentielContext | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(KEY);
  if (!raw) return null;
  sessionStorage.removeItem(KEY);
  try {
    return JSON.parse(raw) as ReferentielContext;
  } catch {
    return null;
  }
}
