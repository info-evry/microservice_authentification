import passport from "passport";
import { Strategy as GitHubStrategy } from "passport-github2";
import { User } from "@prisma/client";
import "../middleware/auth.middleware";

describe("GitHub Strategy", () => {
    let githubStrategy: GitHubStrategy;

    beforeAll(() => {
        // On récupère la stratégie GitHub
        githubStrategy = passport._strategies.github as GitHubStrategy;
    });

    it('should call "done" with user if successful', async () => {
        const mockProfile: any = {
            id: "github-xyz",
            username: "john-github",
            emails: [{ value: "john@github.com" }],
        };
        const doneMock = jest.fn();

        await (githubStrategy as any)._verify(
            "mockAccessToken",
            "mockRefreshToken",
            mockProfile,
            doneMock,
        );

        expect(doneMock).toHaveBeenCalledTimes(1);
        const callArgs = doneMock.mock.calls[0];
        expect(callArgs[0]).toBeNull();
        const userArg = callArgs[1] as User;

        expect(userArg.githubId).toBe("github-xyz");
        expect(userArg.name).toBe("john-github");
        expect(userArg.email).toBe("john@github.com");
        expect(userArg.emailVerifiedAt).toBeInstanceOf(Date);
    });

    it('should call "done" with error if exception occurs', async () => {
        // On force une exception en passant un profile null
        const doneMock = jest.fn();
        await (githubStrategy as any)._verify(
            "mockAccessToken",
            "mockRefreshToken",
            null, // profil cassé
            doneMock,
        );

        expect(doneMock).toHaveBeenCalledTimes(1);
        expect(doneMock.mock.calls[0][0]).toBeInstanceOf(Error);
        expect(doneMock.mock.calls[0][1]).toBeUndefined();
    });
});
