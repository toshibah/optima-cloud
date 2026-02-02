
import React, { useReducer, useCallback, useEffect, useState, useRef } from 'react';
import { PricingTiers, Tier, tiers } from './components/PricingTiers';
import { FileUpload } from './components/FileUpload';
import { ParameterInputs } from './components/ParameterInputs';
import { ReportDisplay } from './components/ReportDisplay';
import { analyzeCloudCosts } from './services/geminiService';
import { sendAdminNotification } from './services/notificationService';
import { appReducer, initialState } from './state/appReducer';
import { TestimonialPopup } from './components/TestimonialPopup';
import { testimonials } from './data/testimonials';

const ThemeToggle: React.FC<{ theme: 'dark' | 'light'; toggleTheme: () => void }> = ({ theme, toggleTheme }) => (
    <button
        onClick={toggleTheme}
        className="absolute top-4 right-4 p-2 rounded-full bg-gray-200/80 dark:bg-gray-800/80 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
        {theme === 'dark' ? (
            // Sun icon for switching to light mode
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.121-3.536a1 1 0 010 1.414l-.707.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM10 18a1 1 0 01-1-1v-1a1 1 0 112 0v1a1 1 0 01-1 1zM5.05 14.95l-.707-.707a1 1 0 00-1.414 1.414l.707.707a1 1  0 001.414-1.414zM16.364 3.636a1 1 0 010 1.414l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 0zM4.343 4.343a1 1 0 00-1.414 1.414l.707.707a1 1 0 101.414-1.414l-.707-.707z" clipRule="evenodd" />
            </svg>
        ) : (
            // Moon icon for switching to dark mode
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
            </svg>
        )}
    </button>
);


