export interface SeanceFormData {
  filiere: string;
  module: string;
  codeModule?: string;
  duree: string;
  niveau: "T" | "TS";
  annee: "1ere-annee" | "2eme-annee" | "3eme-annee";
  type: "theorique" | "tp" | "ta";
  objectifs: string;
}

export interface SeanceGeneree {
  id?: string;
  titre: string;
  contenu: string;
  params: SeanceFormData;
  createdAt?: Date;
}

export const FILIERES_OFPPT = [
  "Développement Digital",
  "Gestion des Entreprises",
  "Électrotechnique",
  "Génie Civil",
  "Commerce",
  "Hôtellerie et Tourisme",
  "Industrie",
  "Agriculture",
];

export interface FicheFormData {
  filiere: string;
  module: string;
  codeModule?: string;
  intitule: string;
  formateur: string;
  duree: string;
  type: string;
  niveau: "T" | "TS";
  annee: "1ere-annee" | "2eme-annee" | "3eme-annee";
  objectifsSavoir: string;
  objectifsSavoirFaire: string;
  objectifsSavoirEtre: string;
  prerequis: string;
}
