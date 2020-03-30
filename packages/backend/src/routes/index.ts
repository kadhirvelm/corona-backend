import Express from "express";
import { setCoronaRoutes } from "./corona";
import { setReactRoutes } from "./frontend";

export function setRoutes(app: Express.Express) {
    app.get("/", (_, res) => {
        res.redirect("/index.html");
    });

    setCoronaRoutes(app);
    setReactRoutes(app);
}
