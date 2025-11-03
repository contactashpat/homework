const jwt = require("jsonwebtoken");

const PUBLIC_ROUTES = [
  { method: "GET", path: "/health" },
  { method: "POST", path: "/auth/login" },
];

const matchPublicRoute = (req) =>
  PUBLIC_ROUTES.some(
    (route) => route.method === req.method && route.path === req.path,
  );

const normalizeRoles = (roles) => {
  if (!Array.isArray(roles)) {
    return [];
  }
  return roles
    .map((role) => (typeof role === "string" ? role : null))
    .filter(Boolean);
};

const authenticateRequest = (req, res, next) => {
  if (matchPublicRoute(req)) {
    return next();
  }

  const secret = process.env.BACKEND_JWT_SECRET;

  if (!secret) {
    // No secret configured means auth is disabled.
    return next();
  }

  const header = req.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : null;

  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const payload = jwt.verify(token, secret, {
      algorithms: ["HS256"],
    });
    req.user = {
      ...payload,
      roles: normalizeRoles(payload.roles),
    };
    res.locals.user = req.user;
    return next();
  } catch (error) {
    return res.status(401).json({
      error: "Unauthorized",
      message: error instanceof Error ? error.message : String(error),
    });
  }
};

module.exports = { authenticateRequest };
