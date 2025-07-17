// Test file for Snoozed Tabs Extension
// Run: npm test

const { TimeCalculator } = require('../utils/time.js');

// Mock chrome APIs for testing
global.chrome = {
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn()
    }
  },
  tabs: {
    query: jest.fn(),
    get: jest.fn(),
    create: jest.fn(),
    remove: jest.fn()
  },
  alarms: {
    create: jest.fn(),
    clear: jest.fn()
  }
};

describe('TimeCalculator', () => {
  let timeCalculator;

  beforeEach(() => {
    timeCalculator = new TimeCalculator();
    // Mock current time to a fixed date for consistent testing
    jest.spyOn(Date, 'now').mockReturnValue(new Date('2025-07-17T12:00:00Z').getTime());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('calculateUnsnoozeTime', () => {
    test('should calculate later-today correctly', () => {
      const result = timeCalculator.calculateUnsnoozeTime('later-today');
      const expected = new Date('2025-07-17T15:00:00Z').getTime(); // 3 hours later
      expect(result).toBe(expected);
    });

    test('should calculate tomorrow correctly', () => {
      const result = timeCalculator.calculateUnsnoozeTime('tomorrow');
      const expected = new Date('2025-07-18T08:00:00Z').getTime(); // 8am tomorrow
      expect(result).toBe(expected);
    });

    test('should calculate tonight correctly', () => {
      const result = timeCalculator.calculateUnsnoozeTime('tonight');
      const expected = new Date('2025-07-17T18:00:00Z').getTime(); // 6pm today
      expect(result).toBe(expected);
    });

    test('should calculate later-this-week correctly', () => {
      const result = timeCalculator.calculateUnsnoozeTime('later-this-week');
      const expected = new Date('2025-07-20T12:00:00Z').getTime(); // 3 days later
      expect(result).toBe(expected);
    });

    test('should calculate next-month correctly', () => {
      const result = timeCalculator.calculateUnsnoozeTime('next-month');
      const expected = new Date('2025-08-16T12:00:00Z').getTime(); // 30 days later
      expect(result).toBe(expected);
    });

    test('should calculate someday correctly', () => {
      const result = timeCalculator.calculateUnsnoozeTime('someday');
      const expected = new Date('2099-12-31').getTime(); // Far future
      expect(result).toBe(expected);
    });

    test('should default to later-today for unknown options', () => {
      const result = timeCalculator.calculateUnsnoozeTime('unknown-option');
      const expected = new Date('2025-07-17T15:00:00Z').getTime(); // 3 hours later
      expect(result).toBe(expected);
    });
  });

  describe('formatUnsnoozeTime', () => {
    test('should format someday correctly', () => {
      const somedayTime = new Date('2099-12-31').getTime();
      const result = timeCalculator.formatUnsnoozeTime(somedayTime);
      expect(result).toBe('Someday');
    });

    test('should format today correctly', () => {
      const todayTime = new Date('2025-07-17T15:00:00Z').getTime();
      const result = timeCalculator.formatUnsnoozeTime(todayTime);
      expect(result).toContain('Today at');
    });

    test('should format tomorrow correctly', () => {
      const tomorrowTime = new Date('2025-07-18T08:00:00Z').getTime();
      const result = timeCalculator.formatUnsnoozeTime(tomorrowTime);
      expect(result).toContain('Tomorrow at');
    });

    test('should format future dates correctly', () => {
      const futureTime = new Date('2025-07-20T10:00:00Z').getTime();
      const result = timeCalculator.formatUnsnoozeTime(futureTime);
      expect(result).toContain('Jul 20');
    });
  });

  describe('getTimeUntilUnsnooze', () => {
    test('should return "Overdue" for past times', () => {
      const pastTime = new Date('2025-07-17T10:00:00Z').getTime();
      const result = timeCalculator.getTimeUntilUnsnooze(pastTime);
      expect(result).toBe('Overdue');
    });

    test('should return days for future times', () => {
      const futureTime = new Date('2025-07-20T12:00:00Z').getTime();
      const result = timeCalculator.getTimeUntilUnsnooze(futureTime);
      expect(result).toBe('3 days');
    });

    test('should return hours for same day', () => {
      const laterToday = new Date('2025-07-17T15:00:00Z').getTime();
      const result = timeCalculator.getTimeUntilUnsnooze(laterToday);
      expect(result).toBe('3 hours');
    });

    test('should return minutes for short durations', () => {
      const soonTime = new Date('2025-07-17T12:30:00Z').getTime();
      const result = timeCalculator.getTimeUntilUnsnooze(soonTime);
      expect(result).toBe('30 minutes');
    });

    test('should handle singular forms', () => {
      const oneHourLater = new Date('2025-07-17T13:00:00Z').getTime();
      const result = timeCalculator.getTimeUntilUnsnooze(oneHourLater);
      expect(result).toBe('1 hour');
    });
  });

  describe('weekend calculation', () => {
    test('should calculate next Saturday correctly', () => {
      // Mock current time to be a Wednesday
      jest.spyOn(Date, 'now').mockReturnValue(new Date('2025-07-16T12:00:00Z').getTime());
      
      const result = timeCalculator.calculateUnsnoozeTime('this-weekend');
      const expected = new Date('2025-07-19T08:00:00Z').getTime(); // Saturday at 8am
      expect(result).toBe(expected);
    });

    test('should calculate next Monday correctly', () => {
      // Mock current time to be a Wednesday
      jest.spyOn(Date, 'now').mockReturnValue(new Date('2025-07-16T12:00:00Z').getTime());
      
      const result = timeCalculator.calculateUnsnoozeTime('next-week');
      const expected = new Date('2025-07-21T08:00:00Z').getTime(); // Monday at 8am
      expect(result).toBe(expected);
    });
  });

  describe('getSnoozeOptionLabel', () => {
    test('should return correct labels for all options', () => {
      const options = {
        'later-today': '3 hours from now',
        'tonight': '6pm today',
        'tomorrow': '8am tomorrow',
        'later-this-week': '3 days from now',
        'this-weekend': '8am Saturday',
        'next-week': '8am next Monday',
        'couple-weeks': '2 weeks from now',
        'next-month': '30 days from now',
        'someday': 'Indefinitely'
      };

      Object.entries(options).forEach(([key, expectedLabel]) => {
        const result = timeCalculator.getSnoozeOptionLabel(key);
        expect(result).toBe(expectedLabel);
      });
    });

    test('should return the option itself for unknown options', () => {
      const result = timeCalculator.getSnoozeOptionLabel('unknown-option');
      expect(result).toBe('unknown-option');
    });
  });
});

// Additional utility tests
describe('Utility Functions', () => {
  let timeCalculator;

  beforeEach(() => {
    timeCalculator = new TimeCalculator();
  });

  test('addHours should add hours correctly', () => {
    const baseDate = new Date('2025-07-17T12:00:00Z');
    const result = timeCalculator.addHours(baseDate, 3);
    const expected = new Date('2025-07-17T15:00:00Z');
    expect(result.getTime()).toBe(expected.getTime());
  });

  test('addDays should add days correctly', () => {
    const baseDate = new Date('2025-07-17T12:00:00Z');
    const result = timeCalculator.addDays(baseDate, 3);
    const expected = new Date('2025-07-20T12:00:00Z');
    expect(result.getTime()).toBe(expected.getTime());
  });

  test('addWeeks should add weeks correctly', () => {
    const baseDate = new Date('2025-07-17T12:00:00Z');
    const result = timeCalculator.addWeeks(baseDate, 2);
    const expected = new Date('2025-07-31T12:00:00Z');
    expect(result.getTime()).toBe(expected.getTime());
  });
});

// Integration test for the complete flow
describe('Integration Tests', () => {
  test('should handle complete snooze flow', () => {
    const timeCalculator = new TimeCalculator();
    
    // Calculate snooze time
    const snoozeTime = timeCalculator.calculateUnsnoozeTime('later-today');
    
    // Format the time
    const formatted = timeCalculator.formatUnsnoozeTime(snoozeTime);
    
    // Get time until unsnooze
    const timeUntil = timeCalculator.getTimeUntilUnsnooze(snoozeTime);
    
    // All should be valid
    expect(snoozeTime).toBeGreaterThan(Date.now());
    expect(formatted).toBeTruthy();
    expect(timeUntil).toBeTruthy();
    expect(timeUntil).not.toBe('Overdue');
  });
});
