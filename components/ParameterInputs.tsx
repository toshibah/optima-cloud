
import React, { useState, useEffect } from 'react';
import { Tooltip } from './Tooltip';

interface ParameterInputsProps {
  onSubmit: (params: { provider: string; budget: string; services: string; }) => void;
  disabled: boolean;
  initialParams?: { provider: string; budget: string; services: string; } | null;
}

export const ParameterInputs: React.FC<ParameterInputsProps> = ({ onSubmit, disabled, initialParams }) => {
  const [provider, setProvider] = useState('');
  const [budget, setBudget] = useState('');
  const [services, setServices] = useState('');

  useEffect(() => {
    setProvider(initialParams?.provider || '');
    setBudget(initialParams?.budget || '');
    setServices(initialParams?.services || '');
  }, [initialParams]);


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ provider, budget, services });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <div className="flex items-center gap-2">
            <label htmlFor="provider" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Cloud Provider(s)
            </label>
            <Tooltip text="Specify all providers in the bill (e.g., AWS, GCP). This helps the AI focus its analysis.">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors mb-1 cursor-help" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
               </svg>
            </Tooltip>
        </div>
        <input
          type="text"
          id="provider"
          value={provider}
          onChange={(e) => setProvider(e.target.value)}
          placeholder="e.g., AWS, GCP, Azure"
          required
          className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md py-2 px-3 text-gray-900 dark:text-gray-200 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
      <div>
        <div className="flex items-center gap-2">
            <label htmlFor="budget" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Expected Monthly Budget Range
            </label>
             <Tooltip text="Provide a realistic range. This is crucial for the AI to determine what qualifies as an 'anomaly' for your scale.">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors mb-1 cursor-help" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
               </svg>
            </Tooltip>
        </div>
        <input
          type="text"
          id="budget"
          value={budget}
          onChange={(e) => setBudget(e.target.value)}
          placeholder="e.g., $5,000 - $7,000"
          required
          className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md py-2 px-3 text-gray-900 dark:text-gray-200 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
      <div>
        <div className="flex items-center gap-2">
          <label htmlFor="services" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Core Services in Use
          </label>
           <Tooltip text="List primary services you use (e.g., EC2, S3). This helps identify unusual usage in non-core services.">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors mb-1 cursor-help" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
             </svg>
          </Tooltip>
        </div>
        <textarea
          id="services"
          value={services}
          onChange={(e) => setServices(e.target.value)}
          placeholder="e.g., EC2, S3, RDS, Lambda for AWS"
          required
          rows={3}
          className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md py-2 px-3 text-gray-900 dark:text-gray-200 focus:ring-blue-500 focus:border-blue-500 resize-y"
        />
      </div>
      <button
        type="submit"
        disabled={disabled}
        className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-700 hover:to-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-900"
      >
        Analyze Costs
      </button>
      {disabled && <p className="text-xs text-center text-gray-500 dark:text-gray-500 mt-2">Please upload a file and select a tier to enable analysis.</p>}
    </form>
  );
};
