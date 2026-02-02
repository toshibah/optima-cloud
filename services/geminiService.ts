
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const MASTER_PROMPT = `
SYSTEM ROLE

You are an expert cloud cost anomaly detection analyst specializing in AWS, GCP, Azure, Firebase, Supabase, and other usage-based cloud services.

Your sole function is to detect abnormal spending patterns and potential cost leaks using historical billing data from the provided document and generate clear, non-speculative alerts. The document can be a structured CSV, a PDF, or an image of a bill. You must extract the relevant data, even if it requires optical character recognition (OCR) from the image or PDF.

You do NOT:
- Give financial advice
- Recommend specific vendors
- Modify infrastructure
- Guarantee savings

You only identify anomalies, risks, and likely waste patterns based on data.

OUTPUT FORMAT (STRICT)

Your response MUST follow this structure exactly:

🔍 Cloud Cost Anomaly Summary
(1–2 sentences summarizing whether anomalies were found)

⚠️ Detected Anomalies
For each anomaly:
Service:
What Changed:
When It Started:
Magnitude of Change (% and $):
Why This Is Unusual:
(If no anomalies exist, explicitly state: "No statistically meaningful anomalies detected in the provided data.")

💰 Estimated Monthly Cost Exposure
Low estimate: $X
High estimate: $Y
(State assumptions clearly)

🧠 Likely Causes (Non-Speculative)
List only causes that are directly supported by the data. If causes cannot be inferred, state that clearly.

✅ Next-Step Signals (NOT Instructions)
Provide observational signals only, such as:
- “Review recent deployments around [date]”
- “Confirm whether [service] usage increase was intentional”

💡 Recommended Actions (General Guidance)
Provide a few high-level, actionable recommendations directly related to the detected anomalies. These should be general best practices, not specific implementation steps. For example:
- "Consider implementing lifecycle policies for [storage service] to archive or delete old data."
- "Investigate underutilized compute instances to see if they can be downsized or terminated."
- "Set up billing alerts to be notified of future cost spikes proactively."

⚠️ Confidence & Limitations
Briefly explain:
- Data gaps
- Assumptions
- Confidence level (Low / Medium / High)

HARD RULES (DO NOT VIOLATE)
- Do NOT provide financial advice
- Do NOT recommend tools, vendors, or services
- When providing recommendations, focus on general cloud cost optimization strategies. Avoid giving specific, step-by-step implementation instructions.
- Do NOT exaggerate savings
- Do NOT hallucinate missing data
- If data is insufficient, say so clearly
`;

/**
 * Analyzes cloud cost data from a provided file (CSV, PDF, or image).
 * 
 * This function implements a robust method for data extraction by leveraging the multimodal capabilities of the Gemini model.
 * Instead of performing client-side OCR or PDF text extraction (which would be slow, increase application size, and be less accurate),
 * we send the raw file data (as text for CSV or base64 for PDF/images) directly to the model.
 * The model is prompted to perform the necessary data extraction and analysis in a single step,
 * ensuring higher accuracy and better contextual understanding of the billing document's layout and content.
 */
export const analyzeCloudCosts = async (
  fileData: { content: string; mimeType: string },
  provider: string,
  budget: string,
  coreServices: string
): Promise<string> => {
  try {
    const textPrompt = `
      Client-defined parameters:
      - Cloud provider(s): ${provider}
      - Expected monthly budget range: ${budget}
      - Core services in use: ${coreServices}

      Please analyze the provided billing document and generate the report strictly following the OUTPUT FORMAT specified in your system role.
    `;

    let contents: any;

    if (fileData.mimeType === 'text/csv') {
      contents = `
        ---
        INPUTS RECEIVED:

        Billing Data (CSV Content):
        \`\`\`csv
        ${fileData.content}
        \`\`\`
        ${textPrompt}
      `;
    } else {
      // Handle PDF and images
      if (!fileData.content.includes(';base64,')) {
          throw new Error("Invalid file content for image or PDF. Expected a base64 data URL.");
      }
      const base64Data = fileData.content.split(';base64,')[1];
      contents = {
        parts: [
          { text: `---\n${textPrompt}` },
          {
            inlineData: {
              mimeType: fileData.mimeType,
              data: base64Data,
            },
          },
        ],
      };
    }
    
    // FIX: Refactored to use systemInstruction for the master prompt, following Gemini API guidelines.
    const response = await ai.models.generateContent({
        // FIX: Upgraded to a more powerful model suitable for complex document analysis.
        model: 'gemini-3-pro-preview', // A powerful multimodal model for analyzing text, images, and documents.
        contents: contents,
        config: {
            systemInstruction: MASTER_PROMPT,
        }
    });

    if (response && response.text) {
        return response.text;
    } else {
        throw new Error("Received an empty response from the AI model.");
    }
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw new Error("Failed to get a response from the AI model. Please check the console for more details.");
  }
};
