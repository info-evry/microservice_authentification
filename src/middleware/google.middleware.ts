import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Profile } from "passport-google-oauth20";

import { UserModel } from "../model/user.model";

// On récupère le clientID/clientSecret depuis .env
const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = process.env;

/**
 * Configuration de la stratégie Google
 */
passport.use(
    new GoogleStrategy(
        {
            clientID: GOOGLE_CLIENT_ID || "",
            clientSecret: GOOGLE_CLIENT_SECRET || "",
            callbackURL: "/auth/google/callback", // Doit correspondre à l'URL renseignée dans Google Cloud
        },
        async (
            accessToken: string,
            refreshToken: string,
            profile: Profile,
            done: (error: any, user?: UserModel) => void,
        ) => {
            try {
                const user: UserModel = {
                    googleId: profile.id,
                    displayName: profile.displayName,
                    email: profile.emails?.[0].value,
                    photo: profile.photos?.[0].value,
                };

                // Optionnel : Enregistrer l'utilisateur en base, ou le retrouver.
                // Pour l'exemple, on renvoie directement user.
                done(null, user);
            } catch (error) {
                done(error, undefined);
            }
        },
    ),
);

// Pour un microservice stateless, serialize/deserialize peuvent être laissées "vides"
passport.serializeUser((user, done) => {
    done(null, user);
});

passport.deserializeUser((obj: any, done) => {
    done(null, obj);
});

export default passport;