const App: React.FC = () => {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const { status, selectedTier, billingFile, analysisResult, errorMessage, pendingParams, lastAnalysisParams } = state;
  const [loadingMessage, setLoadingMessage] = useState('Starting analysis...');
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [paymentMessage, setPaymentMessage] = useState('');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [isTestimonialVisible, setIsTestimonialVisible] = useState(false);
  const [testimonialIndex, setTestimonialIndex] = useState(0);
  const testimonialTimerRef = useRef<number | null>(null);

  // Effect to load theme from localStorage and set it on the root element
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'dark' | 'light' | null;
    const initialTheme = savedTheme || 'dark';
    setTheme(initialTheme);
    
    const root = window.document.documentElement;
    root.classList.add(initialTheme);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    
    const root = window.document.documentElement;
    root.classList.remove(theme);
    root.classList.add(newTheme);
    localStorage.setItem('theme', newTheme);
  };
  
  // Effect to manage testimonial popups
  useEffect(() => {
    const clearTimer = () => {
        if (testimonialTimerRef.current) {
            clearTimeout(testimonialTimerRef.current);
        }
    };
    
    if (status === 'initial') {
        // Show first testimonial after 10 seconds
        testimonialTimerRef.current = window.setTimeout(() => {
            setIsTestimonialVisible(true);
        }, 10000);
    } else {
        // If status is not initial, hide testimonial and clear timer
        setIsTestimonialVisible(false);
        clearTimer();
    }
    
    return clearTimer; // Cleanup on component unmount or status change
  }, [status]);
  
  const handleCloseTestimonial = () => {
    setIsTestimonialVisible(false);
    // Cycle to the next testimonial
    setTestimonialIndex(prevIndex => (prevIndex + 1) % testimonials.length);
    
    // Clear any existing timer
    if (testimonialTimerRef.current) {
        clearTimeout(testimonialTimerRef.current);
    }
    
    // Set a new timer for the next testimonial to appear after a longer delay
    testimonialTimerRef.current = window.setTimeout(() => {
        if (status === 'initial') { // Double-check status before showing
            setIsTestimonialVisible(true);
        }
    }, 60000); // 60 seconds delay for subsequent popups
  };


  const startAnalysis = useCallback(async () => {
     if (!billingFile || billingFile.length === 0 || !selectedTier || !pendingParams) {
      dispatch({ type: 'SET_ERROR', payload: 'Missing required information for analysis. Please start over.' });
      return;
    }
    
    dispatch({ type: 'START_ANALYSIS' });

    // Trigger admin notification
    const tierDetails = tiers.find(t => t.id === selectedTier);
    if (tierDetails) {
      sendAdminNotification({
        tierName: tierDetails.name,
        fileName: billingFile.map(f => f.name).join(', '),
        cloudProvider: pendingParams.provider,
      });
    }

    try {
      // Multi-file handling for CSVs
      if (billingFile.length > 1) {
          // Validation in FileUpload component ensures all are CSVs
          const readPromises = billingFile.map(file => new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = (event) => resolve(event.target?.result as string);
              reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
              reader.readAsText(file);
          }));
          
          const contents = await Promise.all(readPromises);
          const combinedContent = contents.join('\n\n'); // Join with newlines for separation

          try {
              const result = await analyzeCloudCosts(
                  { content: combinedContent, mimeType: 'text/csv' },
                  pendingParams.provider, 
                  pendingParams.budget, 
                  pendingParams.services
              );
              setAnalysisProgress(100);
              dispatch({ type: 'ANALYSIS_SUCCESS', payload: { result, params: pendingParams } });
          } catch (err) {
               console.error('Gemini API Error:', err);
               dispatch({ type: 'SET_ERROR', payload: 'An error occurred during analysis. Please check your API key and try again.' });
          }
      } else {
          // Single file handling (existing logic for CSV, PDF, Image)
          const singleFile = billingFile[0];
          const reader = new FileReader();
          reader.onload = async (event) => {
              const fileContent = event.target?.result as string;
              if (!fileContent) {
                  dispatch({ type: 'SET_ERROR', payload: 'Could not read the uploaded file.' });
                  return;
              }

              try {
                  const result = await analyzeCloudCosts(
                      { content: fileContent, mimeType: singleFile.type }, 
                      pendingParams.provider, 
                      pendingParams.budget, 
                      pendingParams.services
                  );
                  setAnalysisProgress(100);
                  dispatch({ type: 'ANALYSIS_SUCCESS', payload: { result, params: pendingParams } });
              } catch (err) {
                  console.error('Gemini API Error:', err);
                  dispatch({ type: 'SET_ERROR', payload: 'An error occurred during analysis. Please check your API key and try again.' });
              }
          };
          reader.onerror = () => {
              dispatch({ type: 'SET_ERROR', payload: `Failed to read file: ${singleFile.name}.` });
          };

          if (singleFile.type === 'text/csv') {
              reader.readAsText(singleFile);
          } else if (['application/pdf', 'image/png', 'image/jpeg'].includes(singleFile.type)) {
              reader.readAsDataURL(singleFile);
          } else {
              dispatch({ type: 'SET_ERROR', payload: `Unsupported file type: ${singleFile.type}` });
          }
      }
    } catch (err) {
      console.error('File Reading Error:', err);
      dispatch({ type: 'SET_ERROR', payload: 'An unexpected error occurred while reading files. Please try again.' });
    }
  }, [billingFile, selectedTier, pendingParams]);

  const currentTierDetails = tiers.find(t => t.id === selectedTier);

  useEffect(() => {
    if (status === 'awaitingPaymentConfirmation' && currentTierDetails?.paymentLink) {
        // 1. Open payment link
        window.open(currentTierDetails.paymentLink, '_blank');
        
        // 2. Simulate confirmation process with message updates
        setPaymentMessage('Waiting for payment confirmation from PayPal...');
        
        const timer1 = setTimeout(() => {
            setPaymentMessage('This may take a moment. Please complete the payment in the new tab.');
        }, 4000); // 4 seconds in

        const timer2 = setTimeout(() => {
            setPaymentMessage('Payment confirmed! Preparing your analysis environment...');
        }, 8000); // 8 seconds in

        const timer3 = setTimeout(() => {
            startAnalysis();
        }, 9500); // 9.5 seconds in, start the actual analysis

        // 3. Cleanup timers on component unmount or status change
        return () => {
            clearTimeout(timer1);
            clearTimeout(timer2);
            clearTimeout(timer3);
        };
    }
  }, [status, currentTierDetails, startAnalysis]);

  useEffect(() => {
    if (status === 'analyzing') {
      setAnalysisProgress(0); // Reset progress
      const messages: { [key: number]: string } = {
        0: "Connecting to AI...",
        15: "Parsing your document(s)...",
        40: "Analyzing spending patterns...",
        65: "Checking for anomalies...",
        85: "Compiling your report...",
      };
      
      setLoadingMessage(messages[0]);

      const interval = setInterval(() => {
        setAnalysisProgress(prev => {
          // Slowly increment progress, but cap at 99% until analysis is truly complete
          const newProgress = Math.min(prev + 1, 99);
          
          // Find the latest message that corresponds to the current progress
          const currentMessageKey = Object.keys(messages)
            .map(Number)
            .filter(key => newProgress >= key)
            .pop(); // Gets the largest key that is less than or equal to newProgress
            
          if (currentMessageKey !== undefined && loadingMessage !== messages[currentMessageKey]) {
             setLoadingMessage(messages[currentMessageKey]);
          }

          return newProgress;
        });
      }, 150); // Update progress frequently for a smooth animation

      return () => clearInterval(interval);
    }
  }, [status, loadingMessage]);


  const isInitialStateReady = billingFile && billingFile.length > 0 && selectedTier;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 font-sans flex flex-col items-center p-4 sm:p-6 lg:p-8 transition-colors duration-300">
      <div className="w-full max-w-4xl mx-auto flex flex-col flex-grow relative">
        <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
        <header className="text-center mb-6 sm:mb-8">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-teal-500 dark:from-blue-400 dark:to-teal-300">
            OptimaCloud Anomaly Assistant
          </h1>
          <p className="mt-2 text-base sm:text-lg text-gray-600 dark:text-gray-400">
            Upload your cloud billing document to detect cost leaks.
          </p>
          <p className="mt-4 text-xs sm:text-sm text-yellow-800 dark:text-yellow-300 bg-yellow-100/80 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700/50 rounded-full px-3 py-1 inline-flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 1.944A11.954 11.954 0 012.166 5.026a12.005 12.005 0 01-1.422 6.075c-.345.816-.45 1.705-.45 2.599v1.003c0 .606.246 1.178.653 1.585a2.235 2.235 0 001.582.653h14.938c.606 0 1.178-.246 1.585-.653a2.235 2.235 0 00.653-1.585v-1.003c0 -.894-.105-1.783-.45-2.599a12.005 12.005 0 01-1.422-6.075A11.954 11.954 0 0110 1.944zM8 10a2 2 0 114 0v3a2 2 0 11-4 0v-3z" clipRule="evenodd" />
            </svg>
            <span className="font-semibold">Privacy First:</span> Your data is never saved or stored.
          </p>
        </header>

        <main className="bg-white dark:bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-2xl p-4 sm:p-8 border border-gray-200 dark:border-gray-700 flex-grow">
          {status === 'initial' && (
            <div className="space-y-6 sm:space-y-8">
              <div>
                <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Step 1: Choose Your Plan</h2>
                <PricingTiers selectedTier={selectedTier} onSelectTier={(tier) => dispatch({ type: 'SELECT_TIER', payload: tier })} />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Step 2: Upload Billing Document</h2>
                <FileUpload onFileSelect={(files) => dispatch({ type: 'SET_FILE', payload: files })} />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Step 3: Provide Context & Analyze</h2>
                <ParameterInputs 
                  onSubmit={(params) => dispatch({ type: 'SUBMIT_PARAMETERS', payload: params })} 
                  disabled={!isInitialStateReady}
                  initialParams={lastAnalysisParams}
                />
              </div>
            </div>
          )}
          
          {status === 'pendingPayment' && currentTierDetails && (
            <div className="text-center">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">Confirm Your Analysis</h2>
              <div className="bg-gray-100 dark:bg-gray-700/50 p-6 rounded-lg border border-gray-200 dark:border-gray-600 w-full max-w-md mx-auto">
                <p className="text-lg text-gray-600 dark:text-gray-300">You've selected:</p>
                <h3 className="text-xl sm:text-2xl font-extrabold text-teal-600 dark:text-teal-300 my-2">{currentTierDetails.name}</h3>
                <p className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">{currentTierDetails.price} <span className="text-base font-medium text-gray-500 dark:text-gray-400">{currentTierDetails.frequency}</span></p>
              </div>
              
              <p className="mt-6 text-gray-600 dark:text-gray-400">Please proceed to our secure payment gateway to begin.</p>
              <div className="mt-6 flex flex-col sm:flex-row justify-center gap-4">
                  <button onClick={() => dispatch({ type: 'CANCEL_PAYMENT' })} className="w-full sm:w-auto bg-gray-500 hover:bg-gray-600 text-white dark:bg-gray-600 dark:hover:bg-gray-700 font-bold py-3 px-6 rounded-lg transition-colors duration-300">Cancel</button>
                  <button onClick={() => dispatch({ type: 'PROCEED_TO_PAYMENT' })} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg transition-colors duration-300 shadow-lg">Proceed to Payment</button>
              </div>
            </div>
          )}

          {status === 'awaitingPaymentConfirmation' && (
             <div className="flex flex-col items-center justify-center space-y-6 p-8 sm:p-12 text-center h-full">
                <div className="relative w-24 h-24">
                    <div className="absolute inset-0 rounded-full bg-blue-500/50 animate-ping"></div>
                    <div className="absolute inset-2 rounded-full bg-blue-500/50 animate-ping" style={{ animationDelay: '0.7s' }}></div>
                    <div className="relative w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-full border-2 border-blue-400">
                        <svg className="h-10 w-10 text-blue-500 dark:text-blue-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                </div>
                <p className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-200">Confirming Your Payment</p>
                <p className="text-gray-600 dark:text-gray-400 max-w-sm h-10 flex items-center justify-center">
                    {paymentMessage}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500">Please complete the payment in the new tab that has opened.</p>
            </div>
          )}
          
          {status === 'analyzing' && (
            <div className="flex flex-col items-center justify-center space-y-6 p-8 sm:p-12 text-center h-full">
                <div className="relative">
                    <svg className="animate-spin h-16 w-16 text-blue-500 dark:text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <div className="absolute top-0 left-0 right-0 bottom-0 flex items-center justify-center text-sm font-bold text-blue-700 dark:text-blue-200">
                        {analysisProgress}%
                    </div>
                </div>
                <div>
                    <p className="text-xl sm:text-2xl font-bold text-green-600 dark:text-green-400">Payment Confirmed</p>
                    <p className="mt-2 text-lg sm:text-xl font-semibold text-gray-700 dark:text-gray-300">{loadingMessage}</p>
                </div>
                <div className="w-full max-w-sm">
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                        <div 
                            className="bg-gradient-to-r from-blue-500 to-teal-400 h-2.5 rounded-full transition-all duration-300 ease-linear" 
                            style={{ width: `${analysisProgress}%` }}
                        ></div>
                    </div>
                </div>
                <p className="text-gray-500 dark:text-gray-400 text-sm">Please remain on this page while we process your document.</p>
            </div>
          )}

          
          {(status === 'complete' || status === 'error') && (
            <div>
              {status === 'complete' 
                ? <ReportDisplay report={analysisResult} onReset={() => dispatch({ type: 'RESET' })} onRerun={() => dispatch({ type: 'RERUN' })} />
                : (
                  <div className="text-center p-8 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-500 rounded-lg">
                    <h3 className="text-xl sm:text-2xl font-bold text-red-700 dark:text-red-400">Analysis Failed</h3>
                    <p className="mt-2 text-red-600 dark:text-red-300">{errorMessage}</p>
                    <div className="no-print mt-8 text-center">
                      <button
                        onClick={() => dispatch({ type: 'RESET' })}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg transition-colors duration-300 w-full sm:w-auto"
                      >
                        Start New Analysis
                      </button>
                    </div>
                  </div>
                )
              }
            </div>
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
      
      {isTestimonialVisible && (
        <TestimonialPopup 
          testimonial={testimonials[testimonialIndex]} 
          onClose={handleCloseTestimonial} 
        />
      )}
    </div>
  );
};

export default App;
