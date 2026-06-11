"use client";

import { useState, useCallback } from "react";
import { StagiaireItem } from "@/types/suivi";

interface Props {
  groupeId: string;
  initialStagiaires: StagiaireItem[];
}

export default function StagiairesManager({ groupeId, initialStagiaires }: Props) {
  const [stagiaires, setStagiaires] = useState(initialStagiaires);
  const [showModal, setShowModal] = useState(false);
  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [cne, setCne] = useState("");
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState("");

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/groupes/${groupeId}`);
    if (res.ok) {
      const data = await res.json();
      setStagiaires(data.stagiaires);
    }
  }, [groupeId]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await fetch(`/api/groupes/${groupeId}/stagiaires`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nom, prenom, cne }),
    });
    if (res.ok) {
      await refresh();
      setNom(""); setPrenom(""); setCne("");
      setShowModal(false);
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer ce stagiaire ?")) return;
    await fetch(`/api/stagiaires/${id}`, { method: "DELETE" });
    setStagiaires((prev) => prev.filter((s) => s.id !== id));
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportMsg("");
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`/api/groupes/${groupeId}/stagiaires/import`, { method: "POST", body: form });
    const json = await res.json();
    if (res.ok) {
      await refresh();
      setImportMsg(`✓ ${json.created} stagiaire(s) importé(s)`);
    } else {
      setImportMsg(`Erreur : ${json.error}`);
    }
    setImporting(false);
    e.target.value = "";
  };

  const inputStyle = {
    background: "#12121E", border: "1px solid #E2E8F0", color: "#E5E7EB",
    borderRadius: "10px", padding: "8px 12px", fontSize: "13px", width: "100%", outline: "none",
  };

  return (
    <div>
      {/* Actions bar */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 text-sm font-semibold rounded-xl"
          style={{ background: "#E8651A", color: "#0B0B14" }}
        >
          + Ajouter un stagiaire
        </button>

        <label
          className="px-4 py-2 text-sm font-medium rounded-xl cursor-pointer transition-colors"
          style={{ border: "1px solid #E8651A40", color: "#E8651A", background: "#E8651A10" }}
        >
          {importing ? "Import en cours…" : "Importer Excel"}
          <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport} disabled={importing} />
        </label>

        <a
          href="/api/groupes/template"
          download
          className="px-4 py-2 text-sm rounded-xl transition-colors"
          style={{ border: "1px solid #E2E8F0", color: "#9CA3AF" }}
        >
          ↓ Template Excel
        </a>

        {importMsg && (
          <span
            className="text-xs px-3 py-2 rounded-xl"
            style={{
              background: importMsg.startsWith("✓") ? "#E8651A14" : "#7F1D1D20",
              color: importMsg.startsWith("✓") ? "#E8651A" : "#EF4444",
              border: `1px solid ${importMsg.startsWith("✓") ? "#E8651A30" : "#7F1D1D40"}`,
            }}
          >
            {importMsg}
          </span>
        )}
      </div>

      {/* Table */}
      {stagiaires.length === 0 ? (
        <div
          className="flex flex-col items-center py-16 rounded-2xl"
          style={{ border: "1px dashed #E2E8F0" }}
        >
          <div className="text-3xl mb-2">👤</div>
          <p className="text-sm" style={{ color: "#6B7280" }}>Aucun stagiaire. Ajoutez-en ou importez un fichier Excel.</p>
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #E2E8F0" }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "#12121E", borderBottom: "1px solid #E2E8F0" }}>
                {["Nom", "Prénom", "CNE", "Ajouté le", ""].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold" style={{ color: "#6B7280" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stagiaires.map((s, i) => (
                <tr
                  key={s.id}
                  style={{
                    background: i % 2 === 0 ? "#FFFFFF" : "#F8FAFC",
                    borderBottom: "1px solid #E2E8F0",
                  }}
                >
                  <td className="px-4 py-3 font-medium" style={{ color: "#111827" }}>{s.nom}</td>
                  <td className="px-4 py-3" style={{ color: "#374151" }}>{s.prenom}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: "#6B7280" }}>{s.cne ?? "—"}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: "#6B7280" }}>
                    {new Date(s.createdAt).toLocaleDateString("fr-MA")}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleDelete(s.id)}
                      className="text-xs px-2 py-1 rounded-lg transition-colors"
                      style={{ color: "#6B7280", border: "1px solid #E2E8F0" }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#EF4444"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#6B7280"; }}
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal ajout */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.7)" }}
          onClick={(e) => e.target === e.currentTarget && setShowModal(false)}
        >
          <div className="w-full max-w-sm mx-4 rounded-2xl p-6" style={{ background: "#12121E", border: "1px solid #E2E8F0" }}>
            <h3 className="font-bold text-white mb-5">Ajouter un stagiaire</h3>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-xs mb-1.5" style={{ color: "#9CA3AF" }}>Nom *</label>
                <input style={inputStyle} value={nom} onChange={(e) => setNom(e.target.value)} placeholder="DUPONT" required />
              </div>
              <div>
                <label className="block text-xs mb-1.5" style={{ color: "#9CA3AF" }}>Prénom *</label>
                <input style={inputStyle} value={prenom} onChange={(e) => setPrenom(e.target.value)} placeholder="Ahmed" required />
              </div>
              <div>
                <label className="block text-xs mb-1.5" style={{ color: "#9CA3AF" }}>CNE (optionnel)</label>
                <input style={inputStyle} value={cne} onChange={(e) => setCne(e.target.value)} placeholder="ABC123456" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2 text-sm rounded-xl" style={{ border: "1px solid #E2E8F0", color: "#9CA3AF" }}>Annuler</button>
                <button type="submit" disabled={saving} className="flex-1 py-2 text-sm font-semibold rounded-xl" style={{ background: "#E8651A", color: "#0B0B14" }}>
                  {saving ? "Ajout…" : "Ajouter"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
