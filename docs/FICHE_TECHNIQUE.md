# Fiche Technique - FAVEDA Stock

## 1. Présentation

FAVEDA Stock est un SaaS de gestion de stock conçu pour centraliser le suivi des produits, des entrées, des sorties, des inventaires physiques, des alertes, des recommandations et des rapports.

L'application permet à une équipe de piloter son stock en temps réel, de limiter les ruptures, de suivre les écarts d'inventaire et d'exporter les données utiles pour le contrôle opérationnel.

## 2. Objectifs du SaaS

- Suivre les produits et leurs niveaux de stock.
- Enregistrer tous les mouvements de stock.
- Détecter automatiquement les ruptures, seuils bas et dates de péremption proches.
- Réaliser un inventaire physique avec ajustement du stock réel.
- Générer des recommandations intelligentes de réapprovisionnement ou de promotion.
- Exporter des rapports en Excel ou PDF.
- Notifier les responsables par email en cas d'alerte.
- Sécuriser les accès par rôle utilisateur.

## 3. Stack Technique

| Couche | Technologie |
|---|---|
| Frontend | Next.js 14, React 18, Tailwind CSS |
| Backend | Next.js API Routes |
| Base de données | MySQL |
| ORM | Prisma |
| Authentification | NextAuth v5 |
| Emails | Nodemailer / SMTP |
| Exports | ExcelJS, jsPDF |
| Icônes | Lucide React |
| Langage | TypeScript |

## 4. Modules Fonctionnels

### 4.1 Authentification

L'application dispose d'une page de connexion sécurisée.

Fonctions :

- Connexion par email et mot de passe.
- Sessions sécurisées via NextAuth.
- Redirection automatique selon l'état de connexion.
- Protection des routes du dashboard.

### 4.2 Tableau de Bord

Le tableau de bord donne une vue globale du stock.

Indicateurs affichés :

- Valeur totale du stock.
- Nombre de produits actifs.
- Produits en rupture.
- Produits sous le seuil minimum.
- Alertes non lues.
- Derniers mouvements de stock.

Utilité :

- Avoir une vision rapide de la santé du stock.
- Identifier les produits critiques.
- Suivre les mouvements récents.

### 4.3 Gestion des Produits

Le module Produits permet de gérer le catalogue.

Fonctions :

- Liste des produits.
- Création d'un nouveau produit.
- Modification d'un produit existant.
- SKU généré automatiquement.
- Association à une catégorie, une unité et un fournisseur.
- Gestion du stock actuel et du seuil minimum.
- Gestion des prix d'achat et de vente.
- Date de péremption.
- Statut actif/inactif.

Filtres disponibles :

- Recherche par nom.
- Filtre par catégorie.
- Filtre par marge de date de péremption.

Colonnes principales :

- Produit.
- SKU.
- Catégorie.
- Stock.
- Prix de vente.
- Péremption.
- Statut.

### 4.4 Mouvements de Stock

Le module Mouvements trace les opérations qui changent ou expliquent le stock.

Types de mouvements :

- Entrée.
- Sortie.
- Vente.
- Perte.
- Retour client.
- Retour fournisseur.
- Transfert.
- Ajustement d'inventaire.

Fonctions :

- Création d'un mouvement.
- Mise à jour automatique du stock produit selon le type de mouvement.
- Vérification du stock disponible pour les sorties.
- Historique des mouvements.
- Motif et validateur.
- Utilisateur à l'origine du mouvement.

Filtres disponibles :

- Type de mouvement.
- Date de début.
- Date de fin.

Effets automatiques :

- Recalcul des alertes.
- Recalcul des recommandations intelligentes.
- Journalisation dans l'audit log.

### 4.5 Inventaire Physique

Le module Inventaire permet de comparer le stock théorique au stock réellement compté.

Fonctions :

- Création d'un nouvel inventaire.
- Sélection d'un ou plusieurs produits.
- Affichage du stock théorique actuel.
- Saisie du stock réel.
- Calcul automatique de l'écart.
- Justification par ligne.
- Enregistrement de l'historique d'inventaire.
- Ajustement automatique du stock produit avec le stock réel validé.

Informations enregistrées :

- Date d'inventaire.
- Produit.
- Stock théorique.
- Stock réel.
- Différence.
- Justification.
- Utilisateur.

