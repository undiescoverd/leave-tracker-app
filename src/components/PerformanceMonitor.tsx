"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, TrendingUp, Clock, Database, Wifi } from 'lucide-react';

interface PerformanceMetrics {
  loadTime: number;
  renderTime: number;
  apiResponseTime: number;
  cacheHitRate: number;
  memoryUsage: number;
  networkStatus: 'online' | 'offline';
  lastUpdated: Date;
}

export function PerformanceMonitor() {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Only show in development
    if (process.env.NODE_ENV !== 'development') {
      return;
    }

    const collectMetrics = () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const paint = performance.getEntriesByType('paint');
      
      const loadTime = navigation ? navigation.loadEventEnd - navigation.loadEventStart : 0;
      const renderTime = paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0;
      
      // Estimate API response time (this would be collected from actual API calls)
      const apiResponseTime = 150; // ms - placeholder
      
      // Estimate cache hit rate (this would be collected from actual cache usage)
      const cacheHitRate = 85; // percentage - placeholder
      
      // Memory usage (if available)
      const memoryUsage = (performance as any).memory 
        ? (performance as any).memory.usedJSHeapSize / 1024 / 1024 
        : 0;

      const newMetrics: PerformanceMetrics = {
        loadTime,
        renderTime,
        apiResponseTime,
        cacheHitRate,
        memoryUsage,
        networkStatus: navigator.onLine ? 'online' : 'offline',
        lastUpdated: new Date(),
      };

      setMetrics(newMetrics);
    };

    // Collect initial metrics
    collectMetrics();

    // Set up periodic collection
    const interval = setInterval(collectMetrics, 10000); // Every 10 seconds

    // Listen for online/offline events
    const handleOnline = () => collectMetrics();
    const handleOffline = () => collectMetrics();

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const refreshMetrics = () => {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const paint = performance.getEntriesByType('paint');
    
    const loadTime = navigation ? navigation.loadEventEnd - navigation.loadEventStart : 0;
    const renderTime = paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0;
    
    setMetrics(prev => prev ? {
      ...prev,
      loadTime,
      renderTime,
      lastUpdated: new Date(),
    } : null);
  };

  if (process.env.NODE_ENV !== 'development' || !metrics) {
    return null;
  }

  const getPerformanceColor = (value: number, thresholds: { good: number; warning: number }) => {
    if (value <= thresholds.good) return 'bg-green-500';
    if (value <= thresholds.warning) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getCacheHitRateColor = (rate: number) => {
    if (rate >= 80) return 'bg-green-500';
    if (rate >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {!isVisible ? (
        <Button
          onClick={() => setIsVisible(true)}
          size="sm"
          variant="outline"
          className="bg-background/90 backdrop-blur-sm"
        >
          <TrendingUp className="h-4 w-4 mr-2" />
          Perf
        </Button>
      ) : (
        <Card className="w-80 bg-background/95 backdrop-blur-sm border shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Performance Monitor</CardTitle>
              <div className="flex gap-2">
                <Button
                  onClick={refreshMetrics}
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                >
                  <RefreshCw className="h-3 w-3" />
                </Button>
                <Button
                  onClick={() => setIsVisible(false)}
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                >
                  ×
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Load Time */}
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Clock className="h-3 w-3" />
                <span>Load Time</span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${getPerformanceColor(metrics.loadTime, { good: 1000, warning: 3000 })}`} />
                <span className="font-mono">{metrics.loadTime.toFixed(0)}ms</span>
              </div>
            </div>

            {/* Render Time */}
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-3 w-3" />
                <span>First Paint</span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${getPerformanceColor(metrics.renderTime, { good: 1500, warning: 3000 })}`} />
                <span className="font-mono">{metrics.renderTime.toFixed(0)}ms</span>
              </div>
            </div>

            {/* API Response Time */}
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Database className="h-3 w-3" />
                <span>API Avg</span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${getPerformanceColor(metrics.apiResponseTime, { good: 200, warning: 500 })}`} />
                <span className="font-mono">{metrics.apiResponseTime}ms</span>
              </div>
            </div>

            {/* Cache Hit Rate */}
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span>Cache Hit</span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${getCacheHitRateColor(metrics.cacheHitRate)}`} />
                <span className="font-mono">{metrics.cacheHitRate}%</span>
              </div>
            </div>

            {/* Memory Usage */}
            {metrics.memoryUsage > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span>Memory</span>
                <span className="font-mono">{metrics.memoryUsage.toFixed(1)}MB</span>
              </div>
            )}

            {/* Network Status */}
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Wifi className="h-3 w-3" />
                <span>Network</span>
              </div>
              <Badge variant={metrics.networkStatus === 'online' ? 'default' : 'destructive'}>
                {metrics.networkStatus}
              </Badge>
            </div>

            {/* Last Updated */}
            <div className="text-xs text-muted-foreground text-center pt-2 border-t">
              Last updated: {metrics.lastUpdated.toLocaleTimeString()}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
