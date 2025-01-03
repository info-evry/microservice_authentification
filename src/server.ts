import dotenv from "dotenv";
import cors from "cors";
import express from "express";
import glob from "glob";
import path from "path";
import { config } from "./config/config";
import { PrismaClient } from "@prisma/client";
import passport from "./middleware/auth.middleware";

dotenv.config();

export class Server {
    private host: string;
    private port: number;
    private app: express.Application;
    private prisma: PrismaClient;

    constructor(host: string, port: number) {
        this.host = host;
        this.port = port;
        this.app = express();
        this.prisma = new PrismaClient();

        /**
         * @see README#Security
         */
        this.app.set("trust proxy", true);

        this.app.use(
            cors({
                allowedHeaders:
                    "Authorization, Access-Control-Allow-Origin, X-Requested-With, Content-Type, Cache-Control, Pragma, Expires, Accept-Encoding, X-Total-Count, Access-Control-Allow-Headers, Content-Disposition",
                exposedHeaders: "Content-Disposition",
                origin: config.get("cors"),
                methods: "GET, POST, OPTIONS, PUT, PATCH, DELETE",
                credentials: true,
            }),
        );

        //body-parser
        this.app.use(
            express.json({
                limit: "50mb",
            }),
        );
        this.app.use(passport.initialize());
        this.setRoute();
        this.app.use("/public", express.static(__dirname + "/public"));
    }

    private async setRoute() {
        let route = glob.sync(path.posix.join(__dirname, "./routes/*.routes.*s"));

        for (let i = 0; i < route.length; i++) {
            const _route = route[i];
            if (_route === undefined) {
                continue;
            }

            let route_file;
            try {
                route_file = await import(_route);
                route_file.default(this.app);
            } catch (error) {
                console.log(`Failed to load ${route[i]}\n${error}`);
            }

            console.log(`Route ${route[i]} loaded.`);
        }
    }

    public getApp(): express.Application {
        return this.app;
    }

    public getPrismaClient(): PrismaClient {
        return this.prisma;
    }

    public start(): express.Application {
        this.app.listen(this.port, () => {
            console.log(`Server started on port ${this.host}:${this.port}.`);
        });

        return this.app;
    }
}

const host = config.get("host");
const port = config.get("port");

export const serverInstance = new Server(host, port);
