# Portage de Immo.xlsx en webapp — Design

## Contexte

`Immo.xlsx` est un outil de screening d'investissement locatif utilisé par
Anthony (et ses proches Antho/Gilly, qui commentent déjà sur les mêmes
lignes). Le classeur contient 7 feuilles :

- **Analyse** — une ligne par bien : surface, prix, loyer moyen (calculé via
  un référentiel €/m² par ville+type), mensualité de crédit, taxe foncière,
  charges, breakeven, rentabilité nette, prix max à enchérir pour 6% de
  rentabilité nette.
- **Aide Loyer Moyen** — référentiel €/m² par "type+ville" (ex "3P
  Argenteuil" → 13.8), utilisé par un `VLOOKUP` depuis Analyse.
- **Aide m2 supp confort** — barème de bonus de surface par équipement (eau,
  gaz, élec, lavabo, WC, baignoire, douche, chauffage/pièce), recopié à la
  main dans Analyse.
- **Montage financier** — simulateur à scénarios figés (travaux 30k/20k/10k
  × loyers 1200-1600€) : mensualité banque, PNO, assurance emprunteur,
  charges, imprévus, gestion+GLI, cashflow.
- **Email** — 2 templates de mail (contact avocat, demande d'infos vente).
- **Feuille 11 / Feuille 12** — tables d'intérêts composés génériques, non
  référencées ailleurs. **Hors périmètre.**

Deux bugs identifiés dans le classeur, à corriger dans la webapp :
1. La taxe foncière (colonne L) réutilise par erreur la formule du loyer
   moyen (`(surface)*loyer_m2`) au lieu d'être une valeur indépendante.
2. Le taux de crédit utilisé dans le calcul de mensualité est codé en dur à
   2%, alors que l'en-tête de colonne affiche "3,8%".

## Décisions validées

- **Usage** : toi + quelques proches (Antho, Gilly), un seul espace de
  données partagé (pas de comptes séparés par personne).
- **Auth** : mot de passe unique partagé (pas de comptes individuels).
- **Bugs** : corrigés dans la webapp (taxe foncière = champ manuel
  indépendant, taux de crédit = champ éditable).
- **Périmètre fonctionnel** : Analyse, référentiel loyers, barème confort,
  montage financier, templates email. Feuille 11/12 exclues.
- **Stockage** : pas de base de données. Les données vivent dans un fichier
  `data.json` unique sur Google Drive, accédé via un compte de service
  Google dédié (aucun utilisateur ne se connecte à Google). Un
  export/import `.xlsx` à la demande permet de récupérer/ré-injecter un
  vrai classeur Excel.
- **Hébergement** : Vercel.

## Architecture

- **Next.js (TypeScript)** déployé sur Vercel : pages React + routes API
  serverless côté serveur pour parler à Google Drive (les identifiants du
  compte de service ne sont jamais exposés au client).
- **Tailwind** pour le style.
- **Aucune base de données** : état applicatif entièrement dans
  `data.json`, stocké dans un dossier Drive dédié au compte de service.
- **Auth** : mot de passe unique comparé à une variable d'environnement
  (`APP_PASSWORD`). Succès → cookie de session signé (HttpOnly). Toutes les
  pages et routes API vérifient ce cookie (middleware Next.js), redirigent
  vers `/login` sinon.

## Modèle de données (`data.json`)

```
{
  "biens": [
    {
      "id": string,
      "lienAnnonce": string,
      "lieu": string,          // ville
      "typePiece": string,     // "1P" | "2P" | "3P" | "4P+" ...
      "surfaceSol": number,
      "surfaceConfort": number,       // valeur stockée, utilisée telle quelle dans les calculs
      "equipements": { [label: string]: number } | null, // si renseigné, le mini-calculateur recalcule surfaceConfort = somme(quantité * m2Bonus) à chaque changement ; si null, surfaceConfort est saisie/éditée directement à la main
      "prixAchat": number,
      "prixTravaux": number,
      "tauxCredit": number,           // %, éditable (remplace le 2% codé en dur)
      "dureeCreditAnnees": number,    // défaut 25
      "loyerM2Override": number | null, // si renseigné, prime sur le référentiel
      "taxeFonciere": number,         // champ manuel indépendant (bug corrigé)
      "chargesCopro": number,
      "autresCharges": number,
      "classeEnergie": string,
      "dateVisite": string | null,
      "dateVente": string | null,
      "commentaireAntho": string,
      "commentaireGilly": string,
      "commentaireDecision": string
    }
  ],
  "referentielLoyers": [
    { "ville": string, "typePiece": string, "loyerM2": number }
  ],
  "baremeConfort": [
    { "label": string, "m2Bonus": number }
  ],
  "montageFinancier": {
    "prixAchat": number,
    "prixTravaux": number,
    "tauxCredit": number,
    "dureeCreditAnnees": number,
    "loyerHypothese": number,
    "pno": number,
    "assuranceEmprunteurMensuel": number,
    "chargesMensuelles": number,
    "enveloppeImprevus": number,
    "gestionGliPourcent": number
  },
  "emailTemplates": [
    { "titre": string, "corps": string }
  ],
  "settings": {
    "objectifRentabilitePourcent": number   // défaut 6
  }
}
```

Les colonnes calculées de l'Excel (mensualité, breakeven, rentabilité
nette, max enchères, loyer moyen si pas d'override, cashflow du montage
financier) **ne sont pas stockées** : elles sont recalculées à l'affichage
à partir des champs ci-dessus, côté client, par des fonctions pures et
testées unitairement.

## Auth & synchronisation Drive

- **Lecture** : au chargement d'une page, une route serveur télécharge
  `data.json` depuis Drive (compte de service) et le retourne au client.
- **Écriture** : sauvegarde explicite (bouton "Enregistrer" par
  section/formulaire, pas à chaque frappe) → route serveur réécrit
  `data.json` sur Drive.
- **Garde-fou anti-écrasement** : avant d'écrire, on compare le
  `modifiedTime` Drive du fichier à celui connu au moment du chargement. Si
  quelqu'un d'autre a sauvegardé entre-temps, on affiche une modale
  ("recharger la dernière version" / "forcer l'écrasement") avant
  d'écrire. Pas de vraie résolution de conflit — suffisant pour 2-3
  personnes à usage non simultané.

## Écrans

- **`/login`** — formulaire mot de passe.
- **`/`** — tableau des biens (ex-Analyse), triable/filtrable, colonnes
  calculées affichées en lecture, boutons **Exporter en Excel** /
  **Importer un Excel** dans l'en-tête.
- **Détail d'un bien** (modal ou route dédiée) — formulaire d'édition +
  mini-calculateur confort (cases à cocher équipements → surface confort
  auto, éditable manuellement en override) + choix ville+type en dropdown
  depuis le référentiel (au lieu d'une clé texte libre sujette à typo).
- **`/referentiel`** — CRUD sur `referentielLoyers`.
- **`/bareme-confort`** — CRUD sur `baremeConfort` (labels + bonus m²).
- **`/montage-financier`** — simulateur autonome, inputs libres, résultats
  recalculés en direct (mensualité, cashflow, rendement brut/net).
- **`/emails`** — liste des templates, affichage + bouton copier + édition.
- **Paramètres** — panneau (pas forcément une page dédiée) pour
  `settings.objectifRentabilitePourcent` et les valeurs par défaut de taux
  et durée de crédit utilisées à la création d'un nouveau bien.

## Import / Export Excel

- **Export** : route serveur générant un `.xlsx` (lib `exceljs`) à partir
  de `data.json`, téléchargé directement par le navigateur.
- **Import** : upload d'un `.xlsx`. Validation stricte des colonnes
  attendues (feuilles Analyse / Aide Loyer Moyen / Aide m2 supp confort)
  **avant** tout remplacement de `data.json`. En cas de colonne manquante
  ou de format invalide, message d'erreur explicite et aucune donnée
  existante n'est modifiée. Usage principal : migration initiale depuis
  `Immo.xlsx` ; réutilisable ensuite à volonté.

## Gestion d'erreurs

- Erreur Drive (réseau, quota, auth) : bannière d'erreur ; les
  modifications non sauvegardées restent en mémoire côté client (pas de
  perte de saisie).
- Conflit de sauvegarde : cf. section Auth & synchronisation Drive.
- Import Excel invalide : validation avant écriture, message explicite sur
  ce qui manque ou est mal formé.
- Mot de passe erroné : message inline sur `/login`.

## Tests

- Tests unitaires sur les fonctions de calcul pures : mensualité (PMT),
  breakeven, rentabilité nette, max enchères, sorties du montage
  financier. Ce sont les fonctions les plus sensibles (bugs déjà trouvés
  dans les formules Excel d'origine).
- Tests unitaires sur le mapping import/export Excel (round-trip : import
  d'un `.xlsx` connu → `data.json` attendu, export → structure attendue).
- Pas de suite e2e : hors de proportion pour l'échelle du projet. Tests
  manuels pour les flux d'écran.

## Hors périmètre

- Feuille 11 / Feuille 12 (tables d'intérêts composés non utilisées
  ailleurs dans le classeur).
- Comptes utilisateurs individuels / permissions différenciées.
- Résolution de conflit temps réel (multi-édition simultanée).
