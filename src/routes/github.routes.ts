import { User } from "@prisma/client";
import { Application } from "express";
import passport from "../middleware/auth.middleware";
import { serverInstance } from "../server";
import { generateToken } from "../tools/jwt-client";

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
                return res.redirect(`${process.env.NEXT_URL}/auth/login?error=INTERNAL`);
            }
            if (!user) {
                // Cas où user est inexistant => 401
                // (ex: si github a refusé l'auth)
                return res.redirect(`${process.env.NEXT_URL}/auth/login?error=SSO_DENIED`);
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

                    return res.redirect(`${process.env.NEXT_URL}/api/auth/callback?token=${token}`);
                } else {
                    // Personne n'a ce githubId => On vérifie par email
                    const existingByEmail = await serverInstance.getPrismaClient().user.findUnique({
                        where: { email: user.email },
                    });

                    if (existingByEmail) {
                        // Il existe déjà un utilisateur avec cet email => 403
                        return res.redirect(`${process.env.NEXT_URL}/auth/login?error=SSO_EXISTS`);
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
                        return res.redirect(
                            `${process.env.NEXT_URL}/api/auth/callback?token=${token}`,
                        );
                    }
                }
            } catch (dbError) {
                // Gestion d’erreur si la requête Prisma échoue
                console.error(dbError);
                return res.redirect(`${process.env.NEXT_URL}/auth/login?error=DATABASE`);
            }
        })(req, res, next);
    });
}
