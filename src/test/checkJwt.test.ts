import { Request, Response, NextFunction } from "express";
import { checkJwtParam } from "../middleware/checkJwt.middleware";
import { verifyToken } from "../tools/jwt-client";

// Mock de verifyToken pour contrôler son comportement dans les tests
jest.mock("../tools/jwt-client", () => ({
    verifyToken: jest.fn(),
}));

describe("checkJwt middleware", () => {
    let req: Partial<Request>;
    let res: Partial<Response>;
    let next: NextFunction;

    beforeEach(() => {
        req = {
            params: {},
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
        next = jest.fn();
        // Par défaut, on reset le mock
        (verifyToken as jest.Mock).mockReset();
    });

    it("should return 400 if token param is missing", () => {
        // token param is missing
        req.params = {};

        checkJwtParam(req as Request, res as Response, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            message: "Token param missing",
        });
        expect(next).not.toHaveBeenCalled();
    });

    it("should return 401 if token is invalid or expired", () => {
        req.params = { token: "invalidToken" };
        // On force verifyToken à renvoyer null => token invalide
        (verifyToken as jest.Mock).mockReturnValue(null);

        checkJwtParam(req as Request, res as Response, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            message: "Invalid or expired token",
        });
        expect(next).not.toHaveBeenCalled();
    });

    it("should call next() if token is valid", () => {
        req.params = { token: "validToken" };
        (verifyToken as jest.Mock).mockReturnValue({ userId: 123, iat: 12345, exp: 23456 });

        checkJwtParam(req as Request, res as Response, next);

        // On s'attend à ce que ça appelle next() car token est valide
        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
        expect(res.json).not.toHaveBeenCalled();

        // On vérifie que le middleware a bien ajouté l'utilisateur à la requête
        expect((req as any).user).toEqual({ userId: 123, iat: 12345, exp: 23456 });
    });
});
