import { Router, Request, Response } from "express";
import {
  getCollections,
  replaceCollections,
} from "../repositories/collectionsRepository";

const router = Router();

router.get("/", (_req: Request, res: Response) => {
  try {
    const data = getCollections();
    res.json(data);
  } catch (error) {
    console.error("Failed to fetch collections:", error);
    res.status(500).json({ error: "Failed to fetch collections" });
  }
});

router.put("/", (req: Request, res: Response) => {
  const { categories, flashcards } = req.body ?? {};

  if (!Array.isArray(categories) || !Array.isArray(flashcards)) {
    return res.status(400).json({ error: "Invalid payload" });
  }

  try {
    replaceCollections(categories, flashcards);
    return res.json({ status: "ok" });
  } catch (error) {
    console.error("Failed to persist collections:", error);
    return res
      .status(500)
      .json({ error: "Failed to persist collections" });
  }
});

export default router;
