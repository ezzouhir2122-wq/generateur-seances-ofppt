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

export interface ExerciceChiffre {
  enonce: string;            // Consigne : ce que le stagiaire doit calculer / contrôler
  reponseAttendue: number;   // Valeur numérique exacte attendue
  unite?: string;            // Ex : "MAD", "%", "" (sans unité)
  tolerance?: number;        // Écart absolu toléré (défaut 0)
  explication: string;       // Correction détaillée affichée après validation
  impactScore: number;       // Gain si correct (positif)
  impactSatisfaction: number;
  impactFinancier: number;
  impactMoral: number;
}

export interface EvenementNarratif {
  ordre: number;
  templateType: string;
  titre: string;
  description: string;
  contexte: string;
  personnageImplique: string;
  documentAttache?: string;
  // Variante QCM (décision) : choixA/B/C présents.
  choixA?: Choix;
  choixB?: Choix;
  choixC?: Choix;
  // Variante exercice chiffré (saisie libre) : exercice présent à la place des choix.
  exercice?: ExerciceChiffre;
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
  titre: string;
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
