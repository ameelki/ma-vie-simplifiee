# Ma Vie Simplifiée

Application web (site responsive) pour simplifier le quotidien : **budget, factures, agenda, documents, courses & repas, tâches**, un petit **assistant** de priorités et un **espace famille** où chacun décide ce qu'il partage.
Interface en **4 langues** : français, allemand, anglais, portugais.

## Partage en famille

- Un utilisateur crée une famille (il en devient **administrateur**) et partage le code `F-XXXXXX` ; les autres la rejoignent avec ce code.
- Chaque membre choisit **ce qu'il met à disposition** (menu par menu : Budget, Factures, Agenda, Documents, Courses & repas, Tâches). Décocher un menu retire aussitôt tous les accès.
- L'**administrateur** décide ensuite **qui** peut ouvrir **quel menu** de chaque membre, en **lecture** ou en **modification**.
- Accès réel = menus proposés par le membre ∩ accès donnés par l'administrateur. Le contrôle est fait côté serveur.
- Un sélecteur « Espace de… » permet de basculer sur l'espace d'un proche ; seuls les menus autorisés apparaissent.

## Fonctionnalités ajoutées

- **Écran de bienvenue** (« Commencer »), connexion / inscription avec choix de la langue
- **Budget** : onglet Analyse (six derniers mois, dépense moyenne)
- **Assistant** : priorités du jour + zone de discussion (réponses calculées à partir de vos données, 4 langues)
- **Notifications** : rappels générés (factures proches, rendez-vous, tâches, documents qui expirent)
- **Premium** : offres mensuelle / annuelle et essai gratuit de 7 jours (mode démonstration : aucun paiement n'est branché)
- **Profil** : abonnement, notifications, changement de mot de passe

Entités : `User`, `Family`, `FamilyMember`, `AccessGrant`, `Entry` (les six menus), `Subscription`, `Notification`.

## Stack

- **Backend** : Java 21, Spring Boot 3.3, JPA/Hibernate, JWT, PostgreSQL (tables préfixées `vie_simplifiee_`)
- **Frontend** : Angular 18 (composants autonomes, signaux), design vert (Playfair Display + Montserrat)

## Démarrage local

```bash
# PostgreSQL local avec une base "vie" (utilisateur/mot de passe par défaut : voir application.properties)
cd backend && mvn spring-boot:run        # API sur :8080
cd frontend && npm install && npm start  # site sur :4200
```
En local, mettez `apiUrl: 'http://localhost:8080/api'` dans `frontend/src/assets/config.js`.

## Déploiement gratuit (Neon + Render + Netlify)

1. **Neon** : créez un projet PostgreSQL (la même base peut héberger plusieurs projets grâce au préfixe des tables).
2. **Render** : New → Web Service (Docker), **Root Directory = `backend`**, ou Blueprint avec `render.yaml`. Variables :
   `DB_URL` = `jdbc:postgresql://HOTE/BASE?sslmode=require`, `DB_USER`, `DB_PASSWORD`, `JWT_SECRET` (32 caractères min.), `CORS_ORIGINS` (facultatif pour `*.netlify.app`).
3. **Netlify** : importez le dépôt (`netlify.toml` fait le reste).
4. Mettez l'adresse du backend (terminée par `/api`) dans `frontend/src/assets/config.js`, enregistrez : Netlify redéploie.

Le plan gratuit de Render s'endort après ~15 min ; un moniteur (UptimeRobot) sur `/actuator/health` le garde éveillé.

## Logo

`frontend/src/assets/` : `logo.svg` (horizontal), `logo-mark.svg`, `favicon.svg` et exports PNG.
