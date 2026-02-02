
import React from 'react';
import { Tooltip } from './Tooltip';

export type Tier = 'scan' | 'monitoring' | 'bonus';

interface TierDetails {
  id: Tier;
  name: string;
  price: string;
  frequency: string;
  description: string;
  features: string[];
  target: string;
  paymentLink: string;
  tooltipText: string;
}

interface PricingTiersProps {
  selectedTier: Tier | null;
  onSelectTier: (tier: Tier) => void;
}

export const tiers: TierDetails[] = [
  {
    id: 'scan',
    name: 'One-Time Leak Scan',
    price: '$35',
    frequency: 'per scan',
    description: 'A single, comprehensive anomaly detection report based on the data you provide.',
    features: ['One anomaly report', 'Estimated cost exposure', 'Automated delivery'],
    target: 'Ideal for indie founders & small projects',
    paymentLink: 'https://www.paypal.com/cgi-bin/webscr?cmd=_donations&business=gabriel.mugi66@gmail.com&item_name=One-Time+Cloud+Cost+Leak+Scan&amount=49&currency_code=USD',
    tooltipText: "Best for a quick health check or one-off project analysis without a recurring commitment."
  },
  {
    id: 'monitoring',
    name: 'Auto-Alert Monitoring',
    price: '$55',
    frequency: '/ month',
    description: 'Continuous, automated monitoring with alerts only when cost anomalies are detected.',
    features: ['Automated periodic scans', 'Alerts on threshold breach', 'No dashboards, no meetings'],
    target: 'Best for growing SaaS & businesses',
    paymentLink: 'https://www.paypal.com/cgi-bin/webscr?cmd=_donations&business=gabriel.mugi66@gmail.com&item_name=Auto-Alert+Monitoring+(First+Month)&amount=99&currency_code=USD',
    tooltipText: "Set it and forget it. Ideal for businesses that want proactive alerts on cost spikes."
  },
  {
    id: 'bonus',
    name: 'Savings-Triggered Bonus',
    price: '10-15%',
    frequency: 'of verified savings',
    description: 'Pay a base fee plus a percentage of the savings you confirm from our identified leaks.',
    features: ['High-leverage insights', 'Pay based on value', 'Base scan fee applies'],
    target: 'For performance-focused teams',
    paymentLink: 'https://www.paypal.com/cgi-bin/webscr?cmd=_donations&business=gabriel.mugi66@gmail.com&item_name=Savings-Triggered+Bonus+(Base+Fee)&amount=49&currency_code=USD',
    tooltipText: "A performance-based model where you pay for the value and savings we help you identify."
  },
];

export const PricingTiers: React.FC<PricingTiersProps> = ({ selectedTier, onSelectTier }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
      {tiers.map((tier) => (
        <div
          key={tier.id}
          onClick={() => onSelectTier(tier.id)}
          className={`cursor-pointer p-5 sm:p-6 rounded-lg border-2 transition-all duration-300 ${
            selectedTier === tier.id
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 md:scale-105 shadow-lg'
              : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50'
          }`}
        >
          <div className="flex items-center gap-2">
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100">{tier.name}</h3>
            <Tooltip text={tier.tooltipText}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </Tooltip>
          </div>
          <p className="mt-2">
            <span className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white">{tier.price}</span>
            <span className="text-base font-medium text-gray-500 dark:text-gray-400 ml-1">{tier.frequency}</span>
          </p>
          <p className="mt-4 text-sm text-gray-600 dark:text-gray-300">{tier.description}</p>
          <ul className="mt-6 space-y-2 text-sm">
            {tier.features.map((feature) => (
              <li key={feature} className="flex items-start">
                <svg className="w-4 h-4 mr-2 mt-1 text-green-500 dark:text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                <span className="text-gray-700 dark:text-gray-300">{feature}</span>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-xs text-center font-semibold text-teal-800 dark:text-teal-400 bg-teal-100 dark:bg-teal-900/50 rounded-full px-3 py-1">{tier.target}</p>
        </div>
      ))}
    </div>
  );
};
