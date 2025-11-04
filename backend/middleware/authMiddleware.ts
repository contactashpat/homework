import { Request, Response, NextFunction } from "express";
import {
  verifyAccessToken,
  type AuthenticatedUser,
  getServiceSecret,
} from "../services/authService";

declare module "express-serve-static-core" {
  interface Request {
    authUser?: AuthenticatedUser;
  }
}

export const requireAuth = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const authHeader = req.get("authorization") ?? "";
  const serviceSecret = getServiceSecret();

  const serviceHeader = req.get("x-service-secret");
  if (serviceSecret && serviceHeader && serviceSecret === serviceHeader) {
    return next();
  }

  if (!authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const payload = verifyAccessToken(token);
    req.authUser = {
      id: payload.sub,
      username: payload.username,
      roles: payload.roles,
    };
    return next();
  } catch (error) {
    return res.status(401).json({ error: "Unauthorized" });
  }
};

export const requireRole = (...roles: string[]) =>
  (req: Request, res: Response, next: NextFunction) => {
    if (!req.authUser) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    if (roles.length === 0) {
      return next();
    }
    const hasRole = req.authUser.roles.some((role) => roles.includes(role));
    if (!hasRole) {
      return res.status(403).json({ error: "Forbidden" });
    }
    return next();
  };
