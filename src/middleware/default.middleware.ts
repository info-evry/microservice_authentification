import { Request, Response } from "express";
import { serverInstance } from "../server";

export class DefaultMiddleware {
    public static healthcheck(req: Request, res: Response) {
        res.status(200).send("OK");
    }
}
