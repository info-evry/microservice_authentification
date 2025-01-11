import request from "supertest";
import passport from "passport";
import { serverInstance } from "../server";

const app = serverInstance.getApp();

describe("GitHub Routes", () => {
    it("GET /auth/github should redirect to GitHub", async () => {
        const res = await request(app).get("/auth/github");
        expect(res.status).toBe(302);
        // expect(res.header.location).toMatch(/github\.com/);
    });

    it("GET /auth/github/callback without code => redirect to /auth/github", async () => {
        const res = await request(app).get("/auth/github/callback");
        expect(res.status).toBe(302);
        expect(res.header.location).toBe("/auth/github");
    });

    it("GET /auth/github/callback with code => success scenario", async () => {
        jest.spyOn(passport, "authenticate").mockImplementation(
            (strategyName: string, opts: any, cb: Function) => {
                return (req: any, res: any, next: any) => {
                    cb(null, {
                        githubId: "github-xyz",
                        name: "GitHubUser",
                        email: "github@example.com",
                        emailVerifiedAt: new Date(),
                    });
                };
            },
        );

        const res = await request(app).get("/auth/github/callback?code=mockCode");
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty("success", true);
        expect(res.body).toHaveProperty("token");
        expect(res.body.user).toHaveProperty("githubId", "github-xyz");
    });

    it("GET /auth/github/callback with code => error scenario", async () => {
        jest.spyOn(passport, "authenticate").mockImplementation(
            (strategyName: string, opts: any, cb: Function) => {
                return (req: any, res: any, next: any) => {
                    cb(new Error("Passport GitHub error"), undefined);
                };
            },
        );

        const res = await request(app).get("/auth/github/callback?code=mockCode");
        expect(res.status).toBe(500);
        expect(res.body).toHaveProperty("success", false);
        expect(res.body).toHaveProperty("message", "Passport GitHub error");
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });
});

describe("GitHub Routes - Detailed BDD branches", () => {
    beforeEach(() => {
        jest.restoreAllMocks();
    });

    // 1) existingByGithub => on update
    it("should update user if existingByGithub is found", async () => {
        // Mock Passport callback success
        jest.spyOn(passport, "authenticate").mockImplementation(
            (_strategy: string, _opts: any, cb: Function) => {
                return (req: any, res: any, next: any) => {
                    cb(null, {
                        githubId: "github-xyz",
                        name: "TestUser",
                        email: "test@github.com",
                        emailVerifiedAt: new Date(),
                    });
                };
            },
        );

        // Mock Prisma
        // existingByGithub => found => user != null
        jest.spyOn(serverInstance.getPrismaClient().user, "findUnique").mockResolvedValueOnce({
            id: "u1",
            githubId: "github-xyz",
            email: "test@github.com",
            name: "OldName",
            emailVerifiedAt: null,
        } as any);

        // On mock l'update
        jest.spyOn(serverInstance.getPrismaClient().user, "update").mockResolvedValue({
            id: "u1",
            githubId: "github-xyz",
            email: "test@github.com",
            name: "TestUser",
            emailVerifiedAt: new Date(),
        } as any);

        const res = await request(app).get("/auth/github/callback?code=mockCode");
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body).toHaveProperty("token");
        expect(res.body.user.name).toBe("TestUser");
    });

    // 2) existingByGithub => null, mais existingByEmail => user => 403
    it("should return 403 if existingByEmail is found", async () => {
        // Simule le callback
        jest.spyOn(passport, "authenticate").mockImplementation(
            (_strategy: string, _opts: any, cb: Function) => {
                return (req: any, res: any, next: any) => {
                    cb(null, {
                        githubId: "github-abc",
                        name: "TestUser2",
                        email: "already@exists.com",
                    });
                };
            },
        );

        // Mock findUnique => pour githubId => null
        const findUniqueSpy = jest.spyOn(serverInstance.getPrismaClient().user, "findUnique");
        // 1er appel => for githubId => null
        findUniqueSpy.mockResolvedValueOnce(null);
        // 2eme appel => for email => un user => simulate existing email
        findUniqueSpy.mockResolvedValueOnce({
            id: "u2",
            email: "already@exists.com",
            githubId: null,
        } as any);

        const res = await request(app).get("/auth/github/callback?code=mockCode");
        expect(res.status).toBe(403);
        expect(res.text).toBe("Email already exists");
    });

    // 3) existingByGithub => null, existingByEmail => null => create
    it("should create a user if none found by githubId nor email", async () => {
        jest.spyOn(passport, "authenticate").mockImplementation(
            (_strategy: string, _opts: any, cb: Function) => {
                return (req: any, res: any, next: any) => {
                    cb(null, {
                        githubId: "github-888",
                        name: "NewUser",
                        email: "new@user.com",
                    });
                };
            },
        );

        const findUniqueSpy = jest.spyOn(serverInstance.getPrismaClient().user, "findUnique");
        // 1er appel => for githubId => null
        findUniqueSpy.mockResolvedValueOnce(null);
        // 2eme appel => for email => null
        findUniqueSpy.mockResolvedValueOnce(null);

        const createSpy = jest
            .spyOn(serverInstance.getPrismaClient().user, "create")
            .mockResolvedValue({
                id: "u123",
                githubId: "github-888",
                email: "new@user.com",
                name: "NewUser",
            } as any);

        const res = await request(app).get("/auth/github/callback?code=mockCode");
        expect(res.status).toBe(200);
        expect(res.body.user.email).toBe("new@user.com");
        // On peut vérifier que createSpy a été appelé
        expect(createSpy).toHaveBeenCalledWith({
            data: expect.objectContaining({
                githubId: "github-888",
                email: "new@user.com",
                name: "NewUser",
            }),
        });
    });

    // 4) erreur BDD => test du catch (dbError)
    it("should return 500 if prisma throws an error", async () => {
        jest.spyOn(passport, "authenticate").mockImplementation(
            (_strategy: string, _opts: any, cb: Function) => {
                return (req: any, res: any, next: any) => {
                    cb(null, { githubId: "error-999", email: "error@user.com" });
                };
            },
        );

        // On mock le findUnique => lève une exception
        jest.spyOn(serverInstance.getPrismaClient().user, "findUnique").mockRejectedValue(
            new Error("DB Error"),
        );

        const res = await request(app).get("/auth/github/callback?code=mockCode");
        expect(res.status).toBe(500);
        expect(res.text).toMatch(/An error occurred: Error: DB Error/);
    });
});
