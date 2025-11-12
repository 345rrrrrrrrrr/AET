import React from 'react';
import type { Plan } from '../types';
import { BrainIcon } from './icons/BrainIcon';

interface PlanTrackerProps {
  plan: Plan | null;
}

const getStatusIcon = (status: 'pending' | 'in_progress' | 'completed' | 'failed') => {
  switch (status) {
    case 'completed': return <span className="text-green-400">✓</span>;
    case 'in_progress': return <span className="text-yellow-400 animate-pulse">{'>'}</span>;
    case 'failed': return <span className="text-red-500">✗</span>;
    case 'pending':
    default:
      return <span className="text-gray-500">○</span>;
  }
};

export const PlanTracker: React.FC<PlanTrackerProps> = ({ plan }) => {
  if (!plan) return null;

  return (
    <div className="absolute top-20 left-4 z-50 bg-gray-900/80 backdrop-blur-sm border border-yellow-500/30 rounded-lg p-3 w-64 shadow-lg font-mono text-sm">
      <div className="flex items-center mb-2 border-b border-yellow-500/20 pb-2">
        <BrainIcon className="w-5 h-5 text-yellow-400 mr-2" />
        <h4 className="text-yellow-400 font-bold uppercase tracking-wider select-none">Current Plan</h4>
      </div>
      <div className="mb-2">
        <p className="text-gray-400 text-xs">Objective:</p>
        <p className="text-white font-semibold">{plan.objective}</p>
      </div>
      <div>
        <p className="text-gray-400 text-xs mb-1">Steps:</p>
        <ul className="space-y-1 text-xs">
          {plan.steps.map((step, index) => (
            <li key={index} className={`flex items-start ${index === plan.currentStepIndex ? 'text-yellow-300' : 'text-gray-300'} ${step.status === 'completed' ? 'line-through text-gray-500' : ''}`}>
              <span className="w-4 mr-1">{getStatusIcon(step.status)}</span>
              <span className="flex-1">{step.action.replace(/_/g, ' ')} {step.targetId ? `(${step.targetId.split('_')[0]})` : ''}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
