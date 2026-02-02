
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
 * Analyzes cloud cost data by sending it to a secure server-side PHP proxy.
 *
 * This function no longer calls the Gemini API directly from the client. Instead, it sends the
 * file data and parameters to a PHP script located at `/api/gemini-proxy.php`.
 * This proxy is responsible for securely attaching the API key and communicating with the Gemini API,
 * preventing the API key from being exposed in the browser.
 */
export const analyzeCloudCosts = async (
  fileData: { content: string; mimeType: string },
  provider: string,
  budget: string,
  coreServices: string
): Promise<string> => {
  try {
    const response = await fetch('/api/gemini-proxy.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        masterPrompt: MASTER_PROMPT,
        fileData,
        provider,
        budget,
        coreServices,
      }),
    });

    if (!response.ok) {
        // Attempt to get more detailed error info from the proxy's response
        const errorBody = await response.json().catch(() => ({ error: 'Could not parse error response from server.' }));
        const errorMessage = errorBody?.error?.message || `The server responded with an error: ${response.statusText}`;
        throw new Error(errorMessage);
    }
    
    const result = await response.json();
    
    // The response from the proxy should be the direct response from the Gemini API.
    // We need to extract the text content from the candidates array.
    const text = result?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (text) {
        return text;
    } else {
        console.error("Invalid response structure from proxy:", result);
        throw new Error("Received an unexpected or empty response from the analysis service.");
    }
  } catch (error) {
    console.error("Error calling the backend proxy:", error);
    // Re-throw the error so it can be caught by the UI and displayed to the user.
    throw error;
  }
};
