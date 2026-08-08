"use client";

import { useEffect, useState } from "react";
import { upload } from "@vercel/blob/client";
import { toast } from "sonner";
import { ResourceType, TYPE_META } from "@/types/bibliotheque";

interface MyResource { id: string; titre: string; filiere: string | null; module: string | null; niveau: string | null }

interface Props {
  onClose: () => void;
  onPublished: () => void;
  defaultSourceId?: string;
  defaultType?: ResourceType;
}

const inputStyle: React.CSSProperties = {
  background: "#FFFFFF",
  border: "1px solid #E2E8F0",
  color: "#111827",
  borderRadius: "10px",
  padding: "9px 12px",
  fontSize: "13px",
  width: "100%",
  outline: "none",
};

export default function PublishModal({ onClose, onPublished, defaultSourceId, defaultType }: Props) {
  const [type, setType] = useState<ResourceType>(defaultType ?? "SEANCE");
  const [mes, setMes] = useState<{ seances: MyResource[]; fiches: MyResource[] }>({ seances: [], fiches: [] });
  const [sourceId, setSourceId] = useState(defaultSourceId ?? "");

  const [titre, setTitre] = useState("");
  const [description, setDescription] = useState("");
  const [filiere, setFiliere] = useState("");
  const [moduleNom, setModuleNom] = useState("");
  const [niveau, setNiveau] = useState("");
  const [contenu, setContenu] = useState("");

  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/bibliotheque/mes-ressources")
      .then((r) => r.json())
      .then((d) => setMes(d))
      .catch(() => {});
  }, []);

  // Préremplir depuis la ressource source choisie
  useEffect(() => {
    if (!sourceId) return;
    const list = type === "SEANCE" ? mes.seances : mes.fiches;
    const r = list.find((x) => x.id === sourceId);
    if (r) {
      setTitre(r.titre);
      setFiliere(r.filiere ?? "");
      setModuleNom(r.module ?? "");
      setNiveau(r.niveau ?? "");
    }
  }, [sourceId, type, mes]);

  const switchType = (t: ResourceType) => {
    setType(t);
    setSourceId("");
    setTitre(""); setDescription(""); setFiliere(""); setModuleNom(""); setNiveau(""); setContenu("");
    setFile(null);
  };

  const submit = async () => {
    if (!titre.trim() && type !== "FICHIER") { toast.error("Titre requis"); return; }
    if ((type === "SEANCE" || type === "FICHE") && !sourceId) { toast.error("Choisis une ressource"); return; }
    if (type === "EVALUATION" && !contenu.trim()) { toast.error("Contenu requis"); return; }
    if (type === "FICHIER" && !file) { toast.error("Choisis un fichier"); return; }

    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        type, titre: titre.trim(), description, filiere, module: moduleNom, niveau,
      };

      if (type === "SEANCE" || type === "FICHE") {
        payload.sourceId = sourceId;
      } else if (type === "EVALUATION") {
        payload.contenu = contenu;
      } else if (type === "FICHIER" && file) {
        setUploading(true);
        const blob = await upload(file.name, file, {
          access: "public",
          handleUploadUrl: "/api/bibliotheque/upload",
        });
        setUploading(false);
        payload.titre = titre.trim() || file.name;
        payload.fileUrl = blob.url;
        payload.fileName = file.name;
        payload.fileType = file.type;
        payload.fileSize = file.size;
      }

      const res = await fetch("/api/bibliotheque", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Échec de la publication");
      }
      toast.success("Ressource publiée");
      onPublished();
    } catch (err) {
      setUploading(false);
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSubmitting(false);
    }
  };

  const sourceList = type === "SEANCE" ? mes.seances : mes.fiches;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.45)" }} onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-2xl overflow-hidden flex flex-col max-h-[90vh]"
        style={{ background: "#FFFFFF", border: "1px solid #E2E8F0" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 flex items-center justify-between shrink-0" style={{ borderBottom: "1px solid #E2E8F0" }}>
          <h2 className="font-bold" style={{ color: "#111827" }}>Publier une ressource</h2>
          <button onClick={onClose} className="text-xl leading-none" style={{ color: "#9CA3AF" }}>✕</button>
        </div>

        <div className="px-5 py-4 overflow-y-auto space-y-4">
          {/* Sélecteur de type */}
          <div className="grid grid-cols-4 gap-2">
            {(Object.keys(TYPE_META) as ResourceType[]).map((t) => {
              const m = TYPE_META[t];
              const active = type === t;
              return (
                <button
                  key={t}
                  onClick={() => switchType(t)}
                  className="flex flex-col items-center gap-1 py-2.5 rounded-xl text-[11px] font-medium transition-colors"
                  style={{
                    background: active ? m.bg : "#F8FAFC",
                    color: active ? m.color : "#6B7280",
                    border: `1px solid ${active ? m.color + "40" : "#E2E8F0"}`,
                  }}
                >
                  <span className="text-base">{m.icon}</span>
                  {m.label}
                </button>
              );
            })}
          </div>

          {/* Source selon le type */}
          {(type === "SEANCE" || type === "FICHE") && (
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "#6B7280" }}>
                Choisir parmi mes {type === "SEANCE" ? "séances" : "fiches"}
              </label>
              {sourceList.length === 0 ? (
                <p className="text-xs" style={{ color: "#EF4444" }}>Aucune {type === "SEANCE" ? "séance" : "fiche"} disponible.</p>
              ) : (
                <select value={sourceId} onChange={(e) => setSourceId(e.target.value)} style={{ ...inputStyle, appearance: "none" }}>
                  <option value="">— Sélectionner —</option>
                  {sourceList.map((r) => <option key={r.id} value={r.id}>{r.titre}</option>)}
                </select>
              )}
            </div>
          )}

          {type === "EVALUATION" && (
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "#6B7280" }}>Contenu (markdown)</label>
              <textarea
                value={contenu}
                onChange={(e) => setContenu(e.target.value)}
                rows={6}
                placeholder="Colle ici le contenu de l'évaluation…"
                style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }}
              />
            </div>
          )}

          {type === "FICHIER" && (
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "#6B7280" }}>Fichier (PDF, Word, PPT, Excel, image — max 20 Mo)</label>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.png,.jpg,.jpeg,.webp"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="text-xs"
                style={{ color: "#6B7280" }}
              />
              {file && <p className="text-[11px] mt-1" style={{ color: "#9CA3AF" }}>{file.name} · {(file.size / 1024).toFixed(0)} Ko</p>}
            </div>
          )}

          {/* Champs communs */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "#6B7280" }}>Titre</label>
            <input value={titre} onChange={(e) => setTitre(e.target.value)} placeholder="Titre de la ressource" style={inputStyle} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "#6B7280" }}>Description (optionnel)</label>
            <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Courte description" style={inputStyle} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <input value={filiere} onChange={(e) => setFiliere(e.target.value)} placeholder="Filière" style={inputStyle} />
            <input value={moduleNom} onChange={(e) => setModuleNom(e.target.value)} placeholder="Module" style={inputStyle} />
            <input value={niveau} onChange={(e) => setNiveau(e.target.value)} placeholder="Niveau" style={inputStyle} />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 flex gap-2 shrink-0" style={{ borderTop: "1px solid #E2E8F0" }}>
          <button onClick={onClose} className="flex-1 py-2.5 text-sm rounded-xl" style={{ border: "1px solid #E2E8F0", color: "#6B7280" }}>
            Annuler
          </button>
          <button
            onClick={submit}
            disabled={submitting || uploading}
            className="flex-1 py-2.5 text-sm font-semibold rounded-xl disabled:opacity-50"
            style={{ background: "#0A4DA8", color: "#FFFFFF" }}
          >
            {uploading ? "Upload…" : submitting ? "Publication…" : "Publier"}
          </button>
        </div>
      </div>
    </div>
  );
}
