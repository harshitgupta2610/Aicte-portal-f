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

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    
    // Truncate text if too long to avoid token limits (basic truncation)
    const truncatedModelText = modelText.substring(0, 10000);
    const truncatedGenText = generatedText.substring(0, 10000);

    const prompt = `
      I have two curriculum documents. 
      Document 1 (Model Curriculum):
      ${truncatedModelText}

      Document 2 (Generated Curriculum):
      ${truncatedGenText}

      Compare Document 2 against Document 1. 
      
      Please provide your response in the following format:
      
      ## Similarity Score: [Percentage]%
      
      ## Key Differences
      [List key differences here]
      
      ## Missing Topics
      [List missing topics here]
      
      ## Suggestions for Improvement
      [List suggestions here]
      
      Focus on structure, key subjects, and learning outcomes. Use Markdown formatting for the entire response.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Clean up uploaded files
    fs.unlinkSync(req.files.modelPdf[0].path);
    fs.unlinkSync(req.files.generatedPdf[0].path);

    res.status(200).json({ reply: text });
  } catch (error) {
    console.error("Error in AI comparison:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports = {
  chat,
  compare,
};
