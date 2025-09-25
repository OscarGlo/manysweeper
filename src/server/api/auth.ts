import express from "express";

import * as secrets from "../../../secrets.json";
import { getClient } from "../database";
import { v4 } from "uuid";
import { User } from "../../model/User";

class Session {
  user: User;
}

export const SESSIONS = {} as Record<string, Session>;

const router = express.Router();

router.get("/", async (req, res) => {
  const code = req.query.code as string;

  const token = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    body: new URLSearchParams({
      client_id: secrets.discord.clientId,
      client_secret: secrets.discord.clientSecret,
      grant_type: "authorization_code",
      code: code,
      redirect_uri: "http://localhost:8443/api/auth",
    }),
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
  }).then((res) => res.json());

  const apiUser = await fetch("https://discord.com/api/users/@me", {
    headers: {
      authorization: `${token.token_type} ${token.access_token}`,
    },
  }).then((res) => res.json());

  const user = {
    discordId: apiUser.id,
    name: apiUser.global_name,
    color: apiUser.banner_color,
    avatar: `https://cdn.discordapp.com/avatars/${apiUser.id}/${apiUser.avatar}.png`,
  };

  const dbClient = await getClient();
  await dbClient.query(
    `INSERT INTO "user" (discord_id, name, color, avatar)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (discord_id)
         DO UPDATE SET name   = $2,
                       color  = $3,
                       avatar = $4`,
    [user.discordId, user.name, user.color, user.avatar],
  );

  const sessionId = v4();
  SESSIONS[sessionId] = { user };
  res.cookie("session", sessionId, { maxAge: 30 * 24 * 60 * 60 }).redirect("/");
});

router.delete("/", async (req, res) => {
  delete SESSIONS[req.cookies.session];
  res.clearCookie("session").sendStatus(200);
});

export default router;

// https://discord.com/oauth2/authorize?client_id=1349493971608408224&response_type=code&redirect_uri=http%3A%2F%2Flocalhost%3A8443%2Fapi%2Fauth&scope=identify