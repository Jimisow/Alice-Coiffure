# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Vanilla JS en modules ES natifs, sans build ni framework (choix existant, confirmé). Petit serveur Node sans dépendance pour le développement. Firebase (Firestore) prévu plus tard comme sauvegarde distante ; configuration à fournir dans `.env`.

## Users

Une seule utilisatrice : Alice, coiffeuse indépendante, propriétaire du salon *Alice Coiffure*. Elle utilise l'app sur son téléphone, debout au poste de coiffage ou au comptoir, souvent entre deux clientes, parfois les mains pas tout à fait libres. Les clientes ne voient pas l'app (pas d'espace client) : sa clientèle est plutôt âgée et n'en a pas besoin.

## Product Purpose

Remplacer le fichier clientes papier et les cartes de fidélité en carton (stock épuisé, peu pratiques). L'app sert à : retrouver une cliente en quelques secondes, consulter/compléter sa fiche (nature de cheveux, notes, allergies, préférences), tamponner sa carte fidélité numérique à chaque passage, offrir la récompense quand la carte est pleine, et tenir un agenda simple avec rappel SMS. Succès = Alice n'a plus besoin de papier et ne perd aucune donnée.

## Positioning

Ce n'est pas un logiciel de caisse ni de réservation en ligne : c'est le carnet personnel d'Alice, taillé pour un salon à une personne, utilisable sans réseau.

## Operating Context

- Le salon a souvent **pas de connexion Internet** : l'app doit fonctionner entièrement hors-ligne (stockage local), et synchroniser vers Firebase dès que le réseau revient (changement de téléphone, récupération des données).
- Usage en rafales courtes : chercher → ouvrir la fiche → +1 tampon → fermer.
- Lors du passage du carton au numérique, Alice devra saisir les clientes existantes avec le nombre de tampons déjà acquis.

## Capabilities and Constraints

- Fidélité : **1 tampon par visite, 10 tampons = récompense** ; objectif et texte de la récompense réglables. La carte repart à zéro une fois la récompense offerte.
- Agenda conservé et amélioré : navigation par jour, modification/annulation, RDV visibles sur la fiche, rappel par SMS (lien `sms:` du téléphone).
- Données en français (`prenom`, `heureDebut`…).
- Non décidé : authentification Firebase (compte d'Alice), hébergement de production.

## Brand Commitments

- Nom : *Alice Coiffure*. Logo existant `images/Titre.png` : « Alice » en script, A doré dégradé + « lice » noir, « COIFFURE » en capitales espacées dorées entre deux filets. Fond blanc.
- Langue : français, ton chaleureux mais sobre ; l'app s'adresse à Alice (« Bonjour Alice »).

## Evidence on Hand

- Logo `images/Titre.png` (1254×1254, fond blanc).
- Aucune vraie donnée cliente : les données de démonstration sont fictives et doivent rester identifiées comme telles.

## Product Principles

1. Trois gestes maximum pour tamponner une carte.
2. Rien ne se perd : stockage local immédiat, sauvegarde exportable, synchro distante quand possible.
3. Lisible d'un coup d'œil, debout, au comptoir : gros éléments tactiles, contrastes francs.
4. Toute erreur se rattrape (annuler un tampon, corriger une fiche).

## Accessibility & Inclusion

Cibles tactiles ≥ 44 px, contraste AA, textes ≥ 15 px pour les contenus lus en situation de travail.
