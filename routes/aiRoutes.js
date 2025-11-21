const express = require("express");
const router = express.Router();
const aiController = require("../controllers/aiController");
const multer = require("multer");
const upload = multer({ dest: "uploads/" });

router.post("/chat", aiController.chat);
router.post(
  "/compare",
  upload.fields([{ name: "modelPdf", maxCount: 1 }, { name: "generatedPdf", maxCount: 1 }]),
  aiController.compare
);

module.exports = router;
