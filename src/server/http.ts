import fs from "fs";
import { join } from "path";
import express from "express";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import http from "http";
import https from "https";
import logger from "signale";

const secrets = JSON.parse(fs.readFileSync("./secrets.json").toString());

const DEV = process.env.DEV;
const PORT = process.env.PORT ?? (DEV ? "80" : "443");
const PUBLIC_ROOT = join(__dirname, "..", "..", "public");

const app = express();

app.use(express.static(PUBLIC_ROOT, { index: false }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser(DEV ? undefined : secrets.cookie));

app.use((req, res, next) => {
  if (req.path === "/login") return next();

  const cookies = DEV ? req.cookies : req.signedCookies;
  if (!cookies["username"]) res.redirect("/login?redirect=" + req.url);
  else next();
});

app.get("/", (req, res) => {
  res.sendFile(join(PUBLIC_ROOT, "index.html"));
});

app.get("/login", (req, res) => {
  res.sendFile(join(PUBLIC_ROOT, "login.html"));
});

function saveCookie(res: express.Response, key: string, value: string) {
  res.cookie(key, value, DEV ? undefined : { signed: true });
}

app.post("/login", (req, res) => {
  saveCookie(res, "username", req.body.username);
  saveCookie(res, "color", req.body.color);
  res.redirect(req.body.redirect ?? "/");
});

export const server = DEV
  ? http.createServer(app)
  : https.createServer(
      {
        key: fs.readFileSync("./ssl/private.key.pem"),
        cert: fs.readFileSync("./ssl/domain.cert.pem"),
      },
      app,
    );

server.listen(PORT, () => {
  logger.success(
    `Express app listening at http${DEV ? "" : "s"}://localhost:${PORT}/`,
  );
});
