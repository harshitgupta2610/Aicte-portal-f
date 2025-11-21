const { StatusCodes } = require("http-status-codes");
const FeedbackQuestions = require("../models/feedbackQuestions");
const FeedbackResponse = require("../models/feedbackResponse");
const mongoose = require("mongoose");


async function getAllQuestions(req, res) {
    // Verify user  -----------------------------------
    // One faculty = one feedback per subject ---------

    // const data = FeedbackQuestions.find({$subjectId: {subjectId}});
    const data = await FeedbackQuestions.find({});
    
    res.status(StatusCodes.OK).json({questions: data});
}


async function postFeedback(req, res) {
    try {
        const {subjectId, by, answers} = req.body;

        if (!subjectId || !by || !answers || !Array.isArray(answers)) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                message: "Missing required fields: subjectId, by, or answers"
            });
        }

        // Convert string IDs to ObjectIds
        const formattedAnswers = answers.map(ans => ({
            subjectId: new mongoose.Types.ObjectId(subjectId),
            by: new mongoose.Types.ObjectId(by),
            questionNo: ans.questionNo,
            questionType: ans.questionType,
            value: ans.value,
        }));

        const result = await FeedbackResponse.insertMany(formattedAnswers);
        
        res.status(StatusCodes.CREATED).json({
            message: "Feedback submitted successfully",
            data: result
        });
    } catch (error) {
        if (error instanceof mongoose.Error.ValidationError) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                message: "Invalid data format",
                details: error.message
            });
        }
        
        if (error.code === 11000) {
            return res.status(StatusCodes.CONFLICT).json({
                message: "You have already submitted feedback for this course"
            });
        }

        console.error("Feedback submission error:", error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: "Failed to submit feedback"
        });
    }
}

async function getFeedbackAnalysis(req, res) {
    try {
        const { commonId } = req.params;
        
        if (!commonId) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                message: "Course ID is required"
            });
        }

        // Validate if commonId is a valid ObjectId
        if (!mongoose.Types.ObjectId.isValid(commonId)) {
            return res.status(StatusCodes.BAD_REQUEST).json({
                message: "Invalid course ID format"
            });
        }

        // First, get all questions to ensure we have the complete question set
        const questions = await FeedbackQuestions.find({}).sort({ questionNo: 1 });

        if (!questions || questions.length === 0) {
            return res.status(StatusCodes.OK).json({
                data: [],
                message: "No feedback questions found"
            });
        }

        // Get the feedback responses with proper error handling
        let data;
        try {
            data = await FeedbackResponse.aggregate([
                {
                    $match: {
                        subjectId: new mongoose.Types.ObjectId(commonId)
                    }
                },
                {
                    $addFields: {
                        numericValue: {
                            $cond: [
                                { $in: ["$questionType", ["rate", "true/false"]] },
                                { $convert: { input: "$value", to: "double", onError: 0 } },
                                null
                            ]
                        }
                    }
                },
                {
                    $group: {
                        _id: "$questionNo",
                        responses: { $push: "$value" },
                        questionType: { $first: "$questionType" },
                        totalResponses: { $sum: 1 },
                        averageRating: { 
                            $avg: "$numericValue"
                        }
                    }
                },
                {
                    $sort: { "_id": 1 }
                }
            ]).exec();
        } catch (aggregateError) {
            console.error("Aggregation error:", aggregateError);
            return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                message: "Error processing feedback data",
                error: aggregateError.message
            });
        }

        // If no feedback found, return empty array with all questions
        if (!data || data.length === 0) {
            const emptyData = questions.map(question => ({
                fields: {
                    questionNo: question.questionNo,
                    questionType: question.questionType,
                    question: question.question
                },
                integersValues: 0,
                nonIntegersValues: [],
                totalResponses: 0,
                responses: []
            }));

            return res.status(StatusCodes.OK).json({
                data: emptyData,
                totalQuestions: questions.length,
                totalResponses: 0,
                message: "No feedback found for this course"
            });
        }

        // Format the data to include question text and ensure all questions are represented
        const formattedData = questions.map(question => {
            const feedbackData = data.find(d => d._id === question.questionNo) || {
                responses: [],
                totalResponses: 0,
                averageRating: 0
            };

            return {
                fields: {
                    questionNo: question.questionNo,
                    questionType: question.questionType,
                    question: question.question
                },
                integersValues: feedbackData.averageRating || 0,
                nonIntegersValues: question.questionType === 'descriptive' ? feedbackData.responses : [],
                totalResponses: feedbackData.totalResponses || 0,
                responses: feedbackData.responses || []
            };
        });

        return res.status(StatusCodes.OK).json({
            data: formattedData,
            totalQuestions: questions.length,
            totalResponses: data.reduce((acc, curr) => acc + (curr.totalResponses || 0), 0)
        });

    } catch (error) {
        console.error("Error in getFeedbackAnalysis:", error);
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: "Failed to fetch feedback analysis",
            error: error.message
        });
    }
}

/* ------------- TO-DO's ------------------
    1) Optimize
    2) Edit questions functionality
    3) Sentimental Analysis API
*/

module.exports = {
    getAllQuestions,
    postFeedback,
    getFeedbackAnalysis,
}
