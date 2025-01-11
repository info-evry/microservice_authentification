import { Application } from "express";
import { DefaultMiddleware } from "../middleware/default.middleware";

export default function (app: Application) {
    app.get("/", DefaultMiddleware.healthcheck);
}
