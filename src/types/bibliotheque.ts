export type ResourceType = "SEANCE" | "FICHE" | "EVALUATION" | "FICHIER";

export interface ResourceListItem {
  id: string;
  type: ResourceType;
  titre: string;
  description: string | null;
  filiere: string | null;
  module: string | null;
  niveau: string | null;
  fileName: string | null;
  fileType: string | null;
  authorName: string;
  etablissement?: string | null;
  isMine: boolean;
  createdAt: string;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
}

export interface ResourceComment {
  id: string;
  authorName: string;
  contenu: string;
  createdAt: string;
  isMine: boolean;
}

export interface ResourceDetail extends ResourceListItem {
  contenu: string | null;
  fileUrl: string | null;
  fileSize: number | null;
  comments: ResourceComment[];
}

export const TYPE_META: Record<ResourceType, { label: string; icon: string; color: string; bg: string }> = {
  SEANCE: { label: "Séance", icon: "⚡", color: "#0A4DA8", bg: "#0A4DA814" },
  FICHE: { label: "Fiche", icon: "📋", color: "#003087", bg: "#00308714" },
  EVALUATION: { label: "Évaluation", icon: "✓", color: "#0B6B72", bg: "#0B6B7214" },
  FICHIER: { label: "Fichier", icon: "📎", color: "#E8651A", bg: "#E8651A14" },
};

export interface MyOwnResource {
  id: string;
  titre: string;
  filiere: string | null;
  module: string | null;
  niveau: string | null;
  createdAt: string;
  isPublished: boolean;
  sharedResourceId: string | null;
}

export interface MyOwnResources {
  seances: MyOwnResource[];
  fiches: MyOwnResource[];
}
