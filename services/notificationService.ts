// services/notificationService.ts

// This tells TypeScript that the 'emailjs' global variable exists,
// which is loaded from the script tag in index.html.
declare const emailjs: any;

// --- IMPORTANT SETUP INSTRUCTIONS ---
// 1. Create a free account at https://www.emailjs.com
// 2. Add an email service (e.g., Gmail, Outlook). You'll get a SERVICE_ID.
// 3. Create two email templates:
//    - An "Admin Notification" template. You'll get an ADMIN_TEMPLATE_ID.
//    - A "User Report" template. You'll get a USER_TEMPLATE_ID.
// 4. Find your Public Key in your account settings.
// 5. Replace the placeholder values below with your actual credentials from EmailJS.

// FIX: Corrected credentials to resolve 404 error. The previous values were likely incorrect.
const EMAILJS_SERVICE_ID: string = 'service_kjy0pmn';
const EMAILJS_ADMIN_TEMPLATE_ID: string = 'template_wuph95v';
const EMAILJS_USER_TEMPLATE_ID: string = 'template_k3o5q1i'; // Please verify this value in your EmailJS account.
const EMAILJS_PUBLIC_KEY: string = 'p4HsHHiUqEWF2eGb2';

const ADMIN_EMAIL: string = 'trainingcenteradept@gmail.com';

// FIX: Corrected the configuration check to be more robust.
const isConfigured = 
    EMAILJS_SERVICE_ID && !EMAILJS_SERVICE_ID.includes('YOUR_') &&
    EMAILJS_ADMIN_TEMPLATE_ID && !EMAILJS_ADMIN_TEMPLATE_ID.includes('YOUR_') &&
    EMAILJS_USER_TEMPLATE_ID && !EMAILJS_USER_TEMPLATE_ID.includes('YOUR_') &&
    EMAILJS_PUBLIC_KEY && !EMAILJS_PUBLIC_KEY.includes('YOUR_');

/**
 * Checks if the EmailJS service has been configured with credentials.
 * @returns {boolean} True if configured, false otherwise.
 */
export const isEmailServiceConfigured = (): boolean => isConfigured;

interface NotificationDetails {
  tierName: string;
  fileName: string;
  cloudProvider: string;
}

/**
 * Sends an email notification to the admin using EmailJS.
 * This function includes detailed error logging for production environments.
 */
export const sendAdminNotification = async (details: NotificationDetails): Promise<void> => {
  // FIX: Added check to ensure EmailJS script is loaded before use.
  if (typeof emailjs === 'undefined') {
    console.error('EmailJS script not loaded. Cannot send admin notification.');
    return;
  }
  
  if (!isConfigured) {
    console.warn("EmailJS is not fully configured. Skipping admin notification. Please update services/notificationService.ts");
    return;
  }
  
  const templateParams = {
    to_email: ADMIN_EMAIL,
    tier_name: details.tierName,
    file_name: details.fileName,
    cloud_provider: details.cloudProvider,
    timestamp: new Date().toISOString(),
  };

  try {
    // FIX: Corrected to use defined constants and modern EmailJS init method.
    emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
    await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_ADMIN_TEMPLATE_ID, templateParams);
    console.log('Admin notification email sent successfully!');
  } catch (error: any) {
    // FIX: Implemented more robust, structured error logging for easier debugging.
    console.error('Failed to send admin notification email. Details:', {
      serviceId: EMAILJS_SERVICE_ID,
      templateId: EMAILJS_ADMIN_TEMPLATE_ID,
      params: templateParams,
      errorDetails: {
        status: error?.status,
        text: error?.text,
        message: error?.message,
      },
      originalError: error,
    });
    // In a production app, this structured log would be sent to a monitoring service.
  }
};

interface ReportNotificationDetails {
  userEmail: string;
  reportContent: string;
}

/**
 * Sends the analysis report to the user's email using EmailJS.
 * This function includes robust error handling to provide better feedback for debugging.
 */
export const sendReportToUser = async (details: ReportNotificationDetails): Promise<void> => {
  // FIX: Added check to ensure EmailJS script is loaded before use.
  if (typeof emailjs === 'undefined') {
    console.error('EmailJS script not loaded. Cannot send user report.');
    throw new Error("Email service script failed to load. Please try again later.");
  }

  if (!isConfigured) {
      console.error("EmailJS is not configured. Cannot send user report. Please update services/notificationService.ts");
      // Provide a clear error message to the calling component.
      throw new Error("Email service is not configured on the server.");
  }
  
  const templateParams = {
    to_email: details.userEmail,
    report_content: details.reportContent,
  };

  try {
    // FIX: Updated to use the modern EmailJS v4 SDK initialization method.
    emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });
    await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_USER_TEMPLATE_ID, templateParams);
    console.log('User report email sent successfully!');
  } catch (error: any) {
    // FIX: Implemented more robust, structured error logging for easier debugging.
    console.error('Failed to send user report email. Details:', {
      serviceId: EMAILJS_SERVICE_ID,
      templateId: EMAILJS_USER_TEMPLATE_ID,
      user_email: '[REDACTED]', // Redact PII from logs
      errorDetails: {
        status: error?.status,
        text: error?.text,
        message: error?.message,
      },
      originalError: error,
    });

    // Create and throw a more descriptive error for the calling component to handle.
    let descriptiveError = 'An unexpected error occurred while sending the report.';
    if (error && typeof error.status === 'number') {
        descriptiveError = `The email service returned an error (Status: ${error.status}). Please check your EmailJS configuration. Message: ${error.text || 'No details provided.'}`;
    }
    
    throw new Error(descriptiveError);
  }
};
