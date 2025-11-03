const express = require("express");
const {
  requireAuthenticatedUser,
  authorizeRoles,
} = require("../middleware/authorization");

const router = express.Router();

router.get("/profile", requireAuthenticatedUser, (req, res) => {
  const { sub, username, roles = [], type } = req.user ?? {};
  res.json({
    profile: {
      id: sub ?? username,
      username: username ?? sub,
      roles,
      tokenType: type ?? "unknown",
    },
  });
});

router.get(
  "/admin/ping",
  requireAuthenticatedUser,
  authorizeRoles("admin"),
  (_req, res) => {
    res.json({ status: "ok", scope: "admin" });
  },
);

module.exports = router;
