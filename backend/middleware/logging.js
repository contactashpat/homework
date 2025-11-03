const { performance } = require("node:perf_hooks");

/**
 * Express middleware that logs request and response details along with timing.
 * The log format keeps fields machine-readable so we can expand it later.
 */
const loggingMiddleware = (req, res, next) => {
  const startTime = performance.now();
  const { method, originalUrl } = req;

  res.on("finish", () => {
    const durationMs = performance.now() - startTime;
    const logEntry = {
      level: "info",
      method,
      path: originalUrl,
      status: res.statusCode,
      durationMs: Number(durationMs.toFixed(2)),
    };
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(logEntry));
  });

  next();
};

module.exports = { loggingMiddleware };
