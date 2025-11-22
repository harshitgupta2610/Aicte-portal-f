const { GoogleGenerativeAI } = require("@google/generative-ai");
const pdfParse = require("pdf-parse");
const fs = require("fs");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const chat = async (req, res) => {
  try {
    const { message } = req.body;
    console.log("Received chat message:", message);
    
    if (!process.env.GEMINI_API_KEY) {
      console.error("GEMINI_API_KEY is missing in environment variables.");
      return res.status(500).json({ error: "Server configuration error: API Key missing" });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `You are an AI assistant for a curriculum design portal. Answer the following question related to curriculum design: ${message}`;
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    res.status(200).json({ reply: text });
  } catch (error) {
    console.error("Error in AI chat:", error);
    res.status(500).json({ error: "Internal Server Error", details: error.message });
  }
};

const cosineSimilarity = (vecA, vecB) => {
  const dotProduct = vecA.reduce((acc, val, i) => acc + val * vecB[i], 0);
  const magA = Math.sqrt(vecA.reduce((acc, val) => acc + val * val, 0));
  const magB = Math.sqrt(vecB.reduce((acc, val) => acc + val * val, 0));
  return (dotProduct / (magA * magB)) || 0;
};

const compare = async (req, res) => {
  try {
    if (!req.files || !req.files.modelPdf || !req.files.generatedPdf) {
      return res.status(400).json({ error: "Both Model and Generated PDFs are required." });
    }

    const modelPdfBuffer = fs.readFileSync(req.files.modelPdf[0].path);
    const generatedPdfBuffer = fs.readFileSync(req.files.generatedPdf[0].path);

    const modelData = await pdfParse(modelPdfBuffer);
    const generatedData = await pdfParse(generatedPdfBuffer);

    const modelText = modelData.text;
    const generatedText = generatedData.text;

    // 1. Generate Embeddings for Similarity Score
    const embeddingModel = genAI.getGenerativeModel({ model: "text-embedding-004" });
    
    // Truncate for embedding if necessary (though 004 handles large context, it's safer to chunk or truncate if huge)
    // For now, we'll take a reasonable chunk for the "overall feel" similarity
    const embeddingTextModel = modelText.substring(0, 8000); 
    const embeddingTextGen = generatedText.substring(0, 8000);

    const resultModel = await embeddingModel.embedContent(embeddingTextModel);
    const resultGen = await embeddingModel.embedContent(embeddingTextGen);

    const embeddingModelVec = resultModel.embedding.values;
    const embeddingGenVec = resultGen.embedding.values;

    const similarity = cosineSimilarity(embeddingModelVec, embeddingGenVec);
    const similarityPercentage = (similarity * 100).toFixed(2);

    // 2. Qualitative Analysis with LLM
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    
    // Truncate text for LLM analysis
    const truncatedModelText = modelText.substring(0, 12000);
    const truncatedGenText = generatedText.substring(0, 12000);

    const prompt = `
      I have two curriculum documents. 
      Document 1 (Model Curriculum):
      ${truncatedModelText}

      Document 2 (Generated Curriculum):
      ${truncatedGenText}

      I have calculated a mathematical similarity score of **${similarityPercentage}%** between these two documents based on their text embeddings.

      Your task is to provide a qualitative comparison to explain this score and help improve Document 2.

      Please provide your response in the following JSON format (do not use Markdown code blocks, just raw JSON):
      {
        "similarityScore": "${similarityPercentage}",
        "analysis": "A brief paragraph explaining the similarity score. Why are they similar or different?",
        "keyDifferences": ["Difference 1", "Difference 2", "Difference 3"],
        "missingTopics": ["Topic 1", "Topic 2"],
        "suggestions": ["Suggestion 1", "Suggestion 2", "Suggestion 3"]
      }
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();

    // Clean up potential markdown code blocks if the model adds them
    text = text.replace(/```json/g, "").replace(/```/g, "").trim();

    let jsonResponse;
    try {
        jsonResponse = JSON.parse(text);
    } catch (e) {
        // Fallback if JSON parsing fails
        console.error("Failed to parse JSON response from AI", e);
        jsonResponse = {
            similarityScore: similarityPercentage,
            analysis: text, // Return raw text if parsing fails
            keyDifferences: [],
            missingTopics: [],
            suggestions: []
        };
    }

    // Clean up uploaded files
    fs.unlinkSync(req.files.modelPdf[0].path);
    fs.unlinkSync(req.files.generatedPdf[0].path);

    res.status(200).json({ reply: jsonResponse });
  } catch (error) {
    console.error("Error in AI comparison:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const analyzeFeedback = async (req, res) => {
  try {
    const { feedbackTexts } = req.body;

    if (!feedbackTexts || !Array.isArray(feedbackTexts) || feedbackTexts.length === 0) {
      return res.status(400).json({ error: "Valid feedback texts array is required." });
    }

    // Limit to a reasonable amount of text to avoid token limits
    const combinedText = feedbackTexts.slice(0, 100).join("\n- "); 

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
      Analyze the following student feedback for a course:

      ${combinedText}

      Provide a deep, structured analysis in the following JSON format (do not use Markdown code blocks, just raw JSON):
      {
        "executiveSummary": "A concise, high-level summary of the overall feedback.",
        "sentiment": {
          "positive": 0,
          "negative": 0,
          "neutral": 0
        },
        "aspectAnalysis": {
          "content": { 
            "sentiment": "positive/neutral/negative", 
            "score": 0,
            "keyPoints": ["Point 1", "Point 2"] 
          },
          "delivery": { 
            "sentiment": "positive/neutral/negative", 
            "score": 0,
            "keyPoints": ["Point 1", "Point 2"] 
          },
          "assessment": { 
            "sentiment": "positive/neutral/negative", 
            "score": 0,
            "keyPoints": ["Point 1", "Point 2"] 
          }
        },
        "actionableRecommendations": [
          { "priority": "High", "action": "Specific action to take..." },
          { "priority": "Medium", "action": "Specific action to take..." },
          { "priority": "Low", "action": "Specific action to take..." }
        ],
        "criticalAlerts": ["Alert 1 (only if urgent)", "Alert 2"]
      }

      For "sentiment" (overall), provide percentages (0-100) summing to 100.
      For "aspectAnalysis", "score" should be 0-10 (10 being best).
      "criticalAlerts" should be empty if there are no urgent/severe issues (like harassment, unfair grading, completely broken content).
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();

    // Clean up potential markdown code blocks
    text = text.replace(/```json/g, "").replace(/```/g, "").trim();

    let jsonResponse;
    try {
        jsonResponse = JSON.parse(text);
    } catch (e) {
        console.error("Failed to parse JSON response from AI", e);
        // Fallback
        jsonResponse = {
            executiveSummary: "Could not generate summary.",
            sentiment: { positive: 0, negative: 0, neutral: 0 },
            aspectAnalysis: {
                content: { sentiment: "neutral", score: 0, keyPoints: [] },
                delivery: { sentiment: "neutral", score: 0, keyPoints: [] },
                assessment: { sentiment: "neutral", score: 0, keyPoints: [] }
            },
            actionableRecommendations: [],
            criticalAlerts: []
        };
    }

    res.status(200).json(jsonResponse);
  } catch (error) {
    console.error("Error in feedback analysis:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports = {
  chat,
  compare,
  analyzeFeedback,
};
