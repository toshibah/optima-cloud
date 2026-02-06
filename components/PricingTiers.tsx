
import React from 'react';
import type { Tier } from '../App';

interface PricingTiersProps {
  selectedTier: Tier;
  onSelectTier: (tier: Tier) => void;
}

const tiers = [
  { id: 'scan', name: 'One-Time Leak Scan', price: '$35', description: 'A comprehensive, one-off analysis of a single billing document.', paymentLink: 'https://paypal.me/YourPayPal/35' },
  { id: 'monitoring', name: 'Auto-Alert Monitoring', price: '$55', description: 'Monthly monitoring with automated email alerts for detected anomalies.', paymentLink: 'https://paypal.me/YourPayPal/55' },
  { id: 'bonus', name: 'Savings-Triggered Bonus', price: '10-15%', description: 'Pay only a small percentage of the actual savings we identify for you.', paymentLink: 'https://paypal.me/YourPayPal/10' },
] as const;


export const PricingTiers: React.FC<PricingTiersProps> = ({ selectedTier, onSelectTier }) => {
  const handleTierClick = (tier: Tier) => {
    onSelectTier(tier);
    const selectedTierData = tiers.find(t => t.id === tier);
    if (selectedTierData?.paymentLink) {
        window.open(selectedTierData.paymentLink, '_blank');
    }
  };
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {tiers.map(tier => (
        <div 
          key={tier.id}
          className={`tier-card p-6 rounded-lg cursor-pointer border-2 transition-all duration-200 ${selectedTier === tier.id ? 'border-blue-500 dark:border-blue-400 ring-2 ring-blue-500' : 'border-gray-200 dark:border-gray-700'}`}
          onClick={() => handleTierClick(tier.id)}
        >
          <h3 className="font-bold text-lg">{tier.name}</h3>
          <p className="text-3xl font-extrabold my-2">{tier.price}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">{tier.description}</p>
        </div>
      ))}
    </div>
  );
};
