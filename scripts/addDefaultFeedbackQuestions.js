const mongoose = require('mongoose');
const FeedbackQuestions = require('../models/feedbackQuestions');
require('dotenv').config();

const defaultQuestions = [
  {
    questionNo: 1,
    question: "How would you rate the difficulty level of this course?",
    questionType: "rate",
    options: [],
    isActive: true
  },
  {
    questionNo: 2,
    question: "Are you satisfied with the course content?",
    questionType: "true/false",
    options: [],
    isActive: true
  },
  {
    questionNo: 3,
    question: "How interested are you in the course material?",
    questionType: "rate",
    options: [],
    isActive: true
  },
  {
    questionNo: 4,
    question: "How relevant is this course to your career goals?",
    questionType: "rate",
    options: [],
    isActive: true
  },
  {
    questionNo: 5,
    question: "What aspects of the course did you find most challenging?",
    questionType: "descriptive",
    options: [],
    isActive: true
  },
  {
    questionNo: 6,
    question: "How would you rate the teaching methodology?",
    questionType: "rate",
    options: [],
    isActive: true
  },
  {
    questionNo: 7,
    question: "What improvements would you suggest for this course?",
    questionType: "descriptive",
    options: [],
    isActive: true
  }
];

const addDefaultQuestions = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URL);
    console.log('Connected to MongoDB');

    // Clear existing questions
    await FeedbackQuestions.deleteMany({});
    console.log('Cleared existing questions');

    // Insert default questions
    await FeedbackQuestions.insertMany(defaultQuestions);
    console.log('Added default questions successfully');

    // Close connection
    await mongoose.connection.close();
    console.log('Connection closed');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

addDefaultQuestions(); 