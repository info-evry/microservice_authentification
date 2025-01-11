import { User } from "@prisma/client";
import dotenv from "dotenv";
import passport from "passport";
import { Profile as GitHubProfile, Strategy as GitHubStrategy } from "passport-github2";
import { Profile as GoogleProfile, Strategy as GoogleStrategy } from "passport-google-oauth20";

dotenv.config();

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
            done: (error: any, user?: User) => void,
        ) => {
            try {
                const user: Partial<User> = {
                    // Champs Google
                    googleId: profile.id,
                    name: profile.displayName,
                    email: profile.emails?.[0].value,
                    emailVerifiedAt: new Date(),
                };
                return done(null, user as User);
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
            scope: ["user:email"],
        },
        async (
            accessToken: string,
            refreshToken: string,
            profile: GitHubProfile,
            done: (error: any, user?: User) => void,
        ) => {
            try {
                const user: Partial<User> = {
                    // Champs GitHub
                    githubId: profile.id,
                    name: profile.username,
                    email: profile.emails?.[0].value,
                    emailVerifiedAt: new Date(),
                };
                return done(null, user as User);
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
