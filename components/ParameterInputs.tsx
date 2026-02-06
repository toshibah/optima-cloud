
import React from 'react';

interface ParameterInputsProps {
  provider: string;
  setProvider: (value: string) => void;
  budget: string;
  setBudget: (value: string) => void;
  services: string;
  setServices: (value: string) => void;
  isLoading: boolean;
}

export const ParameterInputs: React.FC<ParameterInputsProps> = ({
  provider, setProvider, budget, setBudget, services, setServices, isLoading
}) => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="provider" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cloud Provider(s)</label>
          <input type="text" name="provider" id="provider" value={provider} onChange={e => setProvider(e.target.value)} className="w-full bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md py-2 px-3 focus:ring-blue-500 focus:border-blue-500" placeholder="e.g., AWS, GCP, Azure" required />
        </div>
        <div>
          <label htmlFor="budget" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Expected Monthly Budget</label>
          <input type="text" name="budget" id="budget" value={budget} onChange={e => setBudget(e.target.value)} className="w-full bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md py-2 px-3 focus:ring-blue-500 focus:border-blue-500" placeholder="e.g., $5,000 - $7,000" required />
        </div>
      </div>
      <div>
        <label htmlFor="services" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Core Services in Use</label>
        <input type="text" name="services" id="services" value={services} onChange={e => setServices(e.target.value)} className="w-full bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md py-2 px-3 focus:ring-blue-500 focus:border-blue-500" placeholder="e.g., EC2, S3, RDS, Lambda" required />
      </div>
      <div className="pt-4 text-center">
        <button type="submit" id="analyze-button" disabled={isLoading} className="relative w-full sm:w-auto bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-700 hover:to-teal-600 text-white font-extrabold py-3 px-12 rounded-lg transition-transform duration-300 transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed">
          {isLoading && (
            <span className="absolute inset-0 flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Analyzing...
            </span>
          )}
          <span className={isLoading ? 'opacity-0' : ''}>Analyze Now</span>
        </button>
        {isLoading && (
             <p className="text-gray-600 dark:text-gray-400 mt-4">Please wait, connecting to AI and processing your document(s)...</p>
        )}
      </div>
    </div>
  );
};
