import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      matricule?: string | null;
      etablissement?: string | null;
    };
  }

  interface User {
    matricule?: string | null;
    etablissement?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    matricule?: string | null;
    etablissement?: string | null;
  }
}
