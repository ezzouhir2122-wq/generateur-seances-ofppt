export interface SeanceFormData {
  filiere: string;
  module: string;
  duree: string;
  niveau: "1ere-annee" | "2eme-annee";
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
  intitule: string;
  formateur: string;
  duree: string;
  type: string;
  niveau: string;
  objectifsSavoir: string;
  objectifsSavoirFaire: string;
  objectifsSavoirEtre: string;
  prerequis: string;
}
