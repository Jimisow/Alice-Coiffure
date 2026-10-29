# Design — Alice Coiffure

Monde visuel : **carnet à souches & carte poinçonnée**. L'app est le carnet d'Alice : chaque fiche est un ticket de papier posé sur le comptoir, chaque passage un vrai trou de poinçon. Mode *Operate* : la tâche prime, la marque vit dans les détails.

## Couleurs (`css/tokens.css`)

| Jeton | Valeur | Rôle |
|---|---|---|
| `--ground` | `#E6E4DE` | comptoir pierre, fond de l'app ; aussi la couleur des encoches de perforation |
| `--paper` / `--paper-2` | `#FFF` / `#F5F4F0` | tickets, barres / puits internes |
| `--ink` / `--ink-2` / `--ink-3` | `#17140F` / `#57524A` / `#6F6A61` | texte + action principale / secondaire / placeholders |
| `--rule` / `--rule-soft` | `#D6D2C8` / `#ECE9E3` | pointillés, bordures / séparateurs internes |
| `--gold*` | `#B3873C`, strong `#8A6424`, ink `#775516`, wash `#F7EEDB`, rule `#E2CB98` | **réservé à la fidélité / récompense** |
| `--danger*` | `#A8382B` / `#FBEAE6` | suppression |
| `--hole` | `#1A1713` | intérieur d'un trou poinçonné |

Stratégie *restreinte* : neutres + encre ; l'or n'apparaît que lorsqu'il signifie « récompense ». Pas de mode sombre (usage en salon éclairé).

## Typographie

- **Archivo** (variable, axe `wdth`) pour tout ; titres en `font-stretch: 72–85%`, graisse 720–800.
- **Geist Mono** uniquement pour les données : heures, numéros de téléphone, compteurs, dates d'historique.
- Taille de base 16 px, champs 17 px (pas de zoom iOS), rien d'utile sous 12,5 px.

## Composants (`css/components.css`)

- `.ticket` : papier blanc, rayon 14 px, ombre douce décalée. `.ticket--gold` pour les récompenses.
- `.perf` : pointillés 2 px + deux encoches en demi-lune couleur `--ground` (le ticket « se détache »). Dans un ticket, la variable `--pad` aligne la perforation sur les bords.
- `.masthead` : souche blanche du haut de l'accueil, bord inférieur festonné.
- `.punchcard` + `.hole` : trous en pointillés numérotés → `is-next` (contour plein) → `is-punched` (trou noir ombré) ; le dernier trou `hole--reward` (cadeau, or). **Moment signature** : `is-just-punched` + `.hole__chad` (le trou s'ouvre, la pastille de carton tombe) + vibration.
- `.minicard` : la carte en 2 rangées de points dans la liste.
- `.btn` (une seule forme) : `--primary` encre, `--gold` récompense, `--ghost` bordé, `--quiet` transparent, `--danger` ; tailles `--sm` 38 px, défaut 44 px, `--lg` 56 px.
- `.chip` (`aria-pressed` = sélectionnée → encre pleine), `.badge`, `.input`, `.stepper`, `.notice`, `.empty`, `.toast` (encre, action en or clair), `.tabbar` (onglet actif marqué d'un petit trou).
- `.appt` : ticket de RDV avec talon horaire à gauche séparé par une perforation verticale.

- Installation : `.install` (ticket à contour encre, pastille-icône téléphone, bouton primaire, croix) ; `.install--card` sans croix (Réglages) ; `.install-steps` (guide iPhone : pastilles numérotées encre + icônes Partager / Ajouter).
- Fiche **à compléter** : `.badge--draft` dans les listes, `.bell` + `.bell__count` (cloche discrète en haut à droite de la souche, pastille encre) qui déplie un `.popover` (panneau ancré sous la cloche, pointe vers elle, animation depuis le coin haut droit) listant les fiches ; `.ticket--draft` (contour pointillé) seulement sur la fiche elle-même ; `.newclient` même langage dans le formulaire de RDV.
- Durée libre : `.duree-custom__input` = une puce-champ « Autre » + aperçu « = 2 h 10 ».
- `.field-btn` : bouton-champ (étiquette + valeur) pour date et heure ; `.chip--slot` créneau proposé (date + heure en mono).
- `.drawer` : panneau `<dialog>` qui monte du bas, coins 20 px, en-tête collant. Contenus : `.tp` (sélecteur d'heure : grille 4 col. d'heures, 6 col. de minutes), `.cal` (mois : jour **fermé = hachures**, **complet = numéro barré**, points = nombre de RDV, jour choisi = encre), `.dayplan` (`.slot--busy` hachuré, `.slot--free` + puces d'heures `.chip--time`, `.slot--short` sur une ligne grise).
- « Je finis bientôt » : `.soon__grid` (5 grosses touches : minutes en mono + heure de fin) + `.appt__soon` (« Fin avancée à HH:MM » sur le ticket).
- Fin de RDV : `.finish` dans un `.drawer` (question, « 5/10 › 6/10 » en mono, Oui primaire / Non discret).
- RDV en cours : `.appt.is-now` (liseré encre intérieur) + bouton primaire « Terminé » ; `.free-now` (ticket « Libre maintenant », point encre qui pulse doucement).
- Réglages : `.settings-menu` (sommaire, une ligne par catégorie avec pastille d’icône) + `.settings-intro`.
- Notifications : `.popover` regroupé par `.notif-group` (titre + icône, `--gold` pour les récompenses), séparés par un pointillé.
- Ticket RDV : `.appt__loyalty` (pastille mono « 7/10 » tout en bas du talon via margin-top: auto, `--full` or « À offrir ») ; bouton « ⋯ » → `.popover` avec `.menu__item` (`--danger` pour Annuler) et `.menu__aside` (séparé par un pointillé, `--quiet` pour « Pas venue »).
- Statistiques : `.stats` (un seul ticket) = `.kpis` (3 chiffres mono, récompenses en or) + `.minibars` (6 barres fines, mois courant en encre, tap = valeur dans `.stats__readout`) + `.stats__notes` (une ligne). Une seule couleur de données : l’encre.
- Agenda : `.fold` (`<details>` à bord pointillé, icône + libellé + compteur mono + chevron) pour Terminés / Absentes ; les tickets terminés y sont atténués.
- Absence : `.appt.is-noshow` (ticket à plat, contour pointillé, nom et heure barrés) + `.badge--danger` ; `.noshow-note` (bandeau rouge pâle) sur la fiche et dans le formulaire de RDV.
- `.hours-day` + `.switch` (interrupteur encre) + `.time-btn` : éditeur d'horaires.

## Règles

- Pas de hex dans les vues : uniquement les classes ci-dessus et les jetons.
- Icônes : `js/shared/ui/icons.js`, trait 1,75, `currentColor`, dans un `.icon`.
- Cibles tactiles ≥ 44 px (38 px pour les actions secondaires compactes).
- Mouvement : transitions 120–220 ms ; la seule animation « mise en scène » est le poinçon. `prefers-reduced-motion` coupe tout.
- Pas de modale maison : confirmations destructives via `confirm()` natif ; annulation via toast quand c'est possible (tampon).
