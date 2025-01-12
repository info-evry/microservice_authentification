import request from "supertest";
import passport from "passport";
import { serverInstance } from "../server";
import { User } from "@prisma/client";

const app = serverInstance.getApp();

describe("GitHub Routes", () => {
    const NEXT_URL = "http://localhost:3001";
    const GITHUB_CALLBACK = "/auth/github/callback?code=mockCode";

    beforeAll(() => {
        // On définit une variable d'env fictive pour NEXT_URL
        process.env.NEXT_URL = NEXT_URL;
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it("GET /auth/github should redirect to GitHub", async () => {
        const res = await request(app).get("/auth/github");
        expect(res.status).toBe(302);
        // vérifier "Location"
        expect(res.header.location).toMatch(/github\.com/);
    });

    it("GET /auth/github/callback without code => should redirect to /auth/github", async () => {
        const res = await request(app).get("/auth/github/callback");
        expect(res.status).toBe(302);
        expect(res.header.location).toBe("/auth/github");
    });

    // MOCK PASSPORT pour simuler un callback "success" ou "error"
    function mockPassportAuthenticate(err: Error | null, user: Partial<User> | undefined) {
        jest.spyOn(passport, "authenticate").mockImplementation(
            (_strategy: string, _opts: any, cb: Function) => {
                return (req: any, res: any, next: any) => {
                    cb(err, user, { message: err?.message ?? "" });
                };
            },
        );
    }

    it("should redirect with INTERNAL error if passport returns an error", async () => {
        mockPassportAuthenticate(new Error("Passport GitHub error"), undefined);

        const res = await request(app).get(GITHUB_CALLBACK);
        expect(res.status).toBe(302);
        expect(res.header.location).toBe(`${NEXT_URL}/auth/login?error=INTERNAL`);
    });

    it("should redirect with SSO_DENIED if user is not returned", async () => {
        mockPassportAuthenticate(null, undefined); // pas d'erreur, user=undefined

        const res = await request(app).get(GITHUB_CALLBACK);
        expect(res.status).toBe(302);
        expect(res.header.location).toBe(`${NEXT_URL}/auth/login?error=SSO_DENIED`);
    });

    const prisma = serverInstance.getPrismaClient();

    it("should update user if existingByGithub is found", async () => {
        mockPassportAuthenticate(null, {
            githubId: "github-123",
            email: "test@github.com",
            name: "TestUser",
            emailVerifiedAt: new Date(),
        });

        jest.spyOn(prisma.user, "findUnique").mockResolvedValueOnce({
            id: "u1",
            githubId: "github-123",
            email: "test@github.com",
            name: "OldName",
            emailVerifiedAt: null,
        } as any);

        jest.spyOn(prisma.user, "update").mockResolvedValue({
            id: "u1",
            githubId: "github-123",
            email: "test@github.com",
            name: "TestUser",
            emailVerifiedAt: new Date(),
        } as any);

        const res = await request(app).get(GITHUB_CALLBACK);
        expect(res.status).toBe(302);
        expect(res.header.location).toMatch(/\/api\/auth\/callback\?token=/);
    });

    it("should redirect with SSO_EXISTS if email is already taken by another user", async () => {
        mockPassportAuthenticate(null, {
            githubId: "github-xyz",
            email: "already@exists.com",
        });

        const findUniqueSpy = jest.spyOn(prisma.user, "findUnique");
        findUniqueSpy.mockResolvedValueOnce(null);
        findUniqueSpy.mockResolvedValueOnce({
            id: "u2",
            email: "already@exists.com",
            githubId: null,
        } as any);

        const res = await request(app).get(GITHUB_CALLBACK);
        expect(res.status).toBe(302);
        expect(res.header.location).toBe(`${NEXT_URL}/auth/login?error=SSO_EXISTS`);
    });

    it("should create user if none found by githubId nor email", async () => {
        mockPassportAuthenticate(null, {
            githubId: "github-888",
            name: "NewGitHubUser",
            email: "new@github.com",
        });

        const findUniqueSpy = jest.spyOn(prisma.user, "findUnique");

        findUniqueSpy.mockResolvedValueOnce(null);
        findUniqueSpy.mockResolvedValueOnce(null);

        jest.spyOn(prisma.user, "create").mockResolvedValue({
            id: "u3",
            githubId: "github-888",
            email: "new@github.com",
            name: "NewGitHubUser",
        } as any);

        const res = await request(app).get(GITHUB_CALLBACK);
        expect(res.status).toBe(302);
        expect(res.header.location).toMatch(/\/api\/auth\/callback\?token=/);
    });

    it("should redirect with DATABASE error if prisma throws an error", async () => {
        mockPassportAuthenticate(null, {
            githubId: "error-999",
            email: "db@error.com",
        });

        jest.spyOn(prisma.user, "findUnique").mockRejectedValue(new Error("DB Error"));

        const res = await request(app).get(GITHUB_CALLBACK);
        expect(res.status).toBe(302);
        expect(res.header.location).toBe(`${NEXT_URL}/auth/login?error=DATABASE`);
    });
});
