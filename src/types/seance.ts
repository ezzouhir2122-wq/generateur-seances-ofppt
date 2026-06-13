export interface SeanceFormData {
  filiere: string;
  module: string;
  codeModule?: string;
  mhg?: number;
  duree: string;
  niveau: "T" | "TS";
  annee: "1ere-annee" | "2eme-annee" | "3eme-annee";
  type: "theorique" | "tp" | "ta";
  objectifs?: string;
  competence?: string;
  niveauApprentissage?: "debutant" | "intermediaire" | "avance";
  mode?: "presentiel" | "distanciel" | "hybride";
}

export interface SeanceGeneree {
  id?: string;
  titre: string;
  contenu: string;
  params: SeanceFormData;
  createdAt?: Date;
}

export type EvaluationType = "qcm" | "exercices" | "controle" | "examen" | "rattrapage";

export interface EvaluationFormData {
  type: EvaluationType;
  filiere: string;
  module: string;
  codeModule?: string;
  niveau: "T" | "TS";
  annee: "1ere-annee" | "2eme-annee" | "3eme-annee";
  theme?: string;
  nbQuestions?: number;
  nbExercices?: number;
  dureeExamen?: string;
  themesCouverts?: string;
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
  objectifsSavoir?: string;
  objectifsSavoirFaire?: string;
  objectifsSavoirEtre?: string;
  prerequis: string;
}

export interface ReferentielContext {
  filiere: string;
  module: string;
  codeModule: string;
  sequence?: string;
  competence: string;
  objectifs: string;
  criteres: string;
}
