# LPC Manager

Logiciel de gestion pour épicerie tabac : stock, catalogue produits, prix
d'achat/vente, import de factures fournisseurs et impression d'étiquettes
prix pour imprimante thermique.

## Fonctionnalités

- **Produits** : référence/code-barres, désignation, catégorie, fournisseur,
  prix d'achat HT/TTC, TVA, stock et seuil d'alerte.
- **Deux modes de tarification** :
  - *Marge libre* (épicerie) : le prix de vente TTC est calculé à partir
    d'une marge appliquée sur le prix d'achat HT.
  - *Prix imposé* (tabac) : le prix de vente TTC est saisi directement
    (imposé par le fabricant), la marge est recalculée à titre indicatif.
- **Fournisseurs** : gestion simple (CRUD).
- **Import de factures** (CSV/Excel, ou PDF pour les fournisseurs
  supportés comme METRO France) : mapping des colonnes à l'écran (CSV/
  Excel) ou extraction automatique des lignes avec détection du taux de
  TVA (PDF), détection automatique des produits déjà référencés,
  détection des hausses/baisses de prix d'achat par rapport au dernier
  prix connu, mise à jour automatique du stock, et signalement des
  produits non référencés à traiter (créer un nouveau produit ou
  associer à un produit existant).
- **Historique des prix** par produit.
- **Étiquettes prix** : sélection multi-produits, génération d'une planche
  imprimable avec code-barres, au format configurable (par défaut 30×20 mm)
  pour imprimante thermique.
- **Tableau de bord** : alertes stock bas, produits non référencés en
  attente, dernières variations de prix.

## Stack technique

- [Next.js](https://nextjs.org) (App Router, Server Actions) + TypeScript
- [Prisma](https://www.prisma.io) + PostgreSQL
- Tailwind CSS
- `papaparse` / `xlsx` pour le parsing des fichiers d'import
- `jsbarcode` pour la génération des codes-barres sur les étiquettes

## Démarrage

Nécessite une base PostgreSQL accessible (locale via Docker/PostgreSQL
installé, ou un service en ligne gratuit comme [Neon](https://neon.tech)).

```bash
cp .env.example .env # renseigner DATABASE_URL avec votre base PostgreSQL
npm install           # installe les dépendances et génère le client Prisma
npm run db:migrate    # crée les tables
npm run db:seed       # ajoute les catégories de base et les réglages par défaut
npm run dev           # démarre le serveur de développement
```

Ouvrez [http://localhost:3000](http://localhost:3000).

## Déploiement (hébergement en ligne, accessible depuis plusieurs appareils)

1. Créer une base PostgreSQL gratuite sur [neon.tech](https://neon.tech)
   et copier la chaîne de connexion.
2. Depuis votre machine, avec `DATABASE_URL` pointant vers cette base
   Neon (dans `.env`), exécuter `npm run db:migrate:deploy` puis
   `npm run db:seed` pour créer les tables et les catégories de base.
3. Créer un compte sur [vercel.com](https://vercel.com), importer ce
   dépôt GitHub comme nouveau projet.
4. Dans les réglages du projet Vercel, ajouter la variable
   d'environnement `DATABASE_URL` avec la même chaîne de connexion Neon.
5. Déployer. À chaque `git push` sur la branche connectée, Vercel
   redéploie automatiquement — toujours sur la même base de données,
   donc les données restent synchronisées quel que soit l'appareil
   utilisé pour se connecter.

## Réglages

La page **Réglages** permet d'ajuster :
- la taille des étiquettes (largeur/hauteur en mm) et le nombre de colonnes
  par planche, à adapter au format de votre imprimante thermique ;
- le taux de TVA et la marge par défaut pour les nouveaux produits.

## Import de factures

Le fichier fournisseur (CSV ou Excel) doit contenir au minimum une colonne
désignation et une colonne prix d'achat HT. Une colonne référence/code-barres
est recommandée pour permettre le rapprochement automatique avec les
produits déjà en catalogue ; sans elle, les lignes sont importées comme
non référencées et doivent être résolues manuellement.

Les factures PDF sont également supportées pour plusieurs formats
fournisseurs connus (détection automatique) : METRO France, Auchan
(Drive) et Carrefour. Le code EAN, la désignation, la quantité livrée,
le prix d'achat HT (net des remises ligne) et le taux de TVA sont
extraits automatiquement. Seuls les PDF avec du texte sélectionnable
sont pris en charge (pas les scans/images). Pour un autre fournisseur
PDF, le parseur peut nécessiter un ajustement (`src/lib/pdfInvoice.ts`)
— à défaut, préférez un export CSV/Excel si votre fournisseur en
propose un.