Effets automatiques :

- Mise à jour du stock courant.
- Recalcul des alertes.
- Recalcul des recommandations.

### 4.6 Alertes

Le module Alertes détecte les situations critiques ou à surveiller.

Types d'alertes :

- Rupture de stock.
- Seuil minimum atteint ou dépassé.
- Péremption proche.
- Surstock.
- Faible rotation.

Niveaux de sévérité :

- Info.
- Attention.
- Critique.

Fonctions :

- Liste des alertes actives.
- Indication des alertes non lues.
- Affichage du produit concerné.
- Message détaillé.
- Stock actuel du produit.
- Envoi manuel des alertes par email.

Déclenchement automatique :

- Après un mouvement de stock.
- Après un inventaire physique.
- Après certaines mises à jour produit.

### 4.7 Emails d'Alerte

L'application peut envoyer un digest email contenant les alertes actives.

Configuration dans l'application :

- Activation ou désactivation de l'envoi automatique.
- Liste des destinataires.
- Sévérité minimale à envoyer.

Configuration dans `.env` :

```env
SMTP_HOST=
SMTP_PORT=
SMTP_SECURE=
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=
```

Comportement :

- L'envoi automatique se fait lorsque le moteur d'alertes est relancé.
- Le bouton "Envoyer par email" de la page Alertes permet de renvoyer les alertes actives à la demande.
- Si SMTP est mal configuré, l'opération de stock continue et l'erreur email ne bloque pas l'application.

### 4.8 Recommandations Intelligentes

Le module Recommandations analyse les produits et les mouvements pour proposer des actions.

Types de recommandations :

- Réapprovisionnement.
- Promotion suggérée.
- Prévision de demande.
- Faible rotation.

Critères utilisés :

- Stock actuel.
- Seuil minimum.
- Historique des ventes et sorties.
- Rotation sur les 30 derniers jours.
- Nombre estimé de jours de stock restant.

Fonctions :

- Génération manuelle via bouton.
- Génération automatique après mouvement de stock.
- Génération automatique après inventaire physique.
- Quantité suggérée pour certains cas.
- Priorité de recommandation.

### 4.9 Rapports et Exports

Le module Rapports permet d'exporter les données.

Types de rapports :

- État du stock.
- Mouvements de stock.
- Valorisation du stock.

Formats :

- Excel.
- PDF.

Filtres :

- Date de début.
- Date de fin.

Utilité :

- Suivi administratif.
- Contrôle de stock.
- Reporting financier.
- Archivage.

### 4.10 Fournisseurs

Le module Fournisseurs centralise les partenaires liés aux produits.

Fonctions :

- Liste des fournisseurs.
- Nom.
- Téléphone.
- Email.
- Adresse.
- Commentaire.
- Nombre de produits associés.
- Statut actif/inactif.

### 4.11 Utilisateurs et Rôles

L'application gère plusieurs rôles.

| Rôle | Description |
|---|---|
| Administrateur | Accès complet à l'application |
| Gestionnaire | Gestion opérationnelle du stock |
| Surveillant | Consultation et suivi |

Permissions principales :

| Action | Administrateur | Gestionnaire | Surveillant |
|---|---:|---:|---:|
| Voir le dashboard | Oui | Oui | Oui |
| Voir produits et stock | Oui | Oui | Oui |
| Créer/modifier produits | Oui | Oui | Non |
| Créer mouvements | Oui | Oui | Non |
| Faire inventaire | Oui | Oui | Non |
| Voir alertes | Oui | Oui | Oui |
| Envoyer alertes par email | Oui | Oui | Oui |
| Gérer utilisateurs | Oui | Non | Non |
| Modifier paramètres | Oui | Non | Non |

### 4.12 Paramètres

Le module Paramètres permet de configurer l'application.

Paramètres disponibles :

- Nom de l'entreprise.
- Devise.
- Seuil global par défaut.
- Validateur par défaut pour les sorties.
- Emails d'alerte.
- Destinataires d'alerte.
- Sévérité minimale pour les emails.
- Catégories.
- Unités de mesure.

## 5. Modèle de Données Principal

Entités principales :

