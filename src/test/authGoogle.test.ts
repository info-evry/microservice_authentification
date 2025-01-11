import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { User } from "@prisma/client";
import "../middleware/auth.middleware";

describe("Google Strategy", () => {
    let googleStrategy: GoogleStrategy;

    beforeAll(() => {
        // On récupère la stratégie Google
        googleStrategy = passport._strategies.google as GoogleStrategy;
    });

    it('should call "done" with user if successful', async () => {
        // Mock data
        const mockProfile: any = {
            id: "google-123",
            displayName: "John Doe",
            emails: [{ value: "john@example.com" }],
        };

        // On mock la fonction done
        const doneMock = jest.fn();

        await (googleStrategy as any)._verify(
            "mockAccessToken",
            "mockRefreshToken",
            mockProfile,
            doneMock,
        );

        // Vérifions que done a été appelé avec (null, user)
        expect(doneMock).toHaveBeenCalledTimes(1);
        const callArgs = doneMock.mock.calls[0];

        expect(callArgs[0]).toBeNull(); // pas d'erreur
        const userArg = callArgs[1] as User;

        expect(userArg.googleId).toBe("google-123");
        expect(userArg.name).toBe("John Doe");
        expect(userArg.email).toBe("john@example.com");
        expect(userArg.emailVerifiedAt).toBeInstanceOf(Date);
    });

    it('should call "done" with error if exception occurs', async () => {
        // On force une exception en passant un profile null
        const doneMock = jest.fn();
        const brokenProfile: any = null;

        await (googleStrategy as any)._verify(
            "mockAccessToken",
            "mockRefreshToken",
            brokenProfile,
            doneMock,
        );

        expect(doneMock).toHaveBeenCalledTimes(1);
        const callArgs = doneMock.mock.calls[0];
        expect(callArgs[0]).toBeInstanceOf(Error);
        expect(callArgs[1]).toBeUndefined();
    });
});
