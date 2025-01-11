import request from "supertest";
import passport from "passport";
import { serverInstance } from "../server";

const app = serverInstance.getApp();

describe("Google Routes", () => {
    // 1) Vérifier la redirection initiale
    it("GET /auth/google should redirect to Google", async () => {
        const res = await request(app).get("/auth/google");
        expect(res.status).toBe(302);
    });

    // 2) Callback sans paramètre "code"
    it("GET /auth/google/callback without code => should redirect back to /auth/google", async () => {
        const res = await request(app).get("/auth/google/callback");
        expect(res.status).toBe(302);
        expect(res.header.location).toBe("/auth/google");
    });

    // 3) Callback avec code => succès
    // Pour tester ce cas, on moque passport.authenticate pour appeler le callback success
    it("GET /auth/google/callback with code => success scenario", async () => {
        jest.spyOn(passport, "authenticate").mockImplementation(
            (strategyName: string, opts: any, cb: Function) => {
                return (req: any, res: any, next: any) => {
                    cb(null, {
                        googleId: "123",
                        name: "Test User",
                        email: "test@example.com",
                        emailVerifiedAt: new Date(),
                    });
                };
            },
        );

        const res = await request(app).get("/auth/google/callback?code=mockCode");
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty("success", true);
        expect(res.body).toHaveProperty("token");
        expect(res.body).toHaveProperty("user");
    });

    // 4) Callback avec code => erreur
    it("GET /auth/google/callback with code => error scenario", async () => {
        jest.spyOn(passport, "authenticate").mockImplementation(
            (strategyName: string, opts: any, cb: Function) => {
                return (req: any, res: any, next: any) => {
                    cb(new Error("Passport error"), undefined);
                };
            },
        );

        const res = await request(app).get("/auth/google/callback?code=mockCode");
        expect(res.status).toBe(500);
        expect(res.body).toHaveProperty("success", false);
        expect(res.body).toHaveProperty("message", "Passport error");
    });

    afterEach(() => {
        jest.restoreAllMocks(); // Restaure le comportement original de Passport
    });
});

describe("Google Routes - Detailed BDD branches", () => {
    // On nettoie les mocks entre les tests
    beforeEach(() => {
        jest.restoreAllMocks();
    });

    /**
     * 1) existingByGoogle => on update
     */
    it("should update user if existingByGoogle is found", async () => {
        // Moquer la callback de Passport pour un user "googleId: 123"
        jest.spyOn(passport, "authenticate").mockImplementation(
            (_strategy: string, _opts: any, cb: Function) => {
                return (req: any, res: any, next: any) => {
                    cb(null, {
                        googleId: "123",
                        name: "TestUser",
                        email: "test@example.com",
                        emailVerifiedAt: new Date(),
                    });
                };
            },
        );

        jest.spyOn(serverInstance.getPrismaClient().user, "findUnique").mockResolvedValueOnce({
            id: "u1",
            googleId: "123",
            email: "test@example.com",
            name: "OldName",
            emailVerifiedAt: null,
        } as any);

        jest.spyOn(serverInstance.getPrismaClient().user, "update").mockResolvedValue({
            id: "u1",
            googleId: "123",
            email: "test@example.com",
            name: "TestUser",
            emailVerifiedAt: new Date(),
        } as any);

        const res = await request(app).get("/auth/google/callback?code=mockCode");
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.user.googleId).toBe("123");
        expect(res.body.user.name).toBe("TestUser");
    });

    /**
     * 2) existingByGoogle => null, existingByEmail => user => 403
     */
    it("should return 403 if existingByEmail is found", async () => {
        // Simule le callback de Passport
        jest.spyOn(passport, "authenticate").mockImplementation(
            (_strategy: string, _opts: any, cb: Function) => {
                return (req: any, res: any, next: any) => {
                    cb(null, {
                        googleId: "abc-google",
                        name: "UserWithEmailConflict",
                        email: "already@exists.com",
                    });
                };
            },
        );

        const findUniqueSpy = jest.spyOn(serverInstance.getPrismaClient().user, "findUnique");
        findUniqueSpy.mockResolvedValueOnce(null);

        findUniqueSpy.mockResolvedValueOnce({
            id: "u2",
            email: "already@exists.com",
            googleId: null,
        } as any);

        const res = await request(app).get("/auth/google/callback?code=mockCode");
        expect(res.status).toBe(403);
        expect(res.text).toBe("Email already exists");
    });

    /**
     * 3) ni existingByGoogle ni existingByEmail => on crée un user
     */
    it("should create user if googleId and email do not exist", async () => {
        jest.spyOn(passport, "authenticate").mockImplementation(
            (_strategy: string, _opts: any, cb: Function) => {
                return (req: any, res: any, next: any) => {
                    cb(null, {
                        googleId: "google-888",
                        name: "BrandNewUser",
                        email: "new@user.com",
                    });
                };
            },
        );

        const findUniqueSpy = jest.spyOn(serverInstance.getPrismaClient().user, "findUnique");
        // 1er appel => googleId => null
        findUniqueSpy.mockResolvedValueOnce(null);
        // 2e appel => email => null
        findUniqueSpy.mockResolvedValueOnce(null);

        const createSpy = jest
            .spyOn(serverInstance.getPrismaClient().user, "create")
            .mockResolvedValue({
                id: "u123",
                googleId: "google-888",
                email: "new@user.com",
                name: "BrandNewUser",
            } as any);

        const res = await request(app).get("/auth/google/callback?code=mockCode");
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.user.googleId).toBe("google-888");
        expect(res.body.user.email).toBe("new@user.com");
        expect(createSpy).toHaveBeenCalledWith({
            data: expect.objectContaining({
                googleId: "google-888",
                email: "new@user.com",
                name: "BrandNewUser",
            }),
        });
    });

    /**
     * 4) Erreur BDD => catch => 500
     */
    it("should return 500 if prisma throws an error", async () => {
        jest.spyOn(passport, "authenticate").mockImplementation(
            (_strategy: string, _opts: any, cb: Function) => {
                return (req: any, res: any, next: any) => {
                    cb(null, { googleId: "error-999", email: "error@user.com" });
                };
            },
        );

        jest.spyOn(serverInstance.getPrismaClient().user, "findUnique").mockRejectedValue(
            new Error("DB Error"),
        );

        const res = await request(app).get("/auth/google/callback?code=mockCode");
        expect(res.status).toBe(500);
        expect(res.text).toMatch(/An error occurred: Error: DB Error/);
    });
});
