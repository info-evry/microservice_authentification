import request from "supertest";
import { serverInstance } from "../server";
import { verifyToken } from "../tools/jwt-client";

const app = serverInstance.getApp();

jest.mock("../tools/jwt-client", () => ({
    verifyToken: jest.fn(),
}));

describe("checkJwt.routes", () => {
    const mockedVerifyToken = verifyToken as jest.Mock;

    beforeEach(() => {
        mockedVerifyToken.mockReset();
    });

    it("should return 404 if route is called without :token", async () => {
        const res = await request(app).get("/auth/verify-token");
        expect(res.status).toBe(404);
    });

    it("should return 401 if token is invalid or expired", async () => {
        mockedVerifyToken.mockReturnValue(null);

        const res = await request(app).get("/auth/verify-token/invalidToken");
        expect(res.status).toBe(401);
        expect(res.body).toEqual({
            success: false,
            message: "Invalid or expired token",
        });
    });

    it("should return success if token is valid", async () => {
        mockedVerifyToken.mockReturnValue({ userId: 123, role: "test" });

        const res = await request(app).get("/auth/verify-token/validToken");
        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({
            success: true,
            message: "Token is valid",
            user: { userId: 123, role: "test" },
        });
    });
});
