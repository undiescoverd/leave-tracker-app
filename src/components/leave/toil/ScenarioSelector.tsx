'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Info } from 'lucide-react';
import { TOILScenario } from '@/lib/types/toil';
import { TOIL_SCENARIOS } from '@/lib/toil/scenarios';

interface ScenarioSelectorProps {
  value?: TOILScenario;
  onChange: (value: TOILScenario) => void;
  error?: string;
}

export function ScenarioSelector({ value, onChange, error }: ScenarioSelectorProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">TOIL Scenario</label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className={error ? 'border-red-500' : ''}>
          <SelectValue placeholder="Select TOIL scenario" />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(TOIL_SCENARIOS).map(([key, config]) => (
            <SelectItem key={key} value={key}>
              <div className="flex flex-col">
                <span>{config.label}</span>
                <span className="text-xs text-muted-foreground">
                  {config.helpText}
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && <p className="text-sm text-red-500">{error}</p>}
      {value && (
        <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-md">
          <Info className="h-4 w-4 text-blue-600 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-blue-900">
              {TOIL_SCENARIOS[value].description}
            </p>
            <p className="text-blue-700 text-xs mt-1">
              {TOIL_SCENARIOS[value].contractRef}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}