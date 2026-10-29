# Alice Coiffure — carnet clientes & fidélité (PWA)

Application **interne** pour le salon *Alice Coiffure* : fichier clientes (cheveux, notes), **carte fidélité numérique à tampons** (remplace les cartes carton), agenda avec rappel SMS. Utilisée par Alice seule, **sur téléphone** (PWA installable, mobile-first), souvent **sans Internet** au salon. Pas de côté « cliente » : sa clientèle, plutôt âgée, n'en a pas besoin.

> Ce fichier fait foi pour reprendre le projet. Le mettre à jour dès qu'une décision d'architecture ou de produit change. Vérité produit : `PRODUCT.md`. Système visuel : `DESIGN.md`.

## État du projet (dernière mise à jour : 29/10/2026)

- **Refonte complète faite le 29/10/2026** (design + fonctionnel) ; sauvegarde de l'état précédent : `Versions/V3-avant-refonte-design.zip`.
- **Données réelles persistées sur le téléphone** (localStorage), architecture *local d'abord* avec file d'attente de synchro **prête pour Firebase** (pas encore branché : `.env` vide → mode 100 % local).
- Fonctionnel : créer / modifier / supprimer une cliente (avec reprise des tampons de la carte carton), recherche (sans accents, par mots ou numéro), carte fidélité (poinçonner, annuler, offrir la récompense → nouvelle carte), historique des passages, agenda par semaine, créer / modifier / annuler un RDV (alerte de chevauchement), rappel SMS pré-rempli, réglages (objectif + texte de récompense), sauvegarde / restauration fichier JSON, démo fictive, tout effacer.
- **Ajouts du 29/10/2026 (2ᵉ passe)** :
  - Nouvelle cliente saisie directement dans le formulaire de RDV : une fiche provisoire `aCompleter: true` est créée avec le RDV, puis signalée par la cloche de l'accueil (qui regroupe TOUTES les notifications : récompenses à offrir + fiches à compléter ; rien ne s'affiche sous la recherche) (pastille = nombre de fiches ; un tap déplie depuis la cloche un petit panneau `shared/ui/popover.js` qui les liste) et sur la fiche.
  - Sélecteur d'heure maison (`shared/ui/timePicker.js`).
  - Panneau « Choisir le créneau » : premiers créneaux libres, calendrier du mois (fermé / complet), déroulé du jour avec les heures où la prestation tient.
  - Jours et horaires de travail réglables dans Réglages.
  - Bandeau « Installer l'app » adapté à la plateforme en haut de l'accueil (fermable, revient après 14 jours ; masqué une fois installée) + carte permanente en haut de Réglages.
  - Bloc de statistiques compact en haut de Réglages ; menu « ⋯ » sur les RDV (Modifier / Annuler / Pas venue) ; carte fidélité dans le talon des RDV.
  - Réglages rangés par catégories : sommaire `#/reglages` (Salon, Carte fidélité, Sauvegarde, Données, chacune avec un résumé) puis une page par catégorie `#/reglages/:section`.
- Le dossier **n'est pas un dépôt git** (voir « Pièges »).

## Lancer / tester

Aucune dépendance npm, pas de bundler : modules ES natifs servis tels quels.

```bash
npm start          # = node server.mjs → http://localhost:5174/ (+ adresse Wi-Fi pour tester sur téléphone)
npm test           # tests Node de la logique métier (node --test, sans navigateur)
npm run build      # dist/ = fichiers du site + config/env.js (production, Vercel)
npm run env        # régénère config/env.js depuis .env (dev)
```

- Port : **5174** (`PORT=xxxx` pour changer). Le serveur refuse de servir `.env`, `.claude`, `Versions`…
- Vérifier à **largeur mobile** (~390 px). Premier lancement : fichier vide → bouton « Essayer avec des clientes fictives » (ids `demo-…`, effaçables via Réglages → Tout effacer). **La démo n'est proposée qu'en développement** (localhost / réseau local, `clientService.canLoadDemo`) : en production elle enverrait de fausses fiches dans Firebase, où rien ne s'efface.

