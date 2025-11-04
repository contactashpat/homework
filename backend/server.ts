import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import collectionsRouter from "./routes/collections";
import quizAttemptsRouter from "./routes/quizAttempts";
import authRouter from "./routes/auth";
import { requireAuth } from "./middleware/authMiddleware";

const app = express();
const port = Number.parseInt(process.env.PORT ?? "4000", 10);

app.use(express.json());

app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.get("/debug", (_req: Request, res: Response) => {
  res.json({
    message: "Backend is running",
    collectionsRouteMounted: true,
    quizAttemptsRouteMounted: true,
  });
});

app.use("/auth", authRouter);
app.use("/collections", requireAuth, collectionsRouter);
app.use("/quiz-attempts", requireAuth, quizAttemptsRouter);

app.use((req: Request, res: Response) => {
  res.status(404).json({ error: "Not found", path: req.originalUrl });
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Unhandled backend error:", err);
  res.status(500).json({ error: "Internal Server Error" });
});

app.listen(port, () => {
  console.log(`Backend server listening on http://localhost:${port}`);
});

export default app;
