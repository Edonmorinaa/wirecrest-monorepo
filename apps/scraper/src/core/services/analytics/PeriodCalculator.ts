/**
 * Period Calculator Utility
 * Calculates metrics for different time periods
 * Follows Single Responsibility Principle (SRP)
 */

export interface PeriodDefinition {
  days: number | null; // null = all time
  label: string;
}

export const PERIOD_DEFINITIONS: Record<number, PeriodDefinition> = {
  1: { days: 1, label: 'Last 1 Day' },
  3: { days: 3, label: 'Last 3 Days' },
  7: { days: 7, label: 'Last 7 Days' },
  30: { days: 30, label: 'Last 30 Days' },
  180: { days: 180, label: 'Last 6 Months' },
  365: { days: 365, label: 'Last 12 Months' },
  0: { days: null, label: 'All Time' },
};

export type PeriodKey = keyof typeof PERIOD_DEFINITIONS;

export class PeriodCalculator {
  /**
   * Get cutoff date for a given period
   */
  static getCutoffDate(periodKey: PeriodKey): Date | null {
    const period = PERIOD_DEFINITIONS[periodKey];
    if (period.days === null) {
      return null; // All time
    }
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - period.days);
    cutoffDate.setHours(0, 0, 0, 0);
    return cutoffDate;
  }

  /**
   * Filter items by period
   */
  static filterByPeriod<T extends { publishedAtDate: Date | string }>(
    items: T[],
    periodKey: PeriodKey
  ): T[] {
    const cutoffDate = this.getCutoffDate(periodKey);
    
    if (cutoffDate === null) {
      return items; // All time
    }
    
    return items.filter(item => {
      const itemDate = typeof item.publishedAtDate === 'string' 
        ? new Date(item.publishedAtDate) 
        : item.publishedAtDate;
      return itemDate >= cutoffDate;
    });
  }

  /**
   * Get all period keys
   */
  static getAllPeriods(): PeriodKey[] {
    return Object.keys(PERIOD_DEFINITIONS).map(key => parseInt(key) as PeriodKey);
  }

  /**
   * Get period label
   */
  static getPeriodLabel(periodKey: PeriodKey): string {
    return PERIOD_DEFINITIONS[periodKey].label;
  }

  /**
   * Calculate days between two dates
   */
  static daysBetween(date1: Date, date2: Date): number {
    const diffTime = Math.abs(date2.getTime() - date1.getTime());
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Calculate hours between two dates
   */
  static hoursBetween(date1: Date, date2: Date): number {
    const diffTime = Math.abs(date2.getTime() - date1.getTime());
    return diffTime / (1000 * 60 * 60);
  }
}