## Mode d'emploi (`guide/`)

Page autonome pour Alice (non développeuse, peu à l'aise avec le numérique) : tutoiement, une action par étape, mots des boutons en « touches », une capture par étape, mémo des 5 gestes, imprimable. Servie à **/guide/** (lien « Mode d'emploi » dans Réglages, inclus dans `npm run build`). Captures prises avec les clientes fictives sur iPhone simulé (puppeteer, 390 px, DPR 2, JPEG) : **à refaire si l'interface change** visiblement (mêmes noms de fichiers `guide/img/NN-*.jpg`).

## Dépôt & déploiement

- **GitHub** : <https://github.com/Jimisow/Alice-Coiffure> (**public**, branche `main`), mis à jour le 29/10/2026 à la demande du propriétaire. Ne jamais pousser sans son accord explicite. Hors dépôt (`.gitignore`) : `.env`, `config/env.js`, `dist/`, `Versions/` (zips locaux), `.claude/` et `.gemini/` (outillage local), `.vercel/`, `.env.local`.
- **Vercel** : projet **`alice-coiffure`** (équipe *kump*, compte jimisow), relié au dépôt GitHub → **chaque push sur `main` redéploie en production**. URL : **<https://alice.kump.fr>** (domaine perso, DNS chez IONOS → Vercel) ; aussi <https://alice-coiffure.vercel.app>.
  - `vercel.json` : build `npm run build`, sortie `dist/`, pas d'installation ; `no-cache` sur `/`, `index.html`, `sw.js`, `manifest.json`, `config/env.js`.
  - Variables d'environnement Vercel : les 6 `FIREBASE_*` (Production, Preview, Development). `scripts/env.mjs` les lit (elles priment sur `.env`) ; **sur Vercel, le build échoue si elles manquent** (évite un site en ligne sans synchro).
  - Seuls les fichiers du site sont publiés (`CLAUDE.md`, `server.mjs`, tests… → 404).
  - Vérifié le 29/10 : site en ligne, service worker actif, connexion du compte d'Alice + synchro OK depuis le domaine Vercel.
- Après un changement du shell (CSS, `index.html`) : incrémenter `CACHE_NAME` dans `sw.js` avant de pousser.
- Les services/repositories s'importent dans Node : le store bascule en mémoire sans `localStorage` (voir `tests/`).
- Le service worker **n'intercepte rien sur `localhost`** (volontaire). Hors-ligne testable depuis un autre hostname en HTTPS (ou `127.0.0.1`).
- Chrome headless (puppeteer-core) : `browser.close()` peut rester bloqué sous Windows → `process.exit()`.

## Stack

| Élément | Choix |
|---|---|
| JS | Vanilla, **modules ES**, pas de framework ni bundler |
| Rendu | `render…(container, ctx)` → `innerHTML` (gabarit littéral) puis branchement des événements |
| Style | **CSS maison** `css/tokens.css` + `base.css` + `components.css` (Tailwind CDN abandonné) |
| Polices | Archivo (variable, axe largeur) + Geist Mono — Google Fonts |
| Routage | hash (`#/clientes/42`) avec `history.state.idx` → bouton retour du téléphone OK |
| Données | localStorage (source de vérité) + outbox → Firestore (à activer) |
| Serveur dev | `server.mjs` (Node natif, 0 dépendance) |

## Arborescence

```
index.html               coquille : #app-main, #app-nav, #app-toast ; contrat de design en commentaire
server.mjs               serveur statique de dev (génère config/env.js au démarrage)
scripts/env.mjs          .env → config/env.js (FIREBASE_* uniquement)
.env / .env.example      config Firebase (vide = local) — .env est ignoré par .gitignore
config/env.js            GÉNÉRÉ, ne pas éditer
firestore.rules          règles à publier : salons/{uid}/… accessible au seul compte uid
manifest.json, sw.js     PWA
css/                     tokens.css (jetons), base.css (reset, shell), components.css (tous les composants)
images/Titre.png         logo (fond blanc ; recadré en 2:1 par CSS dans .masthead)
guide/                   MODE D'EMPLOI pour Alice (guide/index.html, captures dans guide/img/) → alice.kump.fr/guide/, lien dans Réglages
tests/*.test.mjs         tests Node (fidélité, recherche, suppression…)
js/
  main.js                assemble routeur + synchro + SW ; aucune logique métier
  app/
    routes.js            REGISTRE : onglets (tabs) + routes — seul fichier à toucher pour brancher une feature
    router.js            routeur hash ; fournit ctx aux vues
    bottomNav.js, toast.js, serviceWorker.js
    install.js           « Installer l'app » selon la plateforme (Android : invite native ; iPhone : guide Partager → écran d'accueil ;
                         navigateur intégré : copier le lien) — exposé aux vues par ctx.install.mount(slot, { dismissible })
  features/              UN DOSSIER PAR FONCTIONNALITÉ (index.js = API publique)
    clients/             liste+recherche, fiche, formulaire (création/édition/suppression), clientService
    loyalty/             règles + carte poinçonnée + mini-carte + historique (loyaltyService)
    appointments/        agenda semaine, ticket RDV, formulaire RDV (+ nouvelle cliente à la volée), constants (modèles),
                         prestationService + prestationsEditor (Réglages → Prestations)
                         scheduleService (horaires de travail), availabilityService (créneaux libres),
                         slotPickerSheet (panneau calendrier + déroulé du jour), openingHoursEditor (Réglages)
    reminders/           lien SMS de rappel
    settings/            sommaire (stats + catégories) puis pages Salon, Carte fidélité, Sauvegarde, Données
    stats/               statsService (calculs) + statsPanel (bloc compact affiché dans Réglages)
  data/                  COUCHE DONNÉES (seul endroit qui sait où vivent les données)
    index.js             point d'entrée unique (repositories + synchro + sauvegardes)
    local/store.js       localStorage, pierres tombales, outbox, export/import
    local/repositories.js  clientRepository, appointmentRepository, visitRepository, settingsRepository
    sync/syncEngine.js   push outbox / pull distant, statut observable
    sync/firebaseRemote.js  adaptateur Firebase (SDK chargé seulement si configuré)
    demoData.js          clientes fictives
  shared/                sans logique métier : ui/icons.js, ui/components.js (topbar, emptyState, perforation…),
                         ui/drawer.js (panneau <dialog> du bas), ui/popover.js (panneau ancré sous un bouton), ui/timePicker.js (heure en 2 taps), utils/
Versions/                archives zip (V1 site vitrine, V2 avant refonte archi, V3 avant refonte design)
.claude/, .gemini/       skill « impeccable » + hooks — outillage, ne pas modifier
PRODUCT.md, DESIGN.md    vérité produit / système visuel (skill impeccable)
```

## Règles d'architecture (à respecter)

```
main.js → app/ → features/*/index.js → (features/* internes) → data/index.js → data/local|sync
                                      ↘ shared/  (importable de partout, n'importe rien d'autre)
```

1. **Une feature = un dossier** avec `index.js` public. Une feature n'importe une autre feature **que via son `index.js`**. Il existe un cycle clients ↔ appointments (fiche ↔ agenda) : sans danger tant qu'aucun module n'utilise l'autre **au chargement** (seulement dans des fonctions).
2. **Les vues n'accèdent jamais aux données directement** : vue → service → `data/index.js`. Même l'écran Réglages passe par `settingsService`.
3. **Les vues ne touchent pas au shell** : elles utilisent `ctx` (`navigate(path, {replace})`, `back(fallback)`, `toast(msg, {action})`, `params`, `query`, `isCurrent()`, `install.mount(slot, opts)`).
4. Écouteurs : sur l'élément `.screen` rendu (`container.firstElementChild`), **jamais sur `container`** (`#app-main` survit aux rendus → écouteurs empilés). Délégation pour les listes.
5. Après un `await`, vérifier `ctx.isCurrent()` avant d'écrire dans le DOM (navigation rapide).
6. `shared/` : pas de logique métier, n'importe aucune feature.

### Ajouter une fonctionnalité

1. `js/features/<nom>/` : vues, `<nom>Service.js`, `index.js` exportant éventuellement un onglet `{ id, label, icon, path }` et des routes `{ path, tab, render }`.
2. Les ajouter dans `js/app/routes.js` (ordre : chemins spécifiques avant `:id`).
3. Données : ajouter un repository dans `data/local/repositories.js` (via `createRepository(collection, prefix)`), la collection dans `COLLECTIONS` de `store.js`, l'exporter dans `data/local/index.js` puis `data/index.js`.
4. UI : réutiliser les composants de `DESIGN.md` ; nouveau composant → `css/components.css` + mise à jour de `DESIGN.md`.
5. Mettre à jour ce fichier.

## Données & synchronisation

**Local d'abord** : toute lecture/écriture se fait dans localStorage (clé `alice-coiffure:v1`) → instantané et hors-ligne. Chaque document porte `updatedAt` (ms) ; une suppression laisse une **pierre tombale qui garde le contenu** `{ ...doc, deleted: true, deletedAt, updatedAt }` (Corbeille + archive) ; chaque écriture ajoute `collection/id` à l'**outbox**.

Le moteur `sync/syncEngine.js` (inactif sans config) : au retour du réseau, 2 s après une écriture, toutes les 5 min → **push** de l'outbox, puis **pull** des docs dont `syncedAt` > curseur, fusion *le plus récent `updatedAt` gagne*. Le curseur est l'heure **serveur** (sinon une modif hors-ligne d'un autre téléphone envoyée plus tard serait ratée). Un doc modifié pendant l'envoi reste dans l'outbox. Chaque appel Firestore est borné à 20 s (`withTimeout`) : le SDK réessaie sinon en silence (piège déjà vécu sur Micka Poulet).

### Firebase : projet partagé « outils » (`outils-6b1f4`)

- **Projet commun à plusieurs apps** (Micka Poulet + Alice Coiffure), une **app web Firebase par app**. Config web dans `.env` (app « Alice Coiffure ») → `config/env.js`. L'instance SDK est nommée `alice-coiffure`.
- **Rangement** : tout Alice Coiffure est sous la collection racine **`aliceCoiffure`** :
  - `aliceCoiffure/{uid}/{clients|appointments|visits|settings}/{id}` : données (+ `syncedAt` serveur) ;
  - `aliceCoiffure/{uid}/archive/{collection}__{id}` : `{ collection, id, data, deletedAt, archivedAt }` = **copie complète de tout ce qui est supprimé** (fiche, passage, RDV annulé, « Tout effacer »). Micka Poulet vit sous `shops/…`.
- **Rien n'est jamais effacé dans Firebase** : `delete` interdit par les règles. Une suppression = entrée d'archive + pierre tombale `{ id, deleted, deletedAt, updatedAt, syncedAt }` (propage la suppression aux autres appareils).
- **Corbeille** (Réglages → Sauvegarde) : `data/trash.js` fusionne les pierres tombales locales (contenu gardé) et l'archive cloud (si connectée, utile sur un nouveau téléphone). « Restaurer » une fiche ramène aussi les passages/RDV supprimés en même temps (± 2 min, `clientService.restoreClient`).
- **Auth** : e-mail / mot de passe, comptes créés dans la console (pas d'inscription dans l'app). Comptes : **Alice** (production) et **Admin** (tests du propriétaire, son propre dossier — identifiants connus du propriétaire, jamais notés ici). Chaque compte a son dossier `aliceCoiffure/{uid}` : ils ne se voient pas.
- **Un téléphone = un compte** (`store.meta.owner`, fixé à la 1ʳᵉ connexion) : `syncEngine.signIn` refuse et déconnecte un autre compte (sinon les fiches locales partiraient dans le mauvais dossier). Pour tester avec le compte Admin : un autre téléphone / navigateur / profil.
- **Règles** : `firestore.rules` est un **fichier COMMUN** aux deux apps (une base = un seul jeu de règles ; publier remplace tout). Bloc Micka recopié **à l'identique** ; bloc Alice : accès au seul `aliceCoiffure/{son uid}` et seulement avec un compte `password` (les comptes anonymes de Micka n'y ont pas accès), collections imposées, horodatage serveur, `delete` interdit. ⚠ Le dépôt Micka Poulet a encore son ancien fichier (bloc Micka seul) : **le recopier là-bas** avant toute publication depuis ce dépôt-là, sinon les règles d'Alice disparaissent.
- Vérifier : `npm run check:firebase` (lecture seule). Avec le compte d'Alice — sous Windows cmd : `set "EMAIL=…" & set "PASSWORD=…" & npm run check:firebase` ; PowerShell : `$env:EMAIL="…"; $env:PASSWORD="…"; npm run check:firebase` (la forme `EMAIL=… npm run …` ne marche qu'en bash).
- Une pierre tombale reçue d'un autre appareil n'a pas de contenu : la Corbeille prend alors celui de l'archive cloud (`trash.js`, `hasContent`). La synchro se relance aussi quand l'app revient au premier plan (`visibilitychange`). Publier : console (copier-coller) ou `npm run deploy:rules`.

