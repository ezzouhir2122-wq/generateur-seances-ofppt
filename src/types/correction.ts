export interface CorrectionFormData {
  type: "copie" | "devoir";
  filiere: string;
  module: string;
  bareme: string;
  corrigeType: string;
  copieEtudiant: string;
  nomStagiaire?: string;
}
