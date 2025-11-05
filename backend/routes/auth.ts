import { Router, Request, Response } from "express";
import {
  authenticateUser,
  createSessionTokens,
  rotateRefreshToken,
  revokeRefreshToken,
  authenticateWithGoogle,
} from "../services/authService";

const router = Router();

router.post("/login", async (req: Request, res: Response) => {
  const { username, password } = req.body ?? {};
  if (typeof username !== "string" || typeof password !== "string") {
    return res
      .status(400)
      .json({ error: "Username and password are required" });
  }

  const user = await authenticateUser(username, password);
  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const tokens = await createSessionTokens(user);

  return res.json({
    user: {
      id: user.id,
      username: user.username,
      roles: user.roles,
    },
    ...tokens,
  });
});

router.post("/refresh", async (req: Request, res: Response) => {
  const { refreshToken } = req.body ?? {};
  if (typeof refreshToken !== "string" || refreshToken.trim().length === 0) {
    return res.status(400).json({ error: "Refresh token is required" });
  }

  try {
    const { user, ...tokens } = await rotateRefreshToken(refreshToken);
    return res.json({
      user: {
        id: user.id,
        username: user.username,
        roles: user.roles,
      },
      ...tokens,
    });
  } catch (error) {
    return res
      .status(401)
      .json({ error: "Invalid or expired refresh token" });
  }
});

router.post("/logout", async (req: Request, res: Response) => {
  const { refreshToken } = req.body ?? {};
  if (typeof refreshToken !== "string" || refreshToken.trim().length === 0) {
    return res.status(400).json({ error: "Refresh token is required" });
  }

  try {
    revokeRefreshToken(refreshToken);
    return res.json({ status: "ok" });
  } catch (error) {
    return res
      .status(200)
      .json({ status: "ok", message: "Token already invalidated" });
  }
});

router.post("/google", async (req: Request, res: Response) => {
  const { idToken } = req.body ?? {};
  if (typeof idToken !== "string" || idToken.trim().length === 0) {
    return res.status(400).json({ error: "Google ID token is required" });
  }

  try {
    const user = await authenticateWithGoogle(idToken);
    const tokens = await createSessionTokens(user);

    return res.json({
      user: {
        id: user.id,
        username: user.username,
        roles: user.roles,
      },
      ...tokens,
    });
  } catch (error) {
    console.error("Google authentication failed:", error);
    return res.status(401).json({ error: "Invalid Google credentials" });
  }
});

export default router;
