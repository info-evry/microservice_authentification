# Asso market API

## Pré-requis :

-   NodeJS
-   Docker
-   Git

### Etape 1 : Installation des dépendances

```bash
npm i
```

### Etape 2 : Télécharge puis lance le conteneur docker

```bash
docker-compose up -d
```

### Etape 3 : Faire le lien entre le conteneur et votre application grâce au ".env"

-   Copier le fichier ".env.template"
-   Rennomer ce fichier ".env"

Normalement il devrait il avoir :

```bash
DATABASE_URL="postgresql://root:root@localhost:5435/my_database?schema=public
```

### Etape 4 : Création de votre Base de données avec prisma

```bash
npm run migrate
```

Un message disant que votre BDD et vos tables à été créer

### Etape 5 : Pour visualiser et agir sur votre BDD, prisma propose une interface graphique

```bash
npm run studio
```

Normalement, une page web devrait s'ouvrir avec le port http://localhost:5555
Elle permet de visualiser votre BDD

### Etape 6 : Lancer l'application

```bash
npm run start:dev
```

Une page web devrait s'ouvrir avec le port http://localhost:3000

### Etape 7 : Lancer les tests

```bash
npm run test
```

## Infos

-   PORT BDD AIE MARKET : 5432
-   PORT BDD NOTIFICATIONS : 5433
-   PORT BDD AUTHENTIFICATIONS : 5435
-   PORT BDD PLANNING : 5436
