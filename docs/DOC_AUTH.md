# Documentation : Microservice Auth

Ce microservice gère l’**authentification** d’utilisateurs via **Google** et **GitHub**, puis fournit un **JWT** (JSON Web Token) permettant de vérifier leur identité.

## Structure du projet

src/
├─ middleware/
│ ├─ auth.middleware.ts # Configuration Passport (Google & GitHub)
│ └─ default.middleware.ts # Vérifie la validité d’un JWT
├─ routes/
│ ├─ google.routes.ts # Routes d’authentification Google
│ ├─ github.routes.ts # Routes d’authentification GitHub
│ └─ checkJwt.routes.ts # Route pour vérifier un token
├─ tools/
│ └─ jwt-client.ts # Fonctions generateToken(...) & verifyToken(...)
├─ server.ts # Initialisation du serveur Express
├─ index.ts # Lancer le server
...

---

## Environnement / Variables nécessaires

Dans votre fichier `.env` (ou vos _secrets_ GitHub Actions), vous devez définir :

1. **GOOGLE_CLIENT_ID** : Identifiant client OAuth2 Google
2. **GOOGLE_CLIENT_SECRET** : Secret OAuth2 Google
3. **GITHUB_CLIENT_ID** : Identifiant client OAuth2 GitHub
4. **GITHUB_CLIENT_SECRET** : Secret OAuth2 GitHub
5. **NEXT_URL** : URL de votre application front (ex. `https://votre-frontend.com`). Les routes callback renvoient vers `NEXT_URL` pour gérer les redirections après login.
6. **JWT_SECRET** : Secret pour signer les tokens JWT (dans `jwt-client.ts`).

Exemple de `.env` :

```bash
GOOGLE_CLIENT_ID=xxxxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=yyyyyyy
GITHUB_CLIENT_ID=abc123
GITHUB_CLIENT_SECRET=xyz789
NEXT_URL=http://localhost:3001
JWT_SECRET=super_secret_key

```

## Routes d’authentification Google

### 1) `GET /auth/google`

-   **Description** : Lance la connexion OAuth2 avec Google.
-   **Comportement** : Redirige l’utilisateur vers la page de connexion Google.

### 2) `GET /auth/google/callback`

-   **Description** : Callback appelé par Google après l’authentification.
-   **Query Params** :
    -   `?code=...` : code OAuth2 renvoyé par Google.
-   **Cas d’absence de code** : Redirige vers `/auth/google` pour relancer l’auth.
-   **Cas d’erreur Passport** : Redirige vers `${NEXT_URL}/auth/login?error=INTERNAL`.
-   **Cas user non trouvé** : Redirige vers `${NEXT_URL}/auth/login?error=SSO_DENIED`.
-   **Cas user existant (via `googleId`)** : Met à jour son `name` et `emailVerifiedAt`, génère un JWT, puis redirige vers `${NEXT_URL}/api/auth/callback?token=<JWT>`.
-   **Cas user existant (via `email`)** : Redirige vers `${NEXT_URL}/auth/login?error=SSO_EXISTS` (pour éviter un conflit sur l’email).
-   **Cas user inexistant** : Crée un nouvel utilisateur en base, génère un JWT, redirige vers `${NEXT_URL}/api/auth/callback?token=<JWT>`.
-   **Cas d’erreur BDD** : Redirige vers `${NEXT_URL}/auth/login?error=DATABASE`.

---

## Routes d’authentification GitHub

### 1) `GET /auth/github`

-   **Description** : Lance la connexion OAuth2 avec GitHub.
-   **Comportement** : Redirige l’utilisateur vers GitHub pour s’authentifier.

### 2) `GET /auth/github/callback`

-   **Description** : Callback appelé par GitHub après l’auth.
-   **Query Params** :
    -   `?code=...` : code OAuth2 renvoyé par GitHub.
-   **Cas d’absence de code** : Redirige vers `/auth/github` pour relancer l’auth.
-   **Cas d’erreur Passport** : Redirige vers `${NEXT_URL}/auth/login?error=INTERNAL`.
-   **Cas user non trouvé** : Redirige vers `${NEXT_URL}/auth/login?error=SSO_DENIED`.
-   **Cas user existant (via `githubId`)** : Met à jour le user, génère un JWT, puis redirige vers `${NEXT_URL}/api/auth/callback?token=<JWT>`.
-   **Cas user existant (via `email`)** : Redirige vers `${NEXT_URL}/auth/login?error=SSO_EXISTS`.
-   **Cas user inexistant** : Crée un nouvel utilisateur, génère un JWT, puis redirige vers `${NEXT_URL}/api/auth/callback?token=<JWT>`.
-   **Cas d’erreur BDD** : Redirige vers `${NEXT_URL}/auth/login?error=DATABASE`.

## Route de vérification de token (checkJwt)

### `GET /auth/verify-token/:token`

-   **Description** : Vérifie si le token JWT passé en paramètre (`:token`) est valide.
-   **Middleware** : `checkJwtParam`.
-   **Réponses** :
    -   **401** si le token est invalide ou expiré (JSON `{ success: false, message: 'Invalid or expired token' }`).
    -   **200** si le token est valide (JSON `{ success: true, message: 'Token is valid', user }`).

**Exemple d’appel :**

```bash
GET /auth/verify-token/eyJhbGciOiJIUz...
```

## Middlewares

### `auth.middleware.ts`

-   Configure **Passport** avec deux stratégies :
    -   **GoogleStrategy** (OAuth2)
    -   **GitHubStrategy** (OAuth2)
-   Chaque callback extrait l’**id**, l’**email**, le **name**, etc. de l’utilisateur, puis appelle `done(null, user)`.
-   Pas de session persistante (pattern **JWT stateless**).
-   `serializeUser` / `deserializeUser` sont présents mais très basiques (pas de session store).

### `checkJwt.middleware.ts`

-   Vérifie la présence du paramètre `:token` (`req.params.token`).
    -   Si absent, renvoie **400** ou gère un cas d’erreur.
-   Utilise `verifyToken` (depuis `jwt-client.ts`) pour décoder le token.
    -   Si `null`, renvoie **401** : `{ success: false, message: "Invalid or expired token" }`.
    -   Sinon, stocke la payload décodée dans `req.user`, puis `next()`.

---

## Exemples de flux OAuth2 (Google et GitHub)

1. **L’utilisateur clique** sur un bouton “Login with Google” (ou GitHub).
2. Il est **redirigé** vers la route (`/auth/google` ou `/auth/github`).
3. Le microservice redirige **automatiquement** vers le provider (Google/GitHub).
4. L’utilisateur donne son accord, puis Google/GitHub renvoie :

```bash
/auth/google/callback?code=xxxx
```

(ou /auth/github/callback?code=yyyy)

Le microservice échange ce code via Passport pour obtenir un profil.
Il vérifie/Met à jour/Crée l’utilisateur dans la BDD (via Prisma), génère un JWT.
Enfin, il redirige vers :

```bash
${NEXT_URL}/api/auth/callback?token=<JWT>
```
