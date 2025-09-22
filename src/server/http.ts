import { join } from "path";
import express from "express";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import http from "http";
import logger from "signale";

import api from "./api/api";

const PORT = process.env.PORT ?? "9000";
const PUBLIC_ROOT = join(__dirname, "..", "..", "..", "public");

const app = express();

app.use(express.static(PUBLIC_ROOT, { index: false }));
app.use(bodyParser.json());
app.use(cookieParser());

app.use("/api", api);

app.get("*", (req, res) => {
  res.sendFile(join(PUBLIC_ROOT, "index.html"));
});

export const server = http.createServer(app);

server.listen(PORT, () => {
  logger.success(`Express app listening at http://localhost:${PORT}/`);
});