### Mise en service (état au 29/10/2026) — ✅ OPÉRATIONNELLE

1. ✅ `.env` rempli (app web « Alice Coiffure » du projet outils), base Firestore existante.
2. ✅ Authentication e-mail/mot de passe activée ; compte d'Alice créé (identifiant connu du propriétaire, **pas** noté ici).
3. ✅ `firestore.rules` (fichier commun) publié ; `npm run check:firebase` avec le compte d'Alice : tout ✓.
4. ✅ **Test de bout en bout réussi contre le vrai projet** (3 navigateurs vierges = 3 téléphones) : création → envoi → réception sur B ; modification sur B → reçue sur A ; suppression sur A → disparaît sur B + copie dans l'archive ; téléphone neuf C → fiche retrouvée dans la Corbeille via l'archive cloud → restaurée avec tampons et passages → revenue sur A.
5. Restes de test dans l'archive d'Alice : 2 fiches « ZZ Test-synchro » + leurs passages (pierres tombales). Inoffensifs ; supprimables à la main dans la console (Firestore → aliceCoiffure/{uid}/archive et clients/visits) si on veut une base vierge.
6. Déployé sur **https://alice.kump.fr** (+ alice-coiffure.vercel.app) ; connexion + synchro vérifiées sur les deux. Recommandé : ajouter `alice.kump.fr` (et `alice-coiffure.vercel.app`) dans **Authentication → Settings → Domaines autorisés** (utile pour les futurs e-mails de réinitialisation de mot de passe) ; conseiller à Alice de changer son mot de passe (il a circulé pendant les tests).
7. ⚠ Le dépôt Micka Poulet a encore son ancien `firestore.rules` (sans le bloc Alice) : le remplacer par le fichier commun avant toute publication depuis ce dépôt.

## Modèle de données

Noms de champs **en français** (vocabulaire du salon) — ne pas les renommer.

