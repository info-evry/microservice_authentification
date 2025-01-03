import { Request, Response } from "express";
import { serverInstance } from "../server";

export class DefaultMiddleware {
    public static healthcheck(req: Request, res: Response) {
        res.status(200).send("OK");
    }

    public static async exampleToDelete(req: Request, res: Response) {
        try {
            //.then is a promise function, so we can use await to wait for the result
            const users = await serverInstance.getPrismaClient().user.findMany();
            res.status(200).send(users);
        } catch (error) {
            res.status(500).send(`An error occured : ${error}`);
        }
    }
}
