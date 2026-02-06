
import React, { useState, useEffect } from 'react';
import { PricingTiers } from './components/PricingTiers';
import { FileUpload } from './components/FileUpload';
import { ParameterInputs } from './components/ParameterInputs';
import { ReportDisplay } from './components/ReportDisplay';
import { TestimonialPopup } from './components/TestimonialPopup';
import { SharedReportView } from './components/SharedReportView';

export type Tier = 'scan' | 'monitoring' | 'bonus' | '';

export interface AppConfig {
  EMAILJS_PUBLIC_KEY: string;
  EMAILJS_SERVICE_ID: string;
  EMAILJS_TEMPLATE_ID: string;
}

export const App = () => {
  const [tier, setTier] = useState<Tier>('');
  const [files, setFiles] = useState<File[]>([]);
  const [provider, setProvider] = useState('');
  const [budget, setBudget] = useState('');
  const [services, setServices] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<string | null>(null);

  const [showTestimonial, setShowTestimonial] = useState(false);
  const [appConfig, setAppConfig] = useState<AppConfig | null>(null);

  // State for handling shared report view
  const [view, setView] = useState<'main' | 'shared' | 'loading' | 'error'>('loading');
  const [sharedReportContent, setSharedReportContent] = useState('');
  const [sharedError, setSharedError] = useState('');


  useEffect(() => {
    // --- Routing Logic ---
    const path = window.location.pathname;
    const match = path.match(/^\/report\/([a-zA-Z0-9]+)$/);

    if (match) {
      const reportId = match[1];
      const fetchSharedReport = async () => {
        try {
          const response = await fetch(`/api/report/${reportId}`);
          if (!response.ok) {
            const result = await response.json();
            throw new Error(result.error || 'Failed to load shared report.');
          }
          const result = await response.json();
          setSharedReportContent(result.reportContent);
          setView('shared');
        } catch (err) {
          setSharedError(err instanceof Error ? err.message : 'An unknown error occurred.');
          setView('error');
        }
      };
      fetchSharedReport();
    } else {
      // --- Main App Logic ---
      const timer = setTimeout(() => setShowTestimonial(true), 10000);
    
      const fetchConfig = async () => {
        try {
          const response = await fetch('/api/config');
          if (!response.ok) {
            const statusText = response.statusText || 'An unknown server error occurred';
            throw new Error(`Configuration Error (${response.status}): ${statusText}. The app may not function correctly.`);
          }
          const config = await response.json();
          setAppConfig(config);
        } catch (err) {
          if (err instanceof TypeError) {
            setError('Network Error: Could not connect to the server to load app configuration. Please check your connection.');
          } else if (err instanceof Error) {
            setError(err.message);
          } else {
            setError('An unknown error occurred while loading configuration.');
          }
        } finally {
          setView('main');
        }
      };
      
      fetchConfig();
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tier || files.length === 0 || !provider || !budget || !services) {
      setError('Please fill out all fields and upload at least one file.');
      return;
    }

    setIsLoading(true);
    setError(null);

    const fileDescriptors = files.map(f => ({ name: f.name, size: f.size, lastModified: f.lastModified }));
    const cacheKey = JSON.stringify({ tier, provider, budget, services, files: fileDescriptors });
    const cachedReport = sessionStorage.getItem(cacheKey);

    if (cachedReport) {
      console.log("Serving report from cache.");
      setTimeout(() => {
        setReport(JSON.parse(cachedReport));
        setIsLoading(false);
      }, 500);
      return;
    }

    const formData = new FormData();
    formData.append('tier', tier);
    formData.append('provider', provider);
    formData.append('budget', budget);
    formData.append('services', services);
    files.forEach(file => {
      formData.append('billingFile[]', file);
    });

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorResult = await response.json().catch(() => ({
            error: `Request failed with status: ${response.status} ${response.statusText}. The server response was not valid JSON.`,
        }));
        
        console.error('API Error Response:', {
            status: response.status,
            statusText: response.statusText,
            body: errorResult,
        });

        if (response.status >= 500) {
            setError("We're experiencing technical difficulties on our end. Please try again later.");
        } else if (response.status === 400) {
            setError(`Invalid request: ${errorResult.error || 'Please check your inputs.'}`);
        } else {
            setError(errorResult.error || 'An unexpected error occurred.');
        }
        return; 
      }

      const result = await response.json();

      if (result.report) {
        sessionStorage.setItem(cacheKey, JSON.stringify(result.report));
        setReport(result.report);
      } else {
        const errorMessage = 'Analysis complete, but the AI did not return a report. This can happen with unsupported file formats or vague inputs. Please try again.';
        console.error(errorMessage, "Server response:", result);
        setError(errorMessage);
      }
    } catch (err) {
      console.error('Network or other fetch error:', err);
      if (err instanceof TypeError) {
        setError('Unable to connect to the server. Please check your internet connection.');
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setTier('');
    setFiles([]);
    setProvider('');
    setBudget('');
    setServices('');
    setReport(null);
    setError(null);
    setIsLoading(false);
  };

  const handleRerun = () => {
    setReport(null);
    setError(null);
    setIsLoading(false);
  };

  if (view === 'loading') {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
            <svg className="animate-spin h-10 w-10 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
        </div>
    );
  }
  
  if (view === 'shared') {
    return <SharedReportView reportContent={sharedReportContent} />;
  }

  if (view === 'error') {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center text-center p-4">
            <h1 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">Could Not Load Report</h1>
            <p className="text-gray-700 dark:text-gray-300 mb-6">{sharedError}</p>
            <a href="/" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">Go to Main Application</a>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 font-sans flex flex-col items-center p-4 sm:p-6 lg:p-8 transition-colors duration-300 fade-in">
      <div className="w-full max-w-4xl mx-auto flex flex-col flex-grow relative">
        <header className="text-center mb-6 sm:mb-8">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-teal-500 dark:from-blue-400 dark:to-teal-300">
            OptimaCloud Anomaly Assistant
          </h1>
          <p className="mt-2 text-base sm:text-lg text-gray-600 dark:text-gray-400">
            Upload your cloud billing document to detect cost leaks.
          </p>
          <p className="mt-4 text-xs sm:text-sm text-yellow-800 dark:text-yellow-300 bg-yellow-100/80 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700/50 rounded-full px-3 py-1 inline-flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 1.944A11.954 11.954 0 012.166 5.026a12.005 12.005 0 01-1.422 6.075c-.345.816-.45 1.705-.45 2.599v1.003c0 .606.246 1.178.653 1.585a2.235 2.235 0 001.582.653h14.938c.606 0 1.178-.246 1.585-.653a2.235 2.235 0 00.653-1.585v-1.003c0-.894-.105-1.783-.45-2.599a12.005 12.005 0 01-1.422-6.075A11.954 11.954 0 0110 1.944zM8 10a2 2 0 114 0v3a2 2 0 11-4 0v-3z" clipRule="evenodd" /></svg>
            <span className="font-semibold">Privacy First:</span> Your data is never saved or stored.
          </p>
        </header>
        
        <main className="bg-white dark:bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-2xl p-4 sm:p-8 border border-gray-200 dark:border-gray-700 flex-grow">
          {report ? (
            <ReportDisplay reportContent={report} onReset={handleReset} onRerun={handleRerun} config={appConfig} />
          ) : (
            <form onSubmit={handleAnalyze} className="space-y-6 sm:space-y-8">
              {error && <div className="p-4 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-500/50 text-red-700 dark:text-red-300 rounded-lg text-center">{error}</div>}
              <div>
                <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Step 1: Choose Your Plan</h2>
                <PricingTiers selectedTier={tier} onSelectTier={setTier} />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Step 2: Upload Billing Document</h2>
                <FileUpload files={files} onSetFiles={setFiles} />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Step 3: Provide Context & Analyze</h2>
                <ParameterInputs
                  provider={provider} setProvider={setProvider}
                  budget={budget} setBudget={setBudget}
                  services={services} setServices={setServices}
                  isLoading={isLoading}
                />
              </div>
            </form>
          )}
        </main>
        
        <footer className="text-center mt-8 py-4 border-t border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-500 text-sm">
          <p className="mb-2">Automated Anomaly Detection to Safeguard Your Cloud Spend.</p>
          <div className="flex justify-center sm:justify-between items-center flex-col sm:flex-row gap-2">
            <p>&copy; {new Date().getFullYear()} OptimaCloud. All Rights Reserved.</p>
            <div className="flex gap-4">
              <a href="#" className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors">Privacy Policy</a>
            </div>
          </div>
        </footer>
      </div>
      {showTestimonial && <TestimonialPopup onClose={() => setShowTestimonial(false)} />}
    </div>
  );
};