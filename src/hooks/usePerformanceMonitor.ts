import { useEffect, useRef } from 'react';
import { logger } from '@/lib/logger';

interface PerformanceMetrics {
  componentName: string;
  renderTime: number;
  renderCount: number;
}

export function usePerformanceMonitor(componentName: string, enabled: boolean = process.env.NODE_ENV === 'development') {
  const renderCountRef = useRef(0);
  const renderStartRef = useRef<number>(0);

  useEffect(() => {
    if (!enabled) return;

    renderCountRef.current += 1;
    renderStartRef.current = performance.now();

    const logPerformance = () => {
      const renderTime = performance.now() - renderStartRef.current;
      
      // Only log if render takes longer than one frame (16ms at 60fps) or if verbose logging is enabled
      if (renderTime > 16 || process.env.VERBOSE_LOGGING === 'true') {
        logger.performanceMetric(`render-${componentName}`, renderTime, {
          renderCount: renderCountRef.current,
          threshold: '16ms',
          performance: renderTime > 16 ? 'slow' : 'normal'
        });
      }
    };

    // Use setTimeout to ensure measurement happens after render
    const timeoutId = setTimeout(logPerformance, 0);

    return () => clearTimeout(timeoutId);
  });

  // Return performance metrics for programmatic use
  return {
    renderCount: renderCountRef.current,
    componentName
  };
}

// Hook for tracking expensive operations
export function useOperationTimer() {
  const startOperation = (operationName: string) => {
    const startTime = performance.now();
    
    return {
      end: () => {
        const duration = performance.now() - startTime;
        
        // Only log if operation is slow (>100ms) or if verbose logging is enabled
        if (duration > 100 || process.env.VERBOSE_LOGGING === 'true') {
          logger.performanceMetric(`operation-${operationName}`, duration, {
            performance: duration > 100 ? 'slow' : 'normal',
            threshold: '100ms'
          });
        }
        
        return duration;
      }
    };
  };

  return { startOperation };
}