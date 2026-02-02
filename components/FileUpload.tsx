
import React, { useState, useCallback } from 'react';

interface FileUploadProps {
  onFileSelect: (file: File | null) => void;
}

const InfoAccordion: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="w-full mt-4 bg-gray-100 dark:bg-gray-800/50 rounded-lg border border-gray-300 dark:border-gray-700">
            <h2>
                <button 
                    type="button" 
                    className="flex items-center justify-between w-full p-3 font-medium text-left text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700/50 rounded-lg"
                    onClick={() => setIsOpen(!isOpen)}
                    aria-expanded={isOpen}
                    aria-controls="info-accordion-body"
                >
                    <span className="flex items-center text-sm sm:text-base">
                         <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"></path></svg>
                        Security & Privacy Information
                    </span>
                    <svg className={`w-3 h-3 transform transition-transform ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 10 6">
                        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5 5 1 1 5"/>
                    </svg>
                </button>
            </h2>
            <div id="info-accordion-body" className={`${isOpen ? '' : 'hidden'}`}>
                <div className="p-4 border-t border-gray-300 dark:border-gray-700">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        For your security and privacy, this application operates without ever needing your private credentials.
                    </p>
                    <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-400 mt-2 space-y-1">
                        <li><strong className="text-gray-800 dark:text-gray-300">Data Privacy:</strong> We do not store your billing documents or the analysis results. Every session is ephemeral and your data is processed in memory only.</li>
                        <li><strong className="text-gray-800 dark:text-gray-300">Security:</strong> We will never ask for your ISP or cloud account logins. This protects you from potential credential theft.</li>
                        <li><strong className="text-gray-800 dark:text-gray-300">Privacy:</strong> The app cannot access your local network or router. This ensures your network activity remains completely private.</li>
                        <li><strong className="text-gray-800 dark:text-gray-300">Simplicity:</strong> Uploading a standard billing document (CSV, PDF, or even a screenshot) is a secure and reliable way to provide data for analysis.</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};


export const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect }) => {
  const [fileName, setFileName] = useState<string>('');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const validTypes = ['text/csv', 'application/pdf', 'image/png', 'image/jpeg'];

  const handleFileChange = (files: FileList | null) => {
    setError('');
    if (files && files.length > 0) {
      const file = files[0];
      if (validTypes.includes(file.type)) {
        setFileName(file.name);
        onFileSelect(file);
      } else {
        setError(`Invalid file type. Please upload a CSV, PDF, PNG, or JPG.`);
        setFileName('');
        onFileSelect(null);
      }
    } else {
        setFileName('');
        onFileSelect(null);
    }
  };

  const onDragEnter = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);
  
  const onDragLeave = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const onDrop = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFileChange(e.dataTransfer.files);
  }, []);

  return (
    <div className="w-full">
      <label
        onDragEnter={onDragEnter}
        onDragOver={onDragEnter}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`flex justify-center w-full h-32 px-4 transition bg-gray-50 dark:bg-gray-700/50 border-2 ${isDragging ? 'border-blue-400' : 'border-gray-300 dark:border-gray-600'} ${error ? 'border-red-500' : ''} border-dashed rounded-md appearance-none cursor-pointer hover:border-gray-400 dark:hover:border-gray-500 focus:outline-none`}
      >
        <span className="flex items-center space-x-2 text-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-gray-500 dark:text-gray-400 hidden sm:block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <span className="text-sm sm:text-base font-medium text-gray-600 dark:text-gray-400">
            {fileName || (
              <>
                Drop CSV, PDF, or image here, or <span className="text-blue-500 dark:text-blue-400 underline">browse</span>
              </>
            )}
          </span>
        </span>
        <input
          type="file"
          name="file_upload"
          className="hidden"
          accept=".csv,.pdf,.png,.jpg,.jpeg"
          onChange={(e) => handleFileChange(e.target.files)}
        />
      </label>
      {error && <p className="text-sm text-red-500 dark:text-red-400 mt-2 text-center">{error}</p>}
      <InfoAccordion />
    </div>
  );
};
