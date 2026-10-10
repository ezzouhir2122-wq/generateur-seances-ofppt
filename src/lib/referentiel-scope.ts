/**
 * Portée du référentiel — isolation par formateur.
 *
 * Modèle retenu : catalogue commun + imports privés.
 *   - `Filiere.userId === null` → catalogue officiel OFPPT, visible par TOUS,
 *     modifiable uniquement par un compte ADMIN.
 *   - `Filiere.userId === <id>` → référentiel privé importé par ce formateur,
 *     invisible pour les autres comptes.
 *
 * Toute lecture du référentiel par un formateur DOIT passer par ces helpers,
 * sinon les référentiels fuient d'un compte à l'autre.
 */

/** Filtre Prisma sur Filiere : officiel + le mien. */
export function filiereScope(userId: string) {
  return { OR: [{ userId: null }, { userId }] };
}

/** Filtre Prisma sur RefModule (via sa filière). */
export function refModuleScope(userId: string) {
  return { filiere: filiereScope(userId) };
}

/** Filtre Prisma sur Competence (via module → filière). */
export function competenceScope(userId: string) {
  return { module: refModuleScope(userId) };
}

/** Propriétaire à affecter lors d'un import : null pour l'admin, sinon le formateur. */
export function importOwnerId(
  session: { user?: { id?: string | null; role?: string | null } } | null,
): string | null {
  if (!session?.user?.id) throw new Error("Non authentifié");
  return session.user.role === "ADMIN" ? null : session.user.id;
}

/** Un ADMIN peut toucher au catalogue officiel ; un formateur, à ses seules filières. */
export function filiereWriteScope(
  session: { user?: { id?: string | null; role?: string | null } } | null,
) {
  if (!session?.user?.id) throw new Error("Non authentifié");
  return session.user.role === "ADMIN" ? {} : { userId: session.user.id };
}
