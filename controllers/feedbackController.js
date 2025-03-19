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
    const {subjectId, by, answers} = req.body;
    // TO-DO ---------------------------------------------
    // const isStudent = true;

    answers.forEach((ans, index, array) => {
        array[index] = {
          subjectId,
          by,
          questionNo: ans.questionNo,
          questionType: ans.questionType,
          value: ans.value,
        };
    });

    const result = await FeedbackResponse.insertMany(answers);
    
    // console.log(result); 
    res.status(StatusCodes.CREATED).json({message: "Feedback Accepted", dataSent: req.body.answers})
}

async function getFeedbackAnalysis(req, res) {
    const { commonId } = req.params;
    
    const data = await FeedbackResponse.aggregate([
        {
            $match: {
                subjectId: { $eq: new mongoose.Types.ObjectId(commonId) }
            }
        },
        {
            $project: {
                year: 1,
                questionNo: 1,
                questionType: 1,
                value: 1,
                integersValues: {
                    $cond: {
                        if: { $in: ["$questionType", ["rate", "true/false"]] },
                        then: { $toInt: "$value" },
                        else: null
                    }
                },
                nonIntegersValues: {
                    $cond: {
                        if: { $in: ["$questionType", ["rate", "true/false"]] },
                        then: null,
                        else: "$value"
                    }
                }
            }
        },
        {
            $group: {
                _id: { questionNo: "$questionNo", questionType: "$questionType" },
                integersValues: { $avg: "$integersValues" },
                nonIntegersValues: { $push: "$nonIntegersValues" },
                totalResponses: { $sum: 1 }
            }
        },
        {
            $project: {
                _id: 0,
                fields: "$_id",
                integersValues: 1,
                nonIntegersValues: {
                    $cond: {
                        if: { $eq: ["$integersValues", null] },
                        then: {
                            $filter: {
                                input: "$nonIntegersValues",
                                as: "value",
                                cond: { $ne: ["$$value", null] }
                            }
                        },
                        else: null
                    }
                },
                totalResponses: 1
            }
        },
        {
            $sort: { "fields.questionNo": 1 }
        }
    ]);

    res.status(StatusCodes.OK).json({ data });
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
