import passport from "passport";
import { Strategy as GoogleStrategy, Profile as GoogleProfile } from "passport-google-oauth20";
import { Strategy as GitHubStrategy, Profile as GitHubProfile } from "passport-github2";
import { UserModel } from "../model/user.model";

/**
 *  Récupération des secrets Google et GitHub via .env
 */
const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET } =
    process.env;

/* ---------------------------------------------------------------------------
 * Stratégie Google
 * ------------------------------------------------------------------------- */
passport.use(
    new GoogleStrategy(
        {
            clientID: GOOGLE_CLIENT_ID || "",
            clientSecret: GOOGLE_CLIENT_SECRET || "",
            callbackURL: "/auth/google/callback",
            scope: ["profile", "email"],
        },
        async (
            accessToken: string,
            refreshToken: string,
            profile: GoogleProfile,
            done: (error: any, user?: UserModel) => void,
        ) => {
            try {
                const user: UserModel = {
                    // Champs Google
                    googleId: profile.id,
                    googleDisplayName: profile.displayName,
                    googleEmail: profile.emails?.[0].value,
                    googlePhoto: profile.photos?.[0].value,
                };
                // Possibilité d'insérer/rechercher l'utilisateur en BDD ici.
                done(null, user);
            } catch (error) {
                done(error, undefined);
            }
        },
    ),
);

/* ---------------------------------------------------------------------------
 * Stratégie GitHub
 * ------------------------------------------------------------------------- */
passport.use(
    new GitHubStrategy(
        {
            clientID: GITHUB_CLIENT_ID || "",
            clientSecret: GITHUB_CLIENT_SECRET || "",
            callbackURL: "/auth/github/callback",
            scope: ["user:email"], // pour récupérer l'e-mail dans profile.emails
        },
        async (
            accessToken: string,
            refreshToken: string,
            profile: GitHubProfile,
            done: (error: any, user?: UserModel) => void,
        ) => {
            try {
                const user: UserModel = {
                    // Champs GitHub
                    githubId: profile.id,
                    githubUsername: profile.username,
                    githubEmail: profile.emails?.[0].value,
                    githubPhoto: profile.photos?.[0].value,
                };
                // Possibilité d'insérer/rechercher l'utilisateur en BDD ici.
                done(null, user);
            } catch (error) {
                done(error, undefined);
            }
        },
    ),
);

/**
 * Pour un microservice qui utilise du JWT stateless, on peut laisser
 * ces fonctions basiques, voire vides, selon le besoin.
 */
passport.serializeUser((user, done) => {
    done(null, user);
});
passport.deserializeUser((obj: any, done) => {
    done(null, obj);
});

export default passport;
