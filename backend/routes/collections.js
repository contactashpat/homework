const express = require("express");
const {
  getCollections,
  replaceCollections,
} = require("../repositories/collectionsRepository");

const router = express.Router();

router.get("/", (_req, res) => {
  try {
    const data = getCollections();
    res.json(data);
  } catch (error) {
    console.error("Failed to fetch collections:", error);
    res.status(500).json({ error: "Failed to fetch collections" });
  }
});

router.put("/", (req, res) => {
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
      .json({ error: "Failed to persist collections", message: error.message });
  }
});

module.exports = router;
