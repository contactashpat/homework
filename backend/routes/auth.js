const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { requireAuthenticatedUser } = require("../middleware/authorization");
const { findUserByUsername } = require("../repositories/userRepository");

const router = express.Router();

const buildTokenPayload = (user) => ({
  sub: user.id ?? user.username,
  username: user.username,
  roles: user.roles,
  type: "user",
});

const getTokenExpiresIn = () =>
  process.env.BACKEND_JWT_EXPIRES_IN && process.env.BACKEND_JWT_EXPIRES_IN.trim().length > 0
    ? process.env.BACKEND_JWT_EXPIRES_IN.trim()
    : "1h";

router.post("/login", (req, res) => {
  const secret = process.env.BACKEND_JWT_SECRET;
  if (!secret) {
    return res.status(500).json({
      error: "Authentication not configured",
      message: "BACKEND_JWT_SECRET must be set to issue tokens.",
    });
  }

  const { username, password } = req.body ?? {};
  if (typeof username !== "string" || typeof password !== "string") {
    return res.status(400).json({ error: "Username and password are required" });
  }

  const user = findUserByUsername(username);
  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const passwordValid = bcrypt.compareSync(password, user.passwordHash);
  if (!passwordValid) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const payload = buildTokenPayload(user);
  const expiresIn = getTokenExpiresIn();
  const token = jwt.sign(payload, secret, {
    algorithm: "HS256",
    expiresIn,
    issuer: "flashcard-backend",
  });

  return res.json({
    token,
    tokenType: "Bearer",
    expiresIn,
    user: {
      id: user.id,
      username: user.username,
      roles: user.roles,
    },
  });
});

router.get("/me", requireAuthenticatedUser, (req, res) => {
  const { sub, username, roles = [], type } = req.user ?? {};
  return res.json({
    user: {
      id: sub ?? username,
      username: username ?? sub,
      roles,
      tokenType: type ?? "unknown",
    },
  });
});

module.exports = router;
