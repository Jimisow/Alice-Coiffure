# Alice Coiffure — carnet clientes & fidélité

Application mobile (PWA installable) du salon *Alice Coiffure* : fiches clientes, carte fidélité à tampons, agenda avec rappel SMS, statistiques. Fonctionne **hors-ligne** (données sur le téléphone) et se synchronise avec **Firebase** dès qu'Internet est disponible.

Vanilla JS (modules ES), aucune dépendance, aucun bundler.

```bash
npm start              # serveur de dev → http://localhost:5174
npm test               # tests de la logique métier (node --test)
npm run build          # dist/ pour la production (Vercel)
npm run check:firebase # vérifie la config Firebase (lecture seule)
```

Configuration Firebase : copier `.env.example` en `.env` (dev) ou renseigner les variables `FIREBASE_*` sur Vercel (production).

Documentation complète du projet (architecture, données, synchronisation, règles Firestore, déploiement) : **[CLAUDE.md](./CLAUDE.md)**. Design : [DESIGN.md](./DESIGN.md). Produit : [PRODUCT.md](./PRODUCT.md).
