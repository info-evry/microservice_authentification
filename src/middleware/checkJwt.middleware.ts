// checkJwtParam.middleware.ts
import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../tools/jwt-client";

export function checkJwtParam(req: Request, res: Response, next: NextFunction) {
    const { token } = req.params;

    if (!token) {
        return res.status(400).json({ success: false, message: "Token param missing" });
    }
    const decoded = verifyToken(token);
    if (!decoded) {
        return res.status(401).json({ success: false, message: "Invalid or expired token" });
    }

    // Stockage du payload décodé dans req.user, si souhaité
    (req as any).user = decoded;
    next();
}
