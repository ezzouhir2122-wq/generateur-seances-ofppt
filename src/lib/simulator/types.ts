export interface Choix {
  label: string;
  description: string;
  consequences: string;
  impactScore: number;
  impactSatisfaction: number;
  impactFinancier: number;
  impactMoral: number;
}

export interface PersonnageVirtuel {
  nom: string;
  fonction: string;
  personnalite: string;
  objectifs: string;
  styleCommunication: string;
  niveauExigence: 'FAIBLE' | 'MOYEN' | 'ELEVE';
}

export interface EntiteExterne {
  nom: string;
  type: 'CLIENT' | 'FOURNISSEUR';
  description: string;
  relation: string;
}

export interface DocumentVirtuel {
  type: string;
  titre: string;
  contenu: string;
}

export interface EvenementNarratif {
  ordre: number;
  templateType: string;
  titre: string;
  description: string;
  contexte: string;
  personnageImplique: string;
  documentAttache?: string;
  choixA: Choix;
  choixB: Choix;
  choixC: Choix;
}

export interface EntrepriseVirtuelle {
  nom: string;
  secteur: string;
  description: string;
  contexteEconomique: string;
  organigramme: { postes: Array<{ titre: string; responsable: string }> };
  personnages: PersonnageVirtuel[];
  clients: EntiteExterne[];
  fournisseurs: EntiteExterne[];
  documents: DocumentVirtuel[];
  problemesCles: string[];
  arcNarratif: EvenementNarratif[];
}

export type Difficulte = 'DEBUTANT' | 'INTERMEDIAIRE' | 'AVANCE';
export type RunStatus = 'EN_COURS' | 'PAUSE' | 'TERMINE';
export type ChoixLettre = 'A' | 'B' | 'C';

export interface SimulatorConfig {
  filiere: string;
  module: string;
  niveau: string;
  duree: string;
  nbStagiaires: number;
  difficulte: Difficulte;
  competencesCiblees: string[];
}

export interface ScenarioTemplate {
  type: string;
  categorie: 'FINANCIER' | 'OPERATIONNEL' | 'RH' | 'COMMERCIAL' | 'SECURITE';
  titre_generique: string;
  personnage_type: string;
  document_type?: string;
  niveaux: Difficulte[];
}
