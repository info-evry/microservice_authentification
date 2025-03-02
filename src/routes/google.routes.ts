import { User } from "@prisma/client";
import { Application } from "express";
import passport from "../middleware/auth.middleware";
import { serverInstance } from "../server";
import { generateToken } from "../tools/jwt-client";

// Extend the Request interface to include the user property
declare global {
    namespace Express {
        interface Request {
            user?: User;
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
    app.get("/auth/google/callback", (req, res, next) => {
        // Vérifier si on a un paramètre code dans la query string
        const code = req.query.code;
        if (!code) {
            // Pas de code => on redirige vers /auth/google pour relancer l'auth
            return res.redirect("/auth/google");
        }

        // Sinon, on appelle passport.authenticate(...) en callback custom
        passport.authenticate("google", { session: false }, async (err, user: User, info) => {
            if (err) {
                // Erreur “Passport” ou interne
                console.error("Passport error:", err);
                return res.redirect(`${process.env.NEXT_URL}/auth/login?error=INTERNAL`);
            }
            if (!user) {
                // Cas où user est inexistant => 401
                // (ex: si Google a refusé l'auth)
                return res.redirect(`${process.env.NEXT_URL}/auth/login?error=SSO_DENIED`);
            }

            // Ici, user correspond à l'objet renvoyé par la stratégie Google
            try {
                const existingByGoogle = await serverInstance.getPrismaClient().user.findUnique({
                    where: { googleId: user.googleId },
                });

                if (existingByGoogle) {
                    // L'utilisateur existe déjà via googleId : on update
                    const updated = await serverInstance.getPrismaClient().user.update({
                        where: { googleId: user.googleId },
                        data: {
                            name: user.name,
                            emailVerifiedAt: user.emailVerifiedAt,
                        },
                    });
                    const token = generateToken(updated);

                    return res.redirect(`${process.env.NEXT_URL}/api/auth/callback?token=${token}`);
                } else {
                    // Personne n'a ce googleId => On vérifie par email
                    const existingByEmail = await serverInstance.getPrismaClient().user.findUnique({
                        where: { email: user.email },
                    });

                    if (existingByEmail) {
                        // Il existe déjà un utilisateur avec cet email => 403
                        return res.redirect(`${process.env.NEXT_URL}/auth/login?error=SSO_EXISTS`);
                    } else {
                        // Personne n'a ce googleId, ni cet email => on crée
                        const created = await serverInstance.getPrismaClient().user.create({
                            data: {
                                googleId: user.googleId,
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
