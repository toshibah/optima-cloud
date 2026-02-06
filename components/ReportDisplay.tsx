
import React, { useState, useEffect } from 'react';
import type { AppConfig } from '../App';

declare const marked: any; // Using CDN, so declare it globally
declare const html2canvas: any;
declare const jspdf: any;
declare const emailjs: any;

interface ReportDisplayProps {
  reportContent: string;
  onReset: () => void;
  onRerun: () => void;
  config: AppConfig | null;
}

export const ReportDisplay: React.FC<ReportDisplayProps> = ({ reportContent, onReset, onRerun, config }) => {
  const [email, setEmail] = useState('');
  const [emailStatus, setEmailStatus] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [shareState, setShareState] = useState({ loading: false, url: '', error: '', copied: false });


  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      alert('Please enter an email address.');
      return;
    }

    if (!config?.EMAILJS_PUBLIC_KEY || !config?.EMAILJS_SERVICE_ID || !config?.EMAILJS_TEMPLATE_ID) {
        setEmailStatus({ message: 'Email service is not configured. Please contact support.', type: 'error' });
        console.error('EmailJS config is missing from props.');
        return;
    }
    
    setIsSendingEmail(true);
    setEmailStatus({ message: 'Sending...', type: 'success' });

    const subject = `Cloud Cost Anomaly Report - ${new Date().toLocaleDateString()}`;

    // IMPORTANT: Make sure your EmailJS template is configured to use the `subject` variable.
    // For example, your template's subject line should be `{{subject}}`.
    emailjs.init({ publicKey: config.EMAILJS_PUBLIC_KEY });
    emailjs.send(config.EMAILJS_SERVICE_ID, config.EMAILJS_TEMPLATE_ID, {
      to_email: email,
      report_content: reportContent,
      subject: subject,
    }).then(() => {
      setEmailStatus({ message: `Report sent to ${email}.`, type: 'success' });
    }, (error: any) => {
      setEmailStatus({ message: 'Failed to send email. Please try again.', type: 'error' });
      console.error('EmailJS error:', error);
    }).finally(() => {
      setIsSendingEmail(false);
    });
  };

  const handleShare = async () => {
    setShareState({ loading: true, url: '', error: '', copied: false });
    try {
      const response = await fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportContent }),
      });
      if (!response.ok) {
        throw new Error('Failed to generate share link.');
      }
      const data = await response.json();
      const shareUrl = `${window.location.origin}/report/${data.id}`;
      setShareState({ loading: false, url: shareUrl, error: '', copied: false });
    } catch (err) {
      setShareState({ loading: false, url: '', error: 'Could not create share link. Please try again.', copied: false });
    }
  };

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(shareState.url).then(() => {
      setShareState(prev => ({ ...prev, copied: true }));
      setTimeout(() => setShareState(prev => ({ ...prev, copied: false })), 2000); // Reset after 2 seconds
    });
  };

  const downloadPdf = () => {
    const btn = document.getElementById('pdf-button');
    if (btn) btn.textContent = 'Generating PDF...';

    const reportElement = document.getElementById('report-content');
    if (!reportElement) return;

    const { jsPDF } = jspdf;
    
    html2canvas(reportElement, { scale: 2, backgroundColor: document.documentElement.classList.contains('dark') ? '#1a202c' : '#ffffff' }).then((canvas: HTMLCanvasElement) => {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const imgHeight = canvas.height * pdfWidth / canvas.width;
      
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
      heightLeft -= pdf.internal.pageSize.getHeight();

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
        heightLeft -= pdf.internal.pageSize.getHeight();
      }
      
      pdf.save('cloud-cost-anomaly-report.pdf');
      if (btn) btn.textContent = 'Download PDF';
    });
  };

  const renderedHtml = { __html: marked.parse(reportContent) };

  return (
    <div className="fade-in">
      <div className="no-print flex flex-col sm:flex-row justify-between items-stretch sm:items-center mb-6 gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-center sm:text-left text-gray-900 dark:text-gray-100">Analysis Report</h1>
        <form onSubmit={handleEmailSubmit} className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" required className="w-full bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md py-2 px-3 text-gray-900 dark:text-gray-200 focus:ring-blue-500 focus:border-blue-500" />
          <button type="submit" disabled={isSendingEmail} className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-opacity disabled:opacity-70 disabled:cursor-wait">
            {isSendingEmail ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Sending...
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" /><path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" /></svg>
                  Email Report
                </>
            )}
          </button>
        </form>
      </div>
      <div className="no-print h-6 mb-4 text-center">
        {emailStatus && <p className={emailStatus.type === 'success' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>{emailStatus.message}</p>}
      </div>

      <div id="report-content" className="prose dark:prose-invert max-w-none p-4 sm:p-6 bg-gray-50 dark:bg-gray-800 rounded-lg border dark:border-gray-700" dangerouslySetInnerHTML={renderedHtml} />

      <div className="no-print mt-8 text-center flex flex-col sm:flex-row justify-center items-center gap-4 flex-wrap">
        <button onClick={handleShare} disabled={shareState.loading || !!shareState.url} className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-800 text-white dark:bg-gray-600 dark:hover:bg-gray-700 font-bold py-3 sm:py-2 px-6 rounded-lg disabled:opacity-50">
            {shareState.loading ? 'Generating Link...' : 'Share Report'}
        </button>
        <button onClick={downloadPdf} id="pdf-button" className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-800 text-white dark:bg-gray-600 dark:hover:bg-gray-700 font-bold py-3 sm:py-2 px-6 rounded-lg">Download PDF</button>
        <button onClick={onRerun} className="w-full sm:w-auto bg-gray-700 hover:bg-gray-800 text-white dark:bg-gray-600 dark:hover:bg-gray-700 font-bold py-3 sm:py-2 px-6 rounded-lg">Analyze New Bill</button>
        <button onClick={onReset} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 sm:py-2 px-6 rounded-lg">Start Fresh</button>
      </div>

      {shareState.url && (
        <div className="no-print mt-4 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center gap-4 w-full max-w-2xl mx-auto">
          <input type="text" readOnly value={shareState.url} className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md py-1 px-2 text-sm" />
          <button onClick={handleCopyToClipboard} className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm py-1 px-3 rounded-lg w-28 text-center">
            {shareState.copied ? 'Copied!' : 'Copy Link'}
          </button>
        </div>
      )}
       {shareState.error && <p className="no-print mt-2 text-center text-red-600 dark:text-red-400">{shareState.error}</p>}
    </div>
  );
};