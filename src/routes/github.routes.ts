// src/routes/github.routes.ts
import { Router, Request, Response, Application } from "express";
import passport from "../middleware/auth.middleware";
import { generateToken } from "../tools/jwt-client";
import { UserModel } from "../model/user.model";

declare global {
    namespace Express {
        interface Request {
            user?: UserModel;
        }
    }
}
export default function (app: Application) {
    /**
     * Lancer la connexion GitHub
     **/
    app.get("/auth/github", passport.authenticate("github"));

    /**
     * Callback : GitHub renvoie ici après l'auth
     */
    app.get(
        "/auth/github/callback",
        passport.authenticate("github", { session: false }),
        (req: Request, res: Response) => {
            const user = req.user as UserModel;

            // Génération du JWT
            const token = generateToken({
                githubId: user.githubId,
                githubUsername: user.githubUsername,
                githubEmail: user.githubEmail,
                githubPhoto: user.githubPhoto,
            });

            return res.json({
                success: true,
                token,
                user,
            });
        },
    );
}
