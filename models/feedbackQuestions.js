const mongoose = require('mongoose');

const feedbackQuestionsSchema = new mongoose.Schema({
  questionNo: {
    type: Number,
    required: true,
    unique: true
  },
  question: {
    type: String,
    required: true
  },
  questionType: {
    type: String,
    required: true,
    enum: ["descriptive", "rate", "true/false", "select"]
  },
  options: [{
    type: String
  }],
  isActive: {
    type: Boolean,
    default: true
  }
});

const FeedbackQuestions = mongoose.model('Feedback_questions', feedbackQuestionsSchema);

module.exports = FeedbackQuestions;