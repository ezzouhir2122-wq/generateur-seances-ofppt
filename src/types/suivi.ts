export interface GroupeSummary {
  id: string;
  nom: string;
  filiere: string;
  filiereNom: string;
  annee: string;
  createdAt: string;
  _count: { stagiaires: number };
}

export interface ProgressionItem {
  competenceId: string;
  pourcentage: number;
  source: string;
}

export interface StagiaireItem {
  id: string;
  nom: string;
  prenom: string;
  cne: string | null;
  createdAt: string;
  progressions: ProgressionItem[];
}

export interface CompetenceItem {
  id: string;
  titre: string;
  moduleNom: string;
}

export interface GroupeDetail {
  id: string;
  nom: string;
  filiere: string;
  filiereNom: string;
  annee: string;
  stagiaires: StagiaireItem[];
  competences: CompetenceItem[];
}

export interface FiliereOption {
  id: string;
  nom: string;
  secteurNom: string;
}
