
import React, { useState } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { sendReportToUser, isEmailServiceConfigured } from '../services/notificationService';

interface ReportDisplayProps {
  report: string;
  onReset: () => void;
  onRerun: () => void;
}

const ReportSection: React.FC<{ title: string; icon: string; children: React.ReactNode }> = ({ title, icon, children }) => (
    <div className="bg-gray-100 dark:bg-gray-800 p-4 sm:p-6 rounded-lg border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl sm:text-2xl font-bold flex items-center mb-4 text-gray-900 dark:text-gray-100">
            <span className="mr-3 text-xl sm:text-2xl">{icon}</span>
            {title}
        </h2>
        <div className="prose dark:prose-invert prose-p:text-gray-600 dark:prose-p:text-gray-300 prose-li:text-gray-600 dark:prose-li:text-gray-300 prose-strong:text-black dark:prose-strong:text-white max-w-none text-sm sm:text-base">
            {children}
        </div>
    </div>
);

const parseReport = (reportText: string) => {
    const sections: { [key: string]: string } = {};
    const lines = reportText.split('\n');
    let currentSection = '';
    
    lines.forEach(line => {
        const trimmedLine = line.trim();
        if (trimmedLine.startsWith('🔍') || trimmedLine.startsWith('⚠️ Detected Anomalies') || trimmedLine.startsWith('💰') || trimmedLine.startsWith('🧠') || trimmedLine.startsWith('✅') || trimmedLine.startsWith('💡') || trimmedLine.startsWith('⚠️ Confidence & Limitations')) {
            if (trimmedLine.startsWith('🔍')) currentSection = 'summary';
            else if (trimmedLine.startsWith('⚠️ Detected Anomalies')) currentSection = 'anomalies';
            else if (trimmedLine.startsWith('💰')) currentSection = 'exposure';
            else if (trimmedLine.startsWith('🧠')) currentSection = 'causes';
            else if (trimmedLine.startsWith('✅')) currentSection = 'signals';
            else if (trimmedLine.startsWith('💡')) currentSection = 'recommendations';
            else if (trimmedLine.startsWith('⚠️ Confidence & Limitations')) currentSection = 'limitations';
            sections[currentSection] = line + '\n';
        } else if (currentSection) {
            sections[currentSection] += line + '\n';
        }
    });

    return sections;
};

// A more robust markdown-to-JSX converter
const renderMarkdown = (text: string): React.ReactNode => {
    if (!text) return null;

    const elements: React.ReactNode[] = [];
    const lines = text.split('\n');
    let i = 0;

    const processInline = (line: string) => {
        // Regex to split by **bold** or *italic* while keeping the delimiters
        const parts = line.split(/(\*\*.*?\*\*|\*.*?\*)/g);
        return parts.filter(part => part).map((part, index) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={index}>{part.slice(2, -2)}</strong>;
            }
            if (part.startsWith('*') && part.endsWith('*')) {
                return <em key={index}>{part.slice(1, -1)}</em>;
            }
            return part;
        });
    };

    while (i < lines.length) {
        const line = lines[i];

        // Group list items into a <ul>
        if (line.trim().startsWith('* ')) {
            const listItems = [];
            while (i < lines.length && lines[i].trim().startsWith('* ')) {
                const itemContent = lines[i].trim().substring(2);
                listItems.push(<li key={`li-${i}`}>{processInline(itemContent)}</li>);
                i++;
            }
            // The parent `prose` class will style this list correctly.
            elements.push(<ul key={`ul-${elements.length}`} className="list-disc list-inside">{listItems}</ul>);
            continue;
        }

        // Handle key-value pairs
        const keyValueMatch = line.match(/^(Service:|What Changed:|When It Started:|Magnitude of Change:|Why This Is Unusual:|Low estimate:|High estimate:)/);
        if (keyValueMatch) {
            const [key, ...valueParts] = line.split(':');
            const value = valueParts.join(':').trim();
            elements.push(
                <p key={`p-${i}`}>
                    <strong className="text-gray-800 dark:text-gray-100">{key}:</strong> {processInline(value)}
                </p>
            );
            i++;
            continue;
        }
        
        // Skip empty lines, which act as separators
        if (line.trim() === '') {
            i++;
            continue;
        }
        
        // The AI sometimes returns the section title again inside the text. Let's hide it.
        if (line.match(/^(🔍|⚠️|💰|🧠|✅|💡)/)) {
          i++;
          continue;
        }

        // Default to paragraph for any other line
        elements.push(<p key={`p-${i}`}>{processInline(line)}</p>);
        i++;
    }

    return elements;
};


