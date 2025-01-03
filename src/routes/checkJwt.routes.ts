import { Router, Request, Response, Application } from "express";
import { checkJwtParam } from "../middleware/checkJwt.middleware";

export default function (app: Application) {
    /**
     * route qui vérifie si le token est valide via le middleware "checkJwt".
     * - Si le token est valide, on retourne une confirmation avec le "user" décodé.
     * - Sinon, le middleware renverra une 401.
     */
    app.get("/auth/verify-token/:token", checkJwtParam, (req, res) => {
        const user = (req as any).user;
        return res.json({
            success: true,
            message: "Token is valid",
            user,
        });
    });
}
