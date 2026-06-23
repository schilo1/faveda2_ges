
# 🌿 FAVEDA Stock — Application de Gestion de Stock

Application SaaS web complète de gestion de stock pour FAVEDA, construite avec Next.js 14, Prisma, MySQL et NextAuth v5.

---

## 📋 Prérequis

- **Node.js** 18.17+ ([nodejs.org](https://nodejs.org))
- **MySQL** 8.0+ ([mysql.com](https://dev.mysql.com/downloads/))
- **npm** ou **yarn**

---

## 🚀 Installation

### 1. Cloner / décompresser le projet

```bash
cd faveda-stock
```

### 2. Installer les dépendances

```bash
npm install
```

### 3. Configurer l'environnement

```bash
cp .env.example .env
```

Éditer `.env` :

```env
DATABASE_URL="mysql://root:votre_mot_de_passe@localhost:3306/faveda_stock"
NEXTAUTH_SECRET="une-clé-secrète-longue-et-aléatoire"
NEXTAUTH_URL="http://localhost:3000"
```

### 4. Créer la base de données MySQL

```sql
CREATE DATABASE faveda_stock CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 5. Appliquer les migrations Prisma

```bash
npx prisma migrate dev --name init
```

### 6. Alimenter la base avec les données initiales

```bash
npx prisma db seed
```

Cela crée :

**4 catégories** : FAVEDA Liquides, Poudre, Perte de poids, Beauté

**6 unités** de mesure

**4 fournisseurs** de démonstration

**10 produits** avec SKU auto-générés

**3 utilisateurs** :

| Email                  | Mot de passe | Rôle          |
| ---------------------- | ------------ | -------------- |
| admin@faveda.ci        | faveda2025!  | Administrateur |
| gestionnaire@faveda.ci | faveda2025!  | Gestionnaire   |
| surveillant@faveda.ci  | faveda2025!  | Surveillant    |

### 7. Lancer l'application

```bash
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000)

---

## 🏗️ Architecture du projet

```
faveda-stock/
├── prisma/
│   ├── schema.prisma          # Schéma base de données
│   └── seed.ts                # Données initiales
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   └── login/         # Page de connexion
│   │   ├── (dashboard)/       # Pages protégées
│   │   │   ├── layout.tsx     # Layout avec sidebar
│   │   │   ├── dashboard/     # Tableau de bord
│   │   │   ├── products/      # Gestion produits
│   │   │   ├── stock/
│   │   │   │   └── movements/ # Mouvements de stock
│   │   │   ├── alerts/        # Alertes
│   │   │   ├── suppliers/     # Fournisseurs
│   │   │   ├── inventory/     # Inventaire physique
│   │   │   ├── recommendations/ # Recommandations
│   │   │   ├── reports/       # Rapports PDF/Excel
│   │   │   ├── users/         # Gestion utilisateurs
│   │   │   └── settings/      # Paramètres
│   │   ├── api/               # API Routes
│   │   │   ├── auth/          # NextAuth handler
│   │   │   ├── products/      # CRUD produits
│   │   │   ├── movements/     # CRUD mouvements
│   │   │   ├── alerts/        # Alertes
│   │   │   ├── suppliers/     # Fournisseurs
│   │   │   ├── inventory/     # Inventaire
│   │   │   ├── recommendations/ # Recommandations
│   │   │   ├── reports/       # Génération rapports
│   │   │   ├── users/         # Gestion utilisateurs
│   │   │   ├── settings/      # Paramètres
│   │   │   └── dashboard/     # Stats dashboard
│   │   ├── layout.tsx         # Layout racine
│   │   └── page.tsx           # Redirection racine
│   ├── auth.ts                # Configuration NextAuth v5
│   ├── middleware.ts           # Protection des routes
│   ├── components/
│   │   ├── layout/
│   │   │   └── Sidebar.tsx    # Navigation latérale
│   │   ├── ui/
│   │   │   ├── Badge.tsx      # Badges colorés
│   │   │   └── StatCard.tsx   # Cartes statistiques
│   │   ├── forms/
│   │   │   ├── ProductForm.tsx  # Formulaire produit
│   │   │   └── MovementForm.tsx # Formulaire mouvement
│   │   └── providers/
│   │       └── AuthProvider.tsx # SessionProvider
│   ├── lib/
│   │   ├── prisma.ts          # Client Prisma singleton
│   │   └── utils.ts           # Utilitaires (SKU, alertes, recommandations)
│   └── types/
│       └── index.ts           # Types TypeScript
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── .env.example
```

---

## 🔐 Rôles et permissions

| Action                   | Administrateur | Gestionnaire | Surveillant |
| ------------------------ | -------------- | ------------ | ----------- |
| Voir tous les modules    | ✅             | ✅           | ✅          |
| Créer/modifier produits | ✅             | ✅           | ❌          |
| Créer mouvements        | ✅             | ✅           | ❌          |
| Gérer utilisateurs      | ✅             | ❌           | ❌          |
| Supprimer produits       | ✅             | ❌           | ❌          |
| Modifier paramètres     | ✅             | ❌           | ❌          |

---

## 🎨 Palette de couleurs FAVEDA

| Variable     | Couleur         | Code        |
| ------------ | --------------- | ----------- |
| Vert feuille | Sidebar/boutons | `#4F5C3D` |
| Vert olive   | Primaire        | `#596744` |
| Vert sauge   | Accents         | `#697555` |
| Gris fond    | Arrière-plan   | `#F3F3F3` |
| Gris chaud   | Bordures        | `#D9D7D2` |

---

## ⚙️ Fonctionnalités principales

- **Dashboard** : Valeur du stock, alertes, derniers mouvements
- **Produits** : CRUD complet, SKU auto-généré (`FAV-CAT-001`), recherche et filtres
- **Mouvements** : 8 types (entrée, sortie, vente, perte, retour client/fournisseur, transfert, ajustement)
- **Alertes** : Générées automatiquement (rupture, seuil bas, péremption)
- **Rapports** : Export Excel (coloré) et PDF (via JSON + jsPDF côté client)
- **Recommandations** : Réapprovisionnement, promotions, prévisions basées sur l'historique
- **Inventaire** : Comptage physique avec calcul d'écarts
- **Multi-sites** : Architecture prête pour stocks principal/boutique/autres

---

## 📦 Build pour la production

```bash
npm run build
npm start
```

---

## 🛠️ Commandes utiles

```bash
# Ouvrir Prisma Studio (interface visuelle BDD)
npx prisma studio

# Réinitialiser la base de données
npx prisma migrate reset

# Regénérer le client Prisma
npx prisma generate

# Vérifier les types TypeScript
npm run type-check
```

---

## 📄 Licence

Application développée pour FAVEDA. Usage interne uniquement.
