import { Router, Request, Response, Application } from "express";
import { User } from "@prisma/client";
import passport from "../middleware/auth.middleware";
import { generateToken } from "../tools/jwt-client";
import { serverInstance } from "../server";

declare global {
    namespace Express {
        interface Request {
            user?: User;
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
    app.get("/auth/github/callback", (req, res, next) => {
        // Vérifier si on a un paramètre code dans la query string
        const code = req.query.code;
        if (!code) {
            // Pas de code => on redirige vers /auth/github pour relancer l'auth
            return res.redirect("/auth/github");
        }

        // Sinon, on appelle passport.authenticate(...) en callback custom
        passport.authenticate("github", { session: false }, async (err, user: User, info) => {
            if (err) {
                // Erreur “Passport” ou interne
                console.error("Passport error:", err);
                return res.status(500).json({ success: false, message: err.message });
            }
            if (!user) {
                // Cas où user est inexistant => 401
                // (ex: si github a refusé l'auth)
                return res
                    .status(401)
                    .json({ success: false, message: info?.message || "User not found" });
            }

            // Ici, user correspond à l'objet renvoyé par la stratégie github
            try {
                const existingByGithub = await serverInstance.getPrismaClient().user.findUnique({
                    where: { githubId: user.githubId },
                });

                if (existingByGithub) {
                    // L'utilisateur existe déjà via githubId : on update
                    const updated = await serverInstance.getPrismaClient().user.update({
                        where: { githubId: user.githubId },
                        data: {
                            name: user.name,
                            emailVerifiedAt: user.emailVerifiedAt,
                        },
                    });
                    const token = generateToken(updated);
                    return res.json({ success: true, token, user: updated });
                } else {
                    // Personne n'a ce githubId => On vérifie par email
                    const existingByEmail = await serverInstance.getPrismaClient().user.findUnique({
                        where: { email: user.email },
                    });

                    if (existingByEmail) {
                        // Il existe déjà un utilisateur avec cet email => 403
                        return res.status(403).send("Email already exists");
                    } else {
                        // Personne n'a ce githubId, ni cet email => on crée
                        const created = await serverInstance.getPrismaClient().user.create({
                            data: {
                                githubId: user.githubId,
                                name: user.name,
                                email: user.email,
                                emailVerifiedAt: user.emailVerifiedAt,
                            },
                        });
                        const token = generateToken(created);
                        return res.json({ success: true, token, user: created });
                    }
                }
            } catch (dbError) {
                // Gestion d’erreur si la requête Prisma échoue
                console.error(dbError);
                return res.status(500).send(`An error occurred: ${dbError}`);
            }
        })(req, res, next);
    });
}