```js
Client = {
  id: 'cli-…' | 'demo-c1',
  prenom, nom,                 // prénom obligatoire
  telephone,                   // formaté « 06 12 34 56 78 » ; telHref() pour tel:/sms:
  natureCheveux,               // texte libre, mots séparés par des virgules (affichés en badges)
  notes,
  fidelite: { tampons, recompensesOffertes },   // l'objectif est GLOBAL (réglages)
  creeLe: 'YYYY-MM-DD',
  derniereVisite: 'YYYY-MM-DD' | null,          // maintenue par loyaltyService
  aCompleter: boolean,         // fiche provisoire créée depuis un RDV ; repasse à false à l'enregistrement du formulaire
  updatedAt,                   // posé par le store
}

Visit (passage) = { id: 'pas-…', clientId, type: 'tampon' | 'recompense', date: 'YYYY-MM-DD', prestation }

Appointment = { id: 'rdv-…', clientId, prestation, date: 'YYYY-MM-DD', heureDebut: 'HH:MM', dureeMinutes, notes,
                statut: null | 'absente' | 'termine',   // absente = pas venue sans prévenir ; termine = fini plus tôt
                dureePrevue?, finAvancee? }             // durée d'origine (gardée quand « Terminé » ou « Je finis bientôt » raccourcit dureeMinutes) ; fin avancée en attente de « Terminé »

Settings (doc unique id 'salon') = {
  fidelite: { objectif: 10, recompense: 'Une prestation offerte' },
  horaires: { '0'..'6': { ouvert, plages: [{ debut: 'HH:MM', fin: 'HH:MM' }] } },  // clé = getDay(), '0' = dimanche
  prestations: [{ nom, duree }],   // Réglages → Prestations (absent = modèles de constants.js)
}   // pas de tableaux imbriqués (refusés par Firestore). Défaut : mardi→samedi 9h-12h/14h-19h, samedi 9h-17h.
```

### Durée libre d'un RDV (`dateUtils.parseDuration`)

