import { generateToken, verifyToken } from "../tools/jwt-client";

describe("JWT Client", () => {
    it("should generate and verify a valid token", () => {
        // On génère un token avec un payload fictif
        const token = generateToken({ userId: "123", role: "ADMIN" });
        // On vérifie qu'il est décodable
        const decoded = verifyToken(token);
        // On s'attend à retrouver nos champs
        expect(decoded).toBeTruthy();
        expect(decoded).toHaveProperty("userId", "123");
        expect(decoded).toHaveProperty("role", "ADMIN");
    });

    it("should return null if token is invalid", () => {
        const decoded = verifyToken("token_invalide_ici");
        expect(decoded).toBeNull();
    });

    it("should return null if token is expired", () => {
        // Un token expiré
        const expiredToken = "eyJhbGciOi...";
        const decoded = verifyToken(expiredToken);
        expect(decoded).toBeNull();
    });
});
