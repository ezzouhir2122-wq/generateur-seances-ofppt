"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PublishModal from "./PublishModal";
import type { ResourceType } from "@/types/bibliotheque";

interface Props {
  /** SEANCE, FICHE ou EVALUATION. */
  type: ResourceType;
  /** Identifiant de la séance / fiche / évaluation à publier. */
  sourceId: string;
  /** Établissement du formateur, pour proposer la portée restreinte. */
  etablissement?: string | null;
}

/**
 * Bouton « Partager dans la bibliothèque », posé sur les pages de détail
 * d'une séance, d'une fiche ou d'une évaluation.
 *
 * Il ouvre le même PublishModal que la page Bibliothèque, déjà pointé sur
 * la bonne ressource : le formateur partage dans la foulée de la
 * génération, sans détour par un menu déroulant.
 */
export default function PartagerButton({ type, sourceId, etablissement = null }: Props) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
        style={{ background: "#FFF7ED", color: "#C2410C", border: "1px solid #FDBA74" }}
      >
        📚 Partager dans la bibliothèque
      </button>

      {open && (
        <PublishModal
          onClose={() => setOpen(false)}
          onPublished={() => {
            setOpen(false);
            router.refresh();
          }}
          defaultType={type}
          defaultSourceId={sourceId}
          etablissement={etablissement}
        />
      )}
    </>
  );
}
