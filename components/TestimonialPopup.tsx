
import React, { useState, useMemo } from 'react';
import { testimonials } from '../data/testimonials';

interface TestimonialPopupProps {
    onClose: () => void;
}

export const TestimonialPopup: React.FC<TestimonialPopupProps> = ({ onClose }) => {
    const [isVisible, setIsVisible] = useState(true);

    const testimonial = useMemo(() => {
        return testimonials[Math.floor(Math.random() * testimonials.length)];
    }, []);

    const handleClose = () => {
        setIsVisible(false);
        // Allow time for fade-out animation before calling parent onClose
        setTimeout(onClose, 300);
    };

    if (!isVisible) {
        return null;
    }

    return (
        <div 
            className="fixed bottom-5 right-5 w-full max-w-sm p-4 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 transform transition-all duration-300 ease-out fade-in" 
            role="alert" 
            aria-live="polite"
        >
            <button
                onClick={handleClose}
                className="absolute top-2 right-2 p-1 rounded-full text-gray-400 dark:text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Close testimonial"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
            </button>
            <div className="flex items-start gap-4">
                <div className="flex-shrink-0 text-3xl"><span role="img" aria-label="Sparkles emoji">✨</span></div>
                <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 italic">"{testimonial.quote}"</p>
                    <div className="mt-3">
                        <p className="font-bold text-gray-800 dark:text-gray-200 text-sm">{testimonial.author}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{testimonial.company}</p>
                    </div>
                </div>
            </div>
            <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700 text-center">
                <p className="text-sm font-semibold text-green-600 dark:text-green-400">
                    Identified Savings: <span className="font-extrabold text-base">{testimonial.savings}</span>
                </p>
            </div>
        </div>
    );
};
