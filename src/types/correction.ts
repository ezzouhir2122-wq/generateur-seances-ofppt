export type CorrectionInputMode = "texte" | "pdf" | "image";

export interface CorrectionFormData {
  type: "copie" | "devoir";
  filiere: string;
  module: string;
  bareme: string;
  corrigeType: string;
  copieEtudiant: string;
  nomStagiaire?: string;
  inputMode?: CorrectionInputMode;
  fichierBase64?: string;
  fichierMimeType?: string;
  fichierNom?: string;
}