export const ReportDisplay: React.FC<ReportDisplayProps> = ({ report, onReset, onRerun }) => {
    const sections = parseReport(report);
    const [userEmail, setUserEmail] = useState('');
    const [emailStatus, setEmailStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
    const [emailError, setEmailError] = useState(''); // For submission errors
    const [emailValidationError, setEmailValidationError] = useState(''); // For real-time validation
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const emailConfigured = isEmailServiceConfigured();

    const validateEmail = (email: string): string => {
        if (!email) return '';

        const atIndex = email.indexOf('@');
        if (atIndex === -1) return "Email must include an '@' symbol.";
        if (atIndex === 0) return "Please enter the part before the '@'.";

        if (email.split('@').length - 1 > 1) return "Email can only contain one '@' symbol.";

        const [localPart, domainPart] = email.split('@');
        if (!domainPart) return "Please enter the part after the '@'.";
        if (!domainPart.includes('.')) return "The domain is missing a '.' (e.g., example.com).";
        if (domainPart.startsWith('.') || domainPart.endsWith('.')) return "The domain cannot start or end with a dot.";
        if (domainPart.includes('..')) return "The domain cannot have consecutive dots.";

        const tld = domainPart.split('.').pop();
        if (!tld || tld.length < 2) return "The top-level domain (e.g., .com) must be at least two characters.";

        const emailRegex = /^[a-zA-Z0-9!#$%&'*+/=?^_`{|}~.-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!emailRegex.test(email)) return "The email contains invalid characters.";

        return ''; // All checks passed
    };

    const handleSendEmail = async (e: React.FormEvent) => {
        e.preventDefault();
        setEmailError(''); // Clear previous submission error

        const validationMsg = validateEmail(userEmail);
        if (!userEmail || validationMsg) {
            setEmailValidationError(validationMsg || 'An email address is required.');
            return; // Stop submission
        }
        setEmailValidationError(''); // Clear validation error if submission proceeds

        setEmailStatus('sending');
        try {
            await sendReportToUser({ userEmail, reportContent: report });
            setEmailStatus('sent');
        } catch (error) {
            console.error('Error sending report email:', error);
            setEmailError('Failed to send the report. Please try again later.');
            setEmailStatus('error');
            setTimeout(() => {
                if (emailStatus === 'error') {
                   setEmailStatus('idle');
                   setEmailError('');
                }
            }, 4000);
        }
    };

    const handleDownload = () => {
      const blob = new Blob([report], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'cloud-cost-anomaly-report.md';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    };

    const handleDownloadPdf = async () => {
        const reportElement = document.getElementById('report-content');
        if (!reportElement) {
            console.error('Report content element not found!');
            return;
        }

        setIsGeneratingPdf(true);
        
        // Determine background color from the current theme for consistency
        const isDarkMode = document.documentElement.classList.contains('dark');
        const pdfBackgroundColor = isDarkMode ? '#1f2937' : '#ffffff'; // gray-800 or white

        try {
            const canvas = await html2canvas(reportElement, {
                scale: 2, // Higher resolution for better quality
                backgroundColor: pdfBackgroundColor,
            });
            
            const imgData = canvas.toDataURL('image/png');
            
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4',
            });

            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const imgProps = pdf.getImageProperties(imgData);
            const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;

            let heightLeft = imgHeight;
            let position = 0;

            pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
            heightLeft -= pdfHeight;

            while (heightLeft > 0) {
                position = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
                heightLeft -= pdfHeight;
            }
            
            pdf.save('cloud-cost-anomaly-report.pdf');

        } catch (error) {
            console.error("Error generating PDF:", error);
        } finally {
            setIsGeneratingPdf(false);
        }
    };

    return (
        <div>
            <div className="no-print flex flex-col sm:flex-row justify-between items-stretch sm:items-center mb-6 gap-4">
                <h1 className="text-2xl sm:text-3xl font-bold text-center sm:text-left text-gray-900 dark:text-gray-100">Anomaly Report</h1>
                {emailConfigured ? (
                     <form onSubmit={handleSendEmail} className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                        <div className="w-full sm:w-auto sm:max-w-xs">
                           <input
                                type="email"
                                value={userEmail}
                                onChange={(e) => {
                                    const email = e.target.value;
                                    setUserEmail(email);
                                    setEmailValidationError(validateEmail(email));
                                    if (emailStatus === 'sent' || emailStatus === 'error') {
                                        setEmailStatus('idle');
                                        setEmailError('');
                                    }
                                }}
                                placeholder="your@email.com"
                                aria-label="Your email address to receive the report"
                                aria-invalid={!!emailValidationError}
                                aria-describedby="email-validation-error"
                                className="w-full bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md py-2 px-3 text-gray-900 dark:text-gray-200 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-70 transition-colors"
                                disabled={emailStatus === 'sending' || emailStatus === 'sent'}
                            />
                            {emailValidationError && (
                                <p id="email-validation-error" className="text-xs text-red-600 dark:text-red-400 mt-1 pl-1" role="alert">
                                    {emailValidationError}
                                </p>
                            )}
                        </div>
                        <button 
                            type="submit"
                            disabled={emailStatus === 'sending' || emailStatus === 'sent'}
                            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-300 disabled:opacity-50 disabled:cursor-wait"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                               <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                               <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                            </svg>
                            {emailStatus === 'sending' ? 'Sending...' : emailStatus === 'sent' ? 'Sent!' : emailStatus === 'error' ? 'Retry' : 'Email Report'}
                        </button>
                    </form>
                ) : (
                    <div className="flex items-center gap-2 p-2 bg-yellow-100 dark:bg-yellow-900/40 border border-yellow-300 dark:border-yellow-700 rounded-md text-sm text-yellow-800 dark:text-yellow-200">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 3.001-1.742 3.001H4.42c-1.53 0-2.493-1.667-1.743-3.001l5.58-9.92zM10 13a1 1 0 110-2 1 1 0 010 2zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <span>Email feature not configured. Update <code>services/notificationService.ts</code> to enable.</span>
                    </div>
                )}
            </div>
            
            {emailConfigured && (
              <div className="no-print h-6 mb-4 text-center">
                {emailStatus === 'sent' && <p className="text-sm sm:text-base text-green-600 dark:text-green-400">Report sent to {userEmail}. Please check your inbox.</p>}
                {emailStatus === 'error' && emailError && <p className="text-sm sm:text-base text-red-600 dark:text-red-400">{emailError}</p>}
              </div>
            )}


            <div className="no-print mb-6 p-3 bg-blue-100 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg flex items-center gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600 dark:text-blue-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-blue-800 dark:text-blue-200">
                    <strong>Important:</strong> For your privacy, this report is not saved. Please send a copy to your email or download it for your records.
                </p>
            </div>

            <div id="report-content" className="space-y-6 bg-white dark:bg-gray-900 p-4 sm:p-6">
                {sections.summary && <ReportSection title="Cloud Cost Anomaly Summary" icon="🔍">{renderMarkdown(sections.summary.replace('🔍 Cloud Cost Anomaly Summary', ''))}</ReportSection>}
                {sections.anomalies && <ReportSection title="Detected Anomalies" icon="⚠️">{renderMarkdown(sections.anomalies.replace('⚠️ Detected Anomalies', ''))}</ReportSection>}
                {sections.exposure && <ReportSection title="Estimated Monthly Cost Exposure" icon="💰">{renderMarkdown(sections.exposure.replace('💰 Estimated Monthly Cost Exposure', ''))}</ReportSection>}
                {sections.causes && <ReportSection title="Likely Causes (Non-Speculative)" icon="🧠">{renderMarkdown(sections.causes.replace('🧠 Likely Causes (Non-Speculative)', ''))}</ReportSection>}
                {sections.signals && <ReportSection title="Next-Step Signals" icon="✅">{renderMarkdown(sections.signals.replace('✅ Next-Step Signals (NOT Instructions)', ''))}</ReportSection>}
                {sections.recommendations && <ReportSection title="Recommended Actions (General Guidance)" icon="💡">{renderMarkdown(sections.recommendations.replace('💡 Recommended Actions (General Guidance)', ''))}</ReportSection>}
                {sections.limitations && <ReportSection title="Confidence & Limitations" icon="⚠️">{renderMarkdown(sections.limitations.replace('⚠️ Confidence & Limitations', ''))}</ReportSection>}
                
                <div className="mt-8 text-center p-4 bg-gray-100 dark:bg-gray-800 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                  <p className="text-gray-500 dark:text-gray-400 text-sm">
                    This analysis was generated from a single snapshot. Continuous monitoring can detect cost leaks earlier and reduce exposure.
                  </p>
                  <p className="font-semibold text-blue-600 dark:text-blue-400">
                    Recurring alerts are available.
                  </p>
                </div>
            </div>

            <div className="no-print mt-8 text-center flex flex-col sm:flex-row justify-center items-center gap-4 flex-wrap">
                 <button
                    onClick={handleDownloadPdf}
                    disabled={isGeneratingPdf}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-800 text-white dark:bg-gray-600 dark:hover:bg-gray-700 font-bold py-3 sm:py-2 px-6 rounded-lg transition-colors duration-300 disabled:opacity-50 disabled:cursor-wait"
                >
                    {isGeneratingPdf ? (
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                        </svg>
                    )}
                    {isGeneratingPdf ? 'Generating PDF...' : 'Download as PDF'}
                </button>
                 <button
                    onClick={handleDownload}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-800 text-white dark:bg-gray-600 dark:hover:bg-gray-700 font-bold py-3 sm:py-2 px-6 rounded-lg transition-colors duration-300"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download Markdown (.md)
                </button>
                <button
                    onClick={onRerun}
                    className="w-full sm:w-auto bg-gray-700 hover:bg-gray-800 text-white dark:bg-gray-600 dark:hover:bg-gray-700 font-bold py-3 sm:py-2 px-6 rounded-lg transition-colors duration-300"
                >
                    Analyze New Bill (Same Context)
                </button>
                <button
                    onClick={onReset}
                    className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 sm:py-2 px-6 rounded-lg transition-colors duration-300"
                >
                    Start Fresh Analysis
                </button>
            </div>
        </div>
    );
};
