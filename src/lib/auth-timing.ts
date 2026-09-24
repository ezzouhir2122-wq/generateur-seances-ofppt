import bcrypt from "bcryptjs";

// Hash bcrypt factice : sert à exécuter un bcrypt.compare même quand le compte
// n'existe pas, pour que le temps de réponse ne révèle pas l'existence de l'email.
const DUMMY_HASH = "$2b$10$dpo2N/3tvfPFnW4/Zq56y.TlVrS2LGDcSQ625BwUx/N3Gb/1RyV7m";

/**
 * Vérifie un mot de passe à temps constant vis-à-vis de l'existence du compte :
 * si `hash` est nul (compte inexistant), on compare quand même contre un hash factice.
 * Retourne toujours false pour un compte inexistant.
 */
export async function verifyPassword(password: string, hash: string | null | undefined): Promise<boolean> {
  if (!hash) {
    await bcrypt.compare(password, DUMMY_HASH);
    return false;
  }
  return bcrypt.compare(password, hash);
}
