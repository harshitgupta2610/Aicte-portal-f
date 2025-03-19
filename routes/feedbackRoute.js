const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");

const {
    getAllQuestions,
    postFeedback,
    getFeedbackAnalysis,
} = require("../controllers/feedbackController");

// Protected routes - require authentication
router.use(authController.protect);

router.route("/form")
    .get(getAllQuestions)
    .post(postFeedback);

router.route("/analysis/:commonId").get(getFeedbackAnalysis);

module.exports = router;