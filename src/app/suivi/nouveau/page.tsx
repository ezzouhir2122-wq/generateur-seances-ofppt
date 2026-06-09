import GroupeForm from "@/components/suivi/GroupeForm";

export default function NouveauGroupePage() {
  return (
    <div className="max-w-lg mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Nouveau groupe</h1>
        <p className="mt-1 text-sm" style={{ color: "#9CA3AF" }}>
          Créez un groupe de stagiaires pour commencer le suivi des compétences
        </p>
      </div>
      <div className="rounded-2xl p-6" style={{ background: "#111116", border: "1px solid #1E1E2C" }}>
        <GroupeForm />
      </div>
    </div>
  );
}
