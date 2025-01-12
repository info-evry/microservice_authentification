import request from "supertest";
import passport from "passport";
import { serverInstance } from "../server";
import { User } from "@prisma/client";

const app = serverInstance.getApp();

describe("Google Routes", () => {
    const NEXT_URL = "http://localhost:3001";
    const GOOGLE_CALLBACK = "/auth/google/callback?code=mockCode";

    beforeAll(() => {
        process.env.NEXT_URL = NEXT_URL;
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it("GET /auth/google should redirect to Google", async () => {
        const res = await request(app).get("/auth/google");
        expect(res.status).toBe(302);
        //vérifier res.header.location
        expect(res.header.location).toMatch(/accounts\.google\.com/);
    });

    it("GET /auth/google/callback without code => should redirect to /auth/google", async () => {
        const res = await request(app).get("/auth/google/callback"); // pas de ?code=
        expect(res.status).toBe(302);
        expect(res.header.location).toBe("/auth/google");
    });

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
        mockPassportAuthenticate(new Error("Passport Google error"), undefined);

        const res = await request(app).get(GOOGLE_CALLBACK);
        expect(res.status).toBe(302);
        expect(res.header.location).toBe(`${NEXT_URL}/auth/login?error=INTERNAL`);
    });

    it("should redirect with SSO_DENIED if user is not returned", async () => {
        mockPassportAuthenticate(null, undefined);

        const res = await request(app).get(GOOGLE_CALLBACK);
        expect(res.status).toBe(302);
        expect(res.header.location).toBe(`${NEXT_URL}/auth/login?error=SSO_DENIED`);
    });

    const prisma = serverInstance.getPrismaClient();

    it("should update user if existingByGoogle is found", async () => {
        mockPassportAuthenticate(null, {
            googleId: "google-123",
            email: "test@google.com",
            name: "TestUser",
            emailVerifiedAt: new Date(),
        });

        jest.spyOn(prisma.user, "findUnique").mockResolvedValueOnce({
            id: "u1",
            googleId: "google-123",
            email: "test@google.com",
            name: "OldName",
            emailVerifiedAt: null,
        } as any);

        jest.spyOn(prisma.user, "update").mockResolvedValue({
            id: "u1",
            googleId: "google-123",
            email: "test@google.com",
            name: "TestUser",
            emailVerifiedAt: new Date(),
        } as any);

        const res = await request(app).get(GOOGLE_CALLBACK);
        expect(res.status).toBe(302);
        expect(res.header.location).toMatch(/\/api\/auth\/callback\?token=/);
    });

    it("should redirect with SSO_EXISTS if email is already taken", async () => {
        mockPassportAuthenticate(null, {
            googleId: "google-xyz",
            email: "already@exists.com",
        });

        const findUniqueSpy = jest.spyOn(prisma.user, "findUnique");
        findUniqueSpy.mockResolvedValueOnce(null);
        findUniqueSpy.mockResolvedValueOnce({
            id: "u2",
            email: "already@exists.com",
            googleId: null,
        } as any);

        const res = await request(app).get(GOOGLE_CALLBACK);
        expect(res.status).toBe(302);
        expect(res.header.location).toBe(`${NEXT_URL}/auth/login?error=SSO_EXISTS`);
    });

    it("should create user if googleId and email do not exist", async () => {
        mockPassportAuthenticate(null, {
            googleId: "google-888",
            name: "NewGoogleUser",
            email: "new@google.com",
        });

        const findUniqueSpy = jest.spyOn(prisma.user, "findUnique");
        // googleId => null
        findUniqueSpy.mockResolvedValueOnce(null);
        // email => null
        findUniqueSpy.mockResolvedValueOnce(null);

        jest.spyOn(prisma.user, "create").mockResolvedValue({
            id: "u3",
            googleId: "google-888",
            email: "new@google.com",
            name: "NewGoogleUser",
        } as any);

        const res = await request(app).get(GOOGLE_CALLBACK);
        expect(res.status).toBe(302);
        expect(res.header.location).toMatch(/\/api\/auth\/callback\?token=/);
    });

    it("should redirect with DATABASE error if prisma throws an error", async () => {
        mockPassportAuthenticate(null, {
            googleId: "error-999",
            email: "db@error.com",
        });

        jest.spyOn(prisma.user, "findUnique").mockRejectedValue(new Error("DB Error"));

        const res = await request(app).get(GOOGLE_CALLBACK);
        expect(res.status).toBe(302);
        expect(res.header.location).toBe(`${NEXT_URL}/auth/login?error=DATABASE`);
    });
});
