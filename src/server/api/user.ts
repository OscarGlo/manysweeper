import express from "express";
import { SESSIONS } from "./auth";
import { getClient } from "../database";

const router = express.Router();

router.get("/", async (req, res) => {
  const sessionId = req.cookies.session;
  if (!sessionId) {
    return res.status(403).send("No session cookie");
  }
  if (!(sessionId in SESSIONS)) {
    return res.status(404).send("No session found");
  }
  res.send(SESSIONS[sessionId].user);
});

router.get("/:id", async (req, res) => {
  const { id } = req.params;
  const dbClient = await getClient();
  const dbRes = await dbClient.query(
    `SELECT *
     FROM "user"
     WHERE discord_id = $1`,
    [id],
  );
  if (dbRes.rows.length === 0) {
    return res.status(404).send(`No user with id ${req.params.id}`);
  }
  res.send(dbRes.rows[0]);
});

export default router;
