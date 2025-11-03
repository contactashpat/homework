const express = require("express");
const { loggingMiddleware } = require("./middleware/logging");
const { authenticateRequest } = require("./middleware/authentication");
const { countUsers } = require("./repositories/userRepository");
const authRouter = require("./routes/auth");
const secureRouter = require("./routes/secure");

const app = express();
const port = process.env.PORT ?? 4000;

app.use(express.json());
app.use(loggingMiddleware);
app.use(authenticateRequest);

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/auth", authRouter);
app.use("/secure", secureRouter);

app.use((req, res) => {
  res.status(404).json({ error: "Not found", path: req.originalUrl });
});

// Generic error handler deliberately placed last.
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  // eslint-disable-next-line no-console
  console.error(
    JSON.stringify({
      level: "error",
      message: err.message,
      stack: err.stack,
    }),
  );
  res.status(500).json({ error: "Internal Server Error" });
});

const warnIfNoUsers = () => {
  try {
    const total = countUsers();
    if (total === 0) {
      // eslint-disable-next-line no-console
      console.warn(
        JSON.stringify({
          level: "warn",
          message: "No user accounts found. Use the user CLI to create an initial admin.",
          hint: "npm run user-cli -- create --username=admin@example.com --password=secret --roles=admin",
        }),
      );
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(
      JSON.stringify({
        level: "error",
        message: "Failed to inspect user table.",
        details: error instanceof Error ? error.message : String(error),
      }),
    );
  }
};

warnIfNoUsers();

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify({
      level: "info",
      message: `Backend server listening on port ${port}`,
    }),
  );
});
