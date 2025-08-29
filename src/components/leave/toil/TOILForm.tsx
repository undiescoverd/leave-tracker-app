'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScenarioSelector } from './ScenarioSelector';
import { TOILCalculationDisplay } from './TOILCalculationDisplay';
import { toilFormSchema, TOILFormData } from '@/lib/toil/validation';
import { calculateTOILHours } from '@/lib/toil/calculator';
import { TOILScenario } from '@/lib/types/toil';

interface TOILFormProps {
  onSubmit: (data: TOILFormData & { calculatedHours: number }) => Promise<void>;
  onCancel: () => void;
  availableUsers?: Array<{ id: string; name: string }>;
  loading?: boolean;
}

export function TOILForm({ onSubmit, onCancel, availableUsers = [], loading = false }: TOILFormProps) {
  const [calculatedHours, setCalculatedHours] = useState<number | null>(null);
  
  const form = useForm<TOILFormData>({
    resolver: zodResolver(toilFormSchema),
    defaultValues: {
      reason: ''
    }
  });

  const scenario = form.watch('scenario');
  const travelDate = form.watch('travelDate');
  const returnDate = form.watch('returnDate');
  const returnTime = form.watch('returnTime');

  // Recalculate TOIL whenever relevant fields change
  useEffect(() => {
    if (scenario && travelDate) {
      const hours = calculateTOILHours({
        scenario,
        travelDate,
        returnDate,
        returnTime,
        reason: ''
      });
      setCalculatedHours(hours);
    } else {
      setCalculatedHours(null);
    }
  }, [scenario, travelDate, returnDate, returnTime]);

  const handleSubmit = async (data: TOILFormData) => {
    if (calculatedHours === null) return;
    await onSubmit({ ...data, calculatedHours });
  };

  // Determine which fields to show based on scenario
  const showReturnDate = scenario === TOILScenario.OVERNIGHT_DAY_OFF || 
                         scenario === TOILScenario.OVERNIGHT_WORKING_DAY;
  const showReturnTime = scenario === TOILScenario.OVERNIGHT_WORKING_DAY;
  const showCoverage = scenario === TOILScenario.WORKING_DAY_PANEL;

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
      {/* Scenario Selector */}
      <ScenarioSelector
        value={scenario}
        onChange={(value) => form.setValue('scenario', value)}
        error={form.formState.errors.scenario?.message}
      />

      {/* Travel Date - Always shown */}
      {scenario && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Travel Date</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {travelDate ? format(travelDate, 'PPP') : 'Pick a date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={travelDate}
                onSelect={(date) => form.setValue('travelDate', date!)}
              />
            </PopoverContent>
          </Popover>
          {form.formState.errors.travelDate && (
            <p className="text-sm text-red-500">
              {form.formState.errors.travelDate.message}
            </p>
          )}
        </div>
      )}

      {/* Return Date - Conditional */}
      {showReturnDate && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Return Date</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {returnDate ? format(returnDate, 'PPP') : 'Pick a date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={returnDate}
                onSelect={(date) => form.setValue('returnDate', date!)}
                disabled={(date) => date < travelDate}
              />
            </PopoverContent>
          </Popover>
          {(form.formState.errors as any).returnDate && (
            <p className="text-sm text-red-500">
              {(form.formState.errors as any).returnDate.message}
            </p>
          )}
        </div>
      )}

      {/* Return Time - Conditional */}
      {showReturnTime && (
        <div className="space-y-2">
          <label className="text-sm font-medium">
            Expected Return Time
            <span className="text-xs text-muted-foreground ml-2">
              (Affects TOIL calculation)
            </span>
          </label>
          <Input
            type="time"
            {...form.register('returnTime')}
            className={(form.formState.errors as any).returnTime ? 'border-red-500' : ''}
          />
          {(form.formState.errors as any).returnTime && (
            <p className="text-sm text-red-500">
              {(form.formState.errors as any).returnTime.message}
            </p>
          )}
        </div>
      )}

      {/* Coverage Selection - Conditional */}
      {showCoverage && (
        <div className="space-y-2">
          <label className="text-sm font-medium">
            Who will cover your morning duties?
          </label>
          <Select
            value={form.watch('coveringUserId')}
            onValueChange={(value) => form.setValue('coveringUserId', value)}
            disabled={loading}
          >
            <SelectTrigger>
              <SelectValue placeholder={loading ? "Loading users..." : "Select a colleague"} />
            </SelectTrigger>
            <SelectContent>
              {loading ? (
                <SelectItem value="" disabled>
                  Loading users...
                </SelectItem>
              ) : availableUsers.length === 0 ? (
                <SelectItem value="" disabled>
                  No users available
                </SelectItem>
              ) : (
                availableUsers.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          {(form.formState.errors as any).coveringUserId && (
            <p className="text-sm text-red-500">
              {(form.formState.errors as any).coveringUserId.message}
            </p>
          )}
        </div>
      )}

      {/* Reason - Always shown */}
      {scenario && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Details</label>
          <Textarea
            {...form.register('reason')}
            placeholder="Provide details about the event, client, etc."
            rows={3}
            className={form.formState.errors.reason ? 'border-red-500' : ''}
          />
          {form.formState.errors.reason && (
            <p className="text-sm text-red-500">
              {form.formState.errors.reason.message}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Include any relevant information about the travel or event.
          </p>
        </div>
      )}

      {/* TOIL Calculation Display */}
      {scenario && (
        <TOILCalculationDisplay
          hours={calculatedHours}
          scenario={scenario}
        />
      )}

      {/* Actions */}
      <div className="flex gap-3 justify-end pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button 
          type="submit" 
          disabled={!form.formState.isValid || calculatedHours === null}
        >
          Submit Request
        </Button>
      </div>
    </form>
  );
}