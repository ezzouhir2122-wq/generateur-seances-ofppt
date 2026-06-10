export default function BibliothequePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center"
        style={{ background: "#39C84A18", border: "1px solid #39C84A30" }}
      >
        <svg width="32" height="32" fill="none" stroke="#39C84A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
          <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/>
          <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/>
        </svg>
      </div>
      <div className="text-center">
        <h1 className="text-2xl font-bold text-white mb-2">Bibliothèque Collaborative</h1>
        <p className="text-sm max-w-md" style={{ color: "#6B7280" }}>
          Partagez et découvrez des séances, évaluations et supports pédagogiques créés par les formateurs OFPPT.
          Recherchez par filière, module ou auteur, et notez les ressources les plus utiles.
        </p>
      </div>
      <div className="flex flex-wrap gap-3 justify-center mt-2">
        {["Partage de ressources", "Recherche & filtres", "Likes & commentaires"].map((f) => (
          <span
            key={f}
            className="text-xs px-3 py-1.5 rounded-full"
            style={{ background: "#111116", color: "#9CA3AF", border: "1px solid #1E1E2C" }}
          >
            {f}
          </span>
        ))}
      </div>
      <div
        className="text-xs font-semibold px-3 py-1.5 rounded-full"
        style={{ background: "#1E1E2C", color: "#39C84A", border: "1px solid #39C84A40" }}
      >
        Bientôt disponible
      </div>
    </div>
  );
}
