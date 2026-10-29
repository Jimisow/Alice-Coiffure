# Alice Coiffure

Toute la documentation du projet (architecture, règles de dépendance, données/synchro, conventions, recettes, dette technique) est dans **[CLAUDE.md](./CLAUDE.md)** — le lire en entier avant de modifier le code, et le mettre à jour après tout changement. Produit : `PRODUCT.md`. Design : `DESIGN.md`.

Essentiel : PWA vanilla JS (modules ES, sans build), `npm start` (serveur Node, port 5174), `npm test`. Une feature = un dossier `js/features/<nom>/` avec un `index.js` public ; données uniquement via `js/data/index.js` (localStorage d'abord, synchro Firebase via `.env`) ; tout texte utilisateur injecté en HTML passe par `escapeHtml()`.
