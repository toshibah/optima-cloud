
import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

interface FileUploadProps {
  files: File[];
  onSetFiles: (files: File[]) => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ files, onSetFiles }) => {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    onSetFiles(acceptedFiles);
  }, [onSetFiles]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  const fileList = files.map(file => (
    <li key={file.name}>
      {file.name} - {(file.size / 1024).toFixed(2)} KB
    </li>
  ));

  return (
    <div {...getRootProps()} className={`w-full p-6 bg-gray-50 dark:bg-gray-700/50 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors duration-300 ${isDragActive ? 'border-blue-500 dark:border-blue-400' : 'border-gray-300 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-400'}`}>
      <input {...getInputProps()} name="billingFile[]" />
      <div className="flex flex-col items-center justify-center">
        <svg className="w-12 h-12 text-gray-400 dark:text-gray-500 mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l-3.75 3.75M12 9.75l3.75 3.75M3 17.25V6.75A2.25 2.25 0 015.25 4.5h13.5A2.25 2.25 0 0121 6.75v10.5A2.25 2.25 0 0118.75 21H5.25A2.25 2.25 0 013 17.25z" />
        </svg>
        {isDragActive ? (
          <p className="text-blue-600 dark:text-blue-300">Drop the files here ...</p>
        ) : (
          <>
            <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
              <span className="font-semibold">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Supports: CSV, PDF, PNG, JPG</p>
          </>
        )}
        {files.length > 0 && (
          <div className="mt-3 text-sm text-gray-700 dark:text-gray-300">
            <ul className="list-disc list-inside">{fileList}</ul>
          </div>
        )}
      </div>
    </div>
  );
};
