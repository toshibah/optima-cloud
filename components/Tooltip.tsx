
import React, { useState, useMemo } from 'react';

interface TooltipProps {
  text: string;
  children: React.ReactNode;
}

/**
 * A reusable and accessible tooltip component that displays a text bubble on hover or focus.
 * It uses the aria-describedby pattern to associate the tooltip content with its trigger element for screen readers.
 * @param text The string to display inside the tooltip.
 * @param children The element that will trigger the tooltip on hover.
 */
export const Tooltip: React.FC<TooltipProps> = ({ text, children }) => {
  const [isVisible, setIsVisible] = useState(false);
  
  // Generate a unique ID to link the trigger and the tooltip for accessibility.
  const tooltipId = useMemo(() => `tooltip-${Math.random().toString(36).slice(2, 9)}`, []);

  return (
    <div 
      className="relative flex items-center"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
      tabIndex={0} // Makes the div focusable for accessibility
      aria-describedby={tooltipId} // Link the trigger to the tooltip content
    >
      {children}
      {isVisible && (
        <div 
          id={tooltipId} // The ID for the aria-describedby reference
          className="absolute bottom-full left-1/2 z-20 mb-2 w-max max-w-xs -translate-x-1/2 rounded-md bg-gray-700 dark:bg-gray-800 px-3 py-2 text-center text-sm font-medium text-white dark:text-gray-200 shadow-lg border border-gray-600 dark:border-gray-600 transition-opacity"
          role="tooltip"
        >
          {text}
          {/* Arrow */}
          <div className="absolute left-1/2 top-full h-0 w-0 -translate-x-1/2 border-x-4 border-x-transparent border-t-4 border-t-gray-700 dark:border-t-gray-800"></div>
        </div>
      )}
    </div>
  );
};
