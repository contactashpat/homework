const requireAuthenticatedUser = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  return next();
};

const authorizeRoles =
  (...allowedRoles) =>
  (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (allowedRoles.length === 0) {
      return next();
    }

    const userRoles = Array.isArray(req.user.roles) ? req.user.roles : [];
    const hasRole = allowedRoles.some((role) => userRoles.includes(role));

    if (!hasRole) {
      return res.status(403).json({ error: "Forbidden" });
    }

    return next();
  };

module.exports = { requireAuthenticatedUser, authorizeRoles };
