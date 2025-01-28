const express = require("express");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const cors = require("cors");
const fs = require("fs");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const GEMINI_API_KEY = "AIzaSyDJ7Uj24Mp5A10q0koB0_CbaRfgtwi0ziI";

const app = express();
const PORT = 3000;

// CORS Setup
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true,
  })
);

// Multer for file uploads
const upload = multer({ dest: "uploads/" });

// File path for the uploaded PDF
const UPLOAD_PATH = "uploads/uploaded.pdf";


const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

async function askGemini(question, context) {
  const prompt = `Use the following context to answer the question:\n\n${context}\n\nQuestion: ${question}`;
  try {
    const result = await model.generateContent(prompt);

    return result.response.text() || "No answer found.";
  } catch (err) {
    console.error("OpenAI API Error:", err.message);
    return "Error querying OpenAI API.";
  }
}

// Extract text from PDF
async function extractTextFromPDF(pdfPath) {
  try {
    const data = fs.readFileSync(pdfPath);
    const pdfData = await pdfParse(data);
    return pdfData.text || "No text found in the PDF.";
  } catch (err) {
    console.error("PDF Parsing Error:", err.message);
    return "Error extracting text from PDF.";
  }
}

// Simple root endpoint
app.get("/", (req, res) => {
  res.send("Server is running");
});

// Upload endpoint
app.post("/upload/file", upload.single("file"), (req, res) => {
  if (!req.file || !req.file.mimetype.includes("pdf")) {
    return res
      .status(400)
      .send({ message: "Invalid file type. Only PDFs are allowed." });
  }

  // Rename uploaded file to a standard name
  fs.renameSync(req.file.path, UPLOAD_PATH);
  res.send({ message: "File uploaded successfully!" });
});

// Query endpoint
app.get("/query", async (req, res) => {
  const question = req.query.q;

  if (!fs.existsSync(UPLOAD_PATH)) {
    return res.status(400).send({ message: "No uploaded PDF file found." });
  }

  if (!question) {
    return res.status(400).send({ message: "No query provided." });
  }

  const context = await extractTextFromPDF(UPLOAD_PATH);
  const answer = await askGemini(question, context);
  res.send({ message: answer });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