Puce-champ « Autre » à la suite des puces de durée (texte, clavier décimal, pas de légende : la règle est dans l'aria-label), avec aperçu en direct à côté (« = 2 h 10 ») : `1`–`9` = heures ; `10` et plus = minutes ; `2.10` / `2,10` / `2h10` = 2 h 10 ; **un seul chiffre après le séparateur = dizaines** (`1.5` = 1 h 50, choix validé avec le propriétaire). Refusé : minutes > 59, heures à 2 chiffres avec séparateur, < 5 min, > 10 h → « Durée non reconnue » et l'enregistrement est bloqué. `durationToInput()` fait l'inverse pour pré-remplir.

### Fin anticipée et cliente sans rendez-vous

Sur le RDV **en cours** (`isInProgress`), bouton « Terminé » (`finishNow`) : `dureeMinutes` devient la durée réelle (l'originale est gardée dans `dureePrevue`), ce qui libère la fin du créneau ; un **panneau** (`openDrawer`) demande aussitôt « Poinçonner sa carte ? » (5/10 → 6/10). Oui = tampon ; Non (ou fermeture) = le RDV reste terminé et un toast « Poinçonner » laisse une seconde chance. Carte déjà pleine : pas de panneau, toast « récompense à offrir ». Dans l'agenda du jour, bandeau **« Libre maintenant jusqu'à HH:MM »** (`getFreeNow` : dans les horaires, aucun RDV non absent en cours, trou ≥ 15 min) avec « Placer quelqu'un maintenant » → formulaire de RDV pré-réglé (`?jour=…&heure=HH:MM`, l'heure n'est alors pas recalée sur le premier créneau libre).

### Menu « ⋯ » d'un RDV (agenda)

Le ticket n'affiche que les actions du quotidien (Appeler, Rappel SMS, ou « Terminé » si en cours). Le bouton « ⋯ » ouvre un popover : **Modifier**, **Annuler le rendez-vous** (confirmation, puis « Rétablir » dans le toast), et à part, plus petit et gris, **« Pas venue, sans prévenir »** (seulement une fois l'heure passée). Volontairement séparés : une annulation (la cliente a prévenu) n'est pas une absence. Le talon du ticket montre la carte fidélité de la cliente (« 7/10 », ou « À offrir » en or).

### Statistiques (`features/stats/`)

`computeStats()` calcule à la volée (rien n'est stocké) ; `renderStatsPanel()` l'affiche en **un seul bloc compact** en haut du sommaire Réglages : passages du mois (+ écart vs mois précédent), clientes venues, récompenses offertes ; mini-histogramme des passages sur 6 mois (tap = valeur) ; une ligne de repères (clientes à relancer > 3 mois, cartes presque pleines, % de RDV non honorés sur 3 mois, prestation la plus demandée sur 12 mois). Masqué si le fichier est vide.

### « Je finis bientôt » (appel pendant une cliente)

Sur le RDV en cours, à côté de « Terminé ». Panneau « Je finis dans… » : 5 / 10 / 15 / 20 / 30 min (heure de fin affichée, arrondie aux 5 min, `endTimeIn`) ou « Autre heure de fin… » (sélecteur maison). `setEndSoon` avance la fin (`dureeMinutes` raccourcie, `dureePrevue` gardée, `finAvancee: true`), puis le formulaire de RDV s'ouvre à cette heure (`?heure=`). Le ticket affiche « Fin avancée à HH:MM ». Tant que « Terminé » n'est pas tapé, le RDV reste **en cours** même si Alice déborde (`isInProgress`) et le bandeau « Libre maintenant » ne s'affiche pas ; un dépassement sur le RDV suivant est signalé par l'avertissement de chevauchement habituel.

### Agenda : catégories repliées

Les RDV du jour affiché sont rangés par `agendaCategory()` : **à venir / en cours** dépliés en haut, puis **Terminés** (statut `termine` ou heure de fin passée) et **Absentes**, repliés dans des `<details>` natifs avec leur nombre. Un tap déplie.

### Absences (« lapins »)

Sur le ticket d'agenda, bouton discret « Absente » visible seulement une fois l'heure du RDV arrivée (`canMarkNoShow`) ; annulable (toast + « Elle est venue finalement »). Un RDV absent **libère son créneau** (ignoré par les disponibilités et les chevauchements) et n'apparaît plus dans les RDV à venir. La fiche cliente affiche « N rendez-vous manqués sans prévenir · dernier le … », rappelé aussi quand on la choisit dans le formulaire de RDV (`getNoShowsForClient`).

### Créneaux libres (`features/appointments/availabilityService.js`)

Plages d'ouverture du jour − RDV existants (hors RDV en cours d'édition) = trous ; dans chaque trou, heures de début tous les **15 min** où la durée tient ; aujourd'hui, pas avant l'heure actuelle. `findNextSlots` propose le début de chaque trou (2 max par jour, 60 jours max). Un RDV hors horaires ou qui en chevauche un autre est **signalé, jamais bloqué**. Un nouveau RDV se cale sur le premier créneau libre tant qu'Alice n'a pas choisi elle-même.

Repositories (tout `async`) : `getAll, getById, add, update(id, patch), remove(id)` ; + `appointmentRepository.getByDate/getByClient`, `visitRepository.getByClient`, `settingsRepository.get/update`.

### Règles fidélité (`features/loyalty/loyaltyService.js`)

1 tampon par passage ; carte pleine à `objectif` (4–20, 10 par défaut) → plus de tampon possible tant que la récompense n'est pas offerte ; « Offrir la récompense » (confirmation) remet à 0, incrémente `recompensesOffertes` et journalise un passage `recompense`. Un tampon s’annule depuis le toast (supprime le passage). Bouton discret **« −1 »** sous le compteur de la carte (`removeLastStamp`) : retire un tampon et le dernier passage `tampon` s’il existe (les tampons repris du carton n’en ont pas), annulable via le toast (`restoreStamp`). Les tampons se corrigent aussi dans le formulaire de la fiche.

## Conventions

### Code
- Interface et commentaires en **français** ; identifiants de domaine en français, techniques en anglais.
- Commentaires : uniquement le *pourquoi* non évident.
- **Toute donnée utilisateur injectée en HTML passe par `escapeHtml()`** (vues en `innerHTML`).
- Dates : toujours via `shared/utils/dateUtils.js`. **Jamais `toISOString().slice(0,10)`** (date UTC) → `todayISO()` / `toISODate()`.
- État de module entre rendus : seul cas assumé `searchQuery` (clientsView, restaure la recherche au retour d'une fiche).
- Confirmations destructives : `confirm()` natif (+ `prompt('EFFACER')` pour tout effacer).
- Choix qui demandent toute l’attention (heure, créneau) : `openDrawer()` (`<dialog>` natif, se ferme au bouton retour du téléphone). Pas d’autre modale.

### UI / design
- Voir **`DESIGN.md`** (jetons, composants, règles). Pas de hex dans les vues, icônes uniquement `shared/ui/icons.js`.
- Chaque écran : `<div class="screen">` ; écrans secondaires avec `topbar()` (retour + action) ; onglets avec `.page-head`.
- L'or est réservé à la fidélité/récompense.
- Le hook du skill **impeccable** analyse chaque fichier UI modifié ; tenir compte de ses retours. Le contrat de design est en commentaire en tête de `<body>` d'`index.html`.

### PWA / service worker
- `sw.js` : app shell précaché + *stale-while-revalidate* ; ne met jamais en cache Firestore/Auth (`*.googleapis.com` hors polices).
- Après un changement du shell précaché (CSS, index), **incrémenter `CACHE_NAME`** (actuellement `alice-coiffure-v9`).
- **Icônes d’app** (`images/`) : `icon-192`, `icon-512`, `icon-maskable-512` (dessin dans le cercle central 80 %), `apple-touch-icon` (180), `favicon-48`. Générées depuis `Titre.png` : recadrage serré sur « Alice », « COIFFURE » masqué (illisible en petit), traits épaissis. Un téléphone garde l’ancienne icône tant que l’app n’est pas supprimée puis réinstallée.

## Pièges connus

- **Pas de git** : avant un gros changement, zip dans `Versions/`, ou `git init` (à décider avec le propriétaire ; **ne jamais pousser** sans accord explicite).
- **localStorage n'est pas éternel** : effacement des données du navigateur = perte. D'où `navigator.storage.persist()`, la sauvegarde fichier, et Firebase à activer rapidement. Sur iPhone, installer la PWA sur l'écran d'accueil (Safari peut purger le stockage des sites non installés après 7 jours sans visite).
- `config/env.js` est généré : un déploiement statique sans `npm run env` = pas de Firebase (l'app marche quand même en local).
- La config web Firebase n'est pas secrète ; la sécurité = Auth + `firestore.rules`. Ne jamais mettre de mot de passe dans `.env`.
- **Règles Firestore communes** à plusieurs apps : ne jamais publier un fichier qui ne contient pas le bloc de CHAQUE app du projet « outils ».
- Le skill `impeccable` existe en double (`.claude/skills`, `.gemini/skills`) : copies d'outillage, ne pas toucher.

## Dette technique et pistes (par priorité)

1. Indicateur de synchro discret sur l’accueil (état en ligne / en attente) ; aligner le `firestore.rules` du dépôt Micka Poulet.
2. (fait le 29/10) Icônes d’app dédiées.
3. (fait le 29/10) Prestations et durées réglables dans Réglages → Prestations (`prestationService` ; `constants.js` ne sert plus que de modèle d’origine).
4. Vue « jour » de l'agenda en frise horaire ; RDV récurrents (mise en plis hebdomadaire).
5. Toast d'annulation : il survit à la navigation (l'annulation reste valide, mais on pourrait le masquer en quittant la fiche).
6. Import en masse des clientes (CSV) si Alice a un fichier existant.

## Historique

- **V1** (`Versions/V1.zip`, août 2026) : version « site vitrine » + admin. Abandonnée.
- **Août 2026** : MVP back-office sur données fictives.
- **24/10/2026** : refonte d'architecture par fonctionnalités + repositories (`Versions/V2-avant-refonte-archi.zip`).
- **29/10/2026** : refonte complète (`Versions/V3-avant-refonte-design.zip`) — nouveau design « carnet à souches & carte poinçonnée » en CSS maison (fin de Tailwind CDN), persistance locale + outbox de synchro Firebase, CRUD clientes, historique de passages, récompense, agenda semaine + édition RDV, réglages/sauvegardes, routage hash, serveur Node, tests Node, PRODUCT.md / DESIGN.md.
