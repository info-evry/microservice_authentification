// src/routes/default.routes.ts
import { Router, Request, Response, Application } from "express";
import passport from "../middleware/auth.middleware";
import { UserModel } from "../model/user.model";
import { generateToken } from "../tools/jwt-client";

declare global {
    namespace Express {
        interface Request {
            user?: UserModel;
        }
    }
}
export default function (app: Application) {
    /**
     * Démarrer la connexion Google (redirige automatiquement vers google.com)
     */
    app.get("/auth/google", passport.authenticate("google"));

    /**
     * Callback : Google renvoie ici après l'auth
     */
    app.get(
        "/auth/google/callback",
        passport.authenticate("google", { session: false }),
        (req: Request, res: Response) => {
            // Ici, req.user contient l'objet utilisateur (UserModel) renvoyé par la stratégie Google.
            const user = req.user as UserModel;

            // On génère le JWT avec le payload souhaité
            const token = generateToken({
                googleId: user.googleId,
                displayName: user.googleDisplayName,
                email: user.googleEmail,
                photo: user.googlePhoto,
            });

            // On peut renvoyer en JSON (REST) ou rediriger
            return res.json({
                success: true,
                token,
                user,
            });
        },
    );
}
