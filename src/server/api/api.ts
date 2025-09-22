import express from "express";
import rooms from "./rooms";
import auth from "./auth";
import user from "./user";

const router = express.Router();

router.use("/rooms", rooms);
router.use("/auth", auth);
router.use("/user", user);

export default router;