- User : utilisateurs et rôles.
- Product : produits et stock courant.
- Category : catégories de produits.
- Unit : unités de mesure.
- Supplier : fournisseurs.
- StockMovement : mouvements de stock.
- Inventory : inventaires physiques.
- Alert : alertes.
- Recommendation : recommandations.
- Report : rapports.
- Setting : paramètres.
- AuditLog : journal d'audit.

## 6. Automatisations

### 6.1 Génération d'alertes

Le moteur d'alertes vérifie :

- Stock égal à zéro.
- Stock inférieur au seuil minimum.
- Date de péremption proche selon le paramètre configuré.

### 6.2 Génération de recommandations

Le moteur analyse :

- Les sorties et ventes des 30 derniers jours.
- La rotation moyenne.
- Le stock disponible.
- Le seuil minimum.

Il peut proposer :

- Une commande.
- Une promotion.
- Une augmentation du stock de sécurité.

### 6.3 Mise à jour du stock

Le stock est mis à jour automatiquement :

- Lors d'une entrée.
- Lors d'une sortie.
- Lors d'une vente.
- Lors d'une perte.
- Lors d'un retour.
- Lors d'un inventaire physique.

## 7. Sécurité

Mécanismes de sécurité :

- Authentification par session.
- Routes dashboard protégées.
- API protégées par session.
- Contrôles de rôle sur les actions sensibles.
- Mot de passe haché avec bcrypt.
- Secrets SMTP stockés dans `.env`.

## 8. Configuration Environnement

Variables principales :

```env
DATABASE_URL=
NEXTAUTH_SECRET=
NEXTAUTH_URL=
NEXT_PUBLIC_APP_NAME=
NEXT_PUBLIC_APP_URL=
SMTP_HOST=
SMTP_PORT=
SMTP_SECURE=
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=
```

## 9. Routes Principales

| Route | Description |
|---|---|
| `/login` | Connexion |
| `/dashboard` | Tableau de bord |
| `/products` | Produits |
| `/products/new` | Nouveau produit |
| `/stock/movements` | Mouvements |
| `/stock/movements/new` | Nouveau mouvement |
| `/alerts` | Alertes |
| `/suppliers` | Fournisseurs |
| `/inventory` | Inventaire |
| `/inventory/new` | Nouvel inventaire |
| `/recommendations` | Recommandations |
| `/reports` | Rapports |
| `/users` | Utilisateurs |
| `/settings` | Paramètres |

## 10. API Principales

| API | Rôle |
|---|---|
| `/api/products` | Gestion produits |
| `/api/products/[id]` | Détail, modification, suppression produit |
| `/api/movements` | Mouvements de stock |
| `/api/inventory` | Inventaire physique |
| `/api/alerts` | Liste et lecture des alertes |
| `/api/alerts/email` | Envoi manuel des alertes par email |
| `/api/recommendations` | Lecture et génération des recommandations |
| `/api/reports/generate` | Génération des exports |
| `/api/settings` | Paramètres |
| `/api/users` | Utilisateurs |
| `/api/suppliers` | Fournisseurs |
| `/api/dashboard/stats` | Statistiques dashboard |

## 11. Points Forts

- Interface claire et moderne adaptée à une gestion quotidienne.
- Automatisation des alertes et recommandations.
- Inventaire physique directement relié au stock réel.
- Exports Excel/PDF.
- Notifications email configurables.
- Gestion par rôles.
- Base technique solide avec Next.js, Prisma et MySQL.

## 12. Limites et Évolutions Possibles

Évolutions possibles :

- Planification automatique quotidienne des emails d'alerte via cron.
- Historique détaillé des emails envoyés.
- Tableau analytique avec graphiques de rotation.
- Gestion complète multi-sites avec transferts entre emplacements.
- Import produits depuis Excel.
- Codes-barres ou QR codes.
- Notifications WhatsApp/SMS.
- Workflow d'approbation pour certains mouvements.

## 13. Résumé Exécutif

FAVEDA Stock est un outil SaaS complet pour gérer le stock, contrôler les mouvements, anticiper les ruptures, suivre les inventaires, exporter les données et informer les responsables. Il couvre les besoins essentiels d'une gestion de stock opérationnelle tout en offrant des fonctions avancées comme les recommandations intelligentes et les alertes email.
