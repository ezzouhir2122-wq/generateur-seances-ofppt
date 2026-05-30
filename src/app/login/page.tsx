import LoginForm from "@/components/forms/LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; callbackUrl?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-ofppt-green text-white text-2xl font-bold mb-4 shadow-lg">
            O
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Connexion</h1>
          <p className="text-gray-500 text-sm mt-1">
            Générateur de Séances Pédagogiques OFPPT
          </p>
        </div>

        <LoginForm error={params.error} />

        <p className="text-center text-xs text-gray-400 mt-6">
          Accès réservé aux formateurs OFPPT
        </p>
      </div>
    </div>
  );
}
