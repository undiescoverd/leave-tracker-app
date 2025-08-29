'use client';

import { Calculator } from 'lucide-react';
import { TOILScenario } from '@/lib/types/toil';
import { getTOILDisplayText } from '@/lib/toil/calculator';

interface TOILCalculationDisplayProps {
  hours: number | null;
  scenario: TOILScenario;
}

export function TOILCalculationDisplay({ hours, scenario }: TOILCalculationDisplayProps) {
  const displayText = getTOILDisplayText(hours, scenario);
  const isCalculating = hours === null;
  const hasToil = hours !== null && hours > 0;

  return (
    <div className={`
      p-4 rounded-lg border-2 transition-all
      ${isCalculating ? 'border-gray-200 bg-gray-50' : ''}
      ${hasToil ? 'border-green-200 bg-green-50' : ''}
      ${hours === 0 ? 'border-yellow-200 bg-yellow-50' : ''}
    `}>
      <div className="flex items-center gap-3">
        <Calculator className={`h-5 w-5 ${
          isCalculating ? 'text-gray-400' :
          hasToil ? 'text-green-600' : 'text-yellow-600'
        }`} />
        <div>
          <p className="font-semibold text-sm">TOIL Calculation</p>
          <p className={`text-lg ${
            isCalculating ? 'text-gray-600' :
            hasToil ? 'text-green-700' : 'text-yellow-700'
          }`}>
            {displayText}
          </p>
        </div>
      </div>
    </div>
  );
}