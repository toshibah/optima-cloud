
import 'dotenv/config';
import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import crypto from 'crypto';

// --- ES Module equivalent of __dirname for robust pathing ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

// --- In-memory store for shared reports ---
const reportsStore = {};

// --- 1. CONFIGURATION & SETUP ---
const apiKey = process.env.API_KEY;
if (!apiKey) {
  console.error('API_KEY is not configured in environment variables.');
  process.exit(1);
}
const ai = new GoogleGenAI({ apiKey });

// Read master prompt ONCE at startup for efficiency and reliability
const masterPromptPath = path.join(__dirname, 'services', 'master_prompt.txt');
let masterPrompt;
try {
  masterPrompt = fs.readFileSync(masterPromptPath, 'utf-8');
} catch (e) {
  console.error(`FATAL: Could not read master prompt file at ${masterPromptPath}. Shutting down.`, e);
  process.exit(1);
}


const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// --- Middleware ---
app.use(express.static(__dirname));
app.use(express.json()); // <-- Add this to parse JSON bodies

// --- 2. API ENDPOINTS ---

// Endpoint to provide public config to the frontend
app.get('/server-api/config', (req, res) => {
  res.json({
    EMAILJS_PUBLIC_KEY: process.env.EMAILJS_PUBLIC_KEY || '',
    EMAILJS_SERVICE_ID: process.env.EMAILJS_SERVICE_ID || '',
    EMAILJS_TEMPLATE_ID: process.env.EMAILJS_TEMPLATE_ID || '',
  });
});

// Endpoint to store a report and generate a shareable ID
app.post('/server-api/share', (req, res) => {
  const { reportContent } = req.body;
  if (!reportContent) {
    return res.status(400).json({ error: 'Report content is required.' });
  }

  const id = crypto.randomBytes(8).toString('hex');
  reportsStore[id] = reportContent;

  // Optional: Clean up old reports after some time to prevent memory leaks
  setTimeout(() => {
    delete reportsStore[id];
  }, 1000 * 60 * 60 * 24); // 24 hours

  res.json({ id });
});

// Endpoint to retrieve a shared report
app.get('/server-api/report/:id', (req, res) => {
  const { id } = req.params;
  const reportContent = reportsStore[id];

  if (reportContent) {
    res.json({ reportContent });
  } else {
    res.status(404).json({ error: 'Report not found or has expired.' });
  }
});


// Main endpoint to process billing data and call Gemini
app.post('/server-api/analyze', upload.array('billingFile[]'), async (req, res) => {
  const { provider, budget, services, tier } = req.body;
  const files = req.files;

  if (!provider || !budget || !services || !tier || !files || files.length === 0) {
    return res.status(400).json({ error: 'All fields and a file upload are required.' });
  }

  try {
    const textPrompt = `Client-defined parameters:\n- Cloud provider(s): ${provider}\n- Expected monthly budget range: ${budget}\n- Core services in use: ${services}\n\nPlease analyze the provided billing document(s) and generate the report strictly following the OUTPUT FORMAT specified in your system role.`;
    const parts = [{ text: textPrompt }];
    let combinedCsvContent = "";

    for (const file of files) {
      const mimeType = file.mimetype;
      if (mimeType === 'text/plain' || mimeType === 'text/csv') {
        combinedCsvContent += file.buffer.toString('utf-8') + "\n\n";
      } else if (['image/jpeg', 'image/png', 'application/pdf'].includes(mimeType)) {
        parts.push({
          inlineData: {
            mimeType,
            data: file.buffer.toString('base64'),
          },
        });
      }
    }

    if (combinedCsvContent) {
      parts.unshift({ text: "---INPUTS RECEIVED:\nBilling Data (CSV Content):\n```csv\n" + combinedCsvContent + "\n```\n" });
    }

    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: [{ role: 'user', parts }],
        config: {
            systemInstruction: masterPrompt,
            responseMimeType: 'text/plain',
        },
    });
    
    const report = response.text;
    if (report) {
      res.json({ report });
    } else {
      res.status(500).json({ error: 'Could not extract a valid report from the AI response.' });
    }

  } catch (error) {
    console.error('Error calling Gemini API:', error);
    res.status(500).json({ error: `AI API Error: ${error.message}` });
  }
});

// Fallback to serve index.html for any other GET request.
// This MUST be the last GET route.
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});


app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});