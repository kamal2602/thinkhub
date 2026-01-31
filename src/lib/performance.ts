interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private readonly maxMetrics = 1000;
  private slowQueryThreshold = 1000;

  async measure<T>(
    name: string,
    fn: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    const start = performance.now();

    try {
      const result = await fn();
      const duration = performance.now() - start;

      this.recordMetric(name, duration, metadata);

      if (duration > this.slowQueryThreshold) {
        this.reportSlowOperation(name, duration, metadata);
      }

      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.recordMetric(name, duration, { ...metadata, error: true });
      throw error;
    }
  }

  measureSync<T>(
    name: string,
    fn: () => T,
    metadata?: Record<string, any>
  ): T {
    const start = performance.now();

    try {
      const result = fn();
      const duration = performance.now() - start;

      this.recordMetric(name, duration, metadata);

      if (duration > this.slowQueryThreshold) {
        this.reportSlowOperation(name, duration, metadata);
      }

      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.recordMetric(name, duration, { ...metadata, error: true });
      throw error;
    }
  }

  private recordMetric(name: string, duration: number, metadata?: Record<string, any>): void {
    this.metrics.push({
      name,
      duration,
      timestamp: Date.now(),
      metadata
    });

    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }
  }

  private reportSlowOperation(name: string, duration: number, metadata?: Record<string, any>): void {
    console.warn(`[Performance] Slow operation detected:`, {
      name,
      duration: `${duration.toFixed(2)}ms`,
      metadata
    });
  }

  getMetrics(name?: string): PerformanceMetric[] {
    if (name) {
      return this.metrics.filter(m => m.name === name);
    }
    return [...this.metrics];
  }

  getAverageDuration(name: string): number {
    const metrics = this.getMetrics(name);
    if (metrics.length === 0) return 0;

    const sum = metrics.reduce((acc, m) => acc + m.duration, 0);
    return sum / metrics.length;
  }

  getSlowOperations(thresholdMs?: number): PerformanceMetric[] {
    const threshold = thresholdMs || this.slowQueryThreshold;
    return this.metrics.filter(m => m.duration > threshold);
  }

  getSummary(): {
    totalOperations: number;
    averageDuration: number;
    slowOperations: number;
    byOperation: Record<string, { count: number; avgDuration: number }>;
  } {
    const byOperation: Record<string, { count: number; avgDuration: number }> = {};

    this.metrics.forEach(metric => {
      if (!byOperation[metric.name]) {
        byOperation[metric.name] = { count: 0, avgDuration: 0 };
      }
      byOperation[metric.name].count++;
    });

    Object.keys(byOperation).forEach(name => {
      byOperation[name].avgDuration = this.getAverageDuration(name);
    });

    const totalDuration = this.metrics.reduce((sum, m) => sum + m.duration, 0);

    return {
      totalOperations: this.metrics.length,
      averageDuration: this.metrics.length > 0 ? totalDuration / this.metrics.length : 0,
      slowOperations: this.getSlowOperations().length,
      byOperation
    };
  }

  clearMetrics(): void {
    this.metrics = [];
  }

  setSlowQueryThreshold(ms: number): void {
    this.slowQueryThreshold = ms;
  }

  logPerformanceSummary(): void {
    const summary = this.getSummary();
    console.log('[Performance Summary]', {
      totalOperations: summary.totalOperations,
      averageDuration: `${summary.averageDuration.toFixed(2)}ms`,
      slowOperations: summary.slowOperations,
      operations: Object.entries(summary.byOperation).map(([name, stats]) => ({
        name,
        count: stats.count,
        avgDuration: `${stats.avgDuration.toFixed(2)}ms`
      }))
    });
  }
}

export const performanceMonitor = new PerformanceMonitor();

export function withPerformance<T extends (...args: any[]) => Promise<any>>(
  name: string,
  fn: T
): T {
  return ((...args: any[]) => {
    return performanceMonitor.measure(name, () => fn(...args));
  }) as T;
}
