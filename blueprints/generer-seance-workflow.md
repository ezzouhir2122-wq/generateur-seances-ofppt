# Blueprint — Workflow de Génération d'une Séance

## Déclencheur
Le formateur remplit le formulaire et clique sur "Générer"

## Étapes

### 1. Validation du formulaire
- Filière (ex: Développement Digital, Gestion, Électrotechnique...)
- Module (ex: M201 — Développement web)
- Durée de la séance (en heures : 1h, 2h, 4h...)
- Objectifs pédagogiques (texte libre ou liste)
- Niveau (1ère année / 2ème année)
- Type de séance (Théorique / TP / TA)

### 2. Construction du prompt
```
Génère une séance pédagogique OFPPT pour :
- Filière : [filière]
- Module : [module]
- Durée : [durée]
- Niveau : [niveau]
- Type : [type]
- Objectifs : [objectifs]

Format attendu :
1. En-tête (établissement, formateur, date, module)
2. Objectif(s) de la séance
3. Prérequis
4. Déroulement (tableau : Étapes / Activités formateur / Activités stagiaire / Durée / Supports)
5. Évaluation
6. Matériel nécessaire
```

### 3. Appel API
- POST vers `/api/generate`
- Essai Claude en premier
- Si échec → fallback OpenAI GPT

### 4. Affichage & édition
- Résultat affiché dans un éditeur de texte structuré
- Le formateur peut modifier avant d'exporter

### 5. Sauvegarde
- Sauvegarde automatique en base de données (si connecté)

### 6. Export
- Bouton PDF → génère un PDF formaté
- Bouton Word → génère un .docx
