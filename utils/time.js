export class TimeCalculator {
  constructor() {
    this.snoozeOptions = {
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
  }

  calculateUnsnoozeTime(snoozeOption) {
    const now = new Date();
    
    switch (snoozeOption) {
      case 'later-today':
        return this.addHours(now, 3).getTime();
        
      case 'tonight':
        return this.setTimeToday(now, 18, 0).getTime(); // 6pm today
        
      case 'tomorrow':
        return this.setTimeTomorrow(now, 8, 0).getTime(); // 8am tomorrow
        
      case 'later-this-week':
        return this.addDays(now, 3).getTime();
        
      case 'this-weekend':
        return this.getNextSaturday(now, 8, 0).getTime(); // 8am Saturday
        
      case 'next-week':
        return this.getNextMonday(now, 8, 0).getTime(); // 8am next Monday
        
      case 'couple-weeks':
        return this.addWeeks(now, 2).getTime();
        
      case 'next-month':
        return this.addDays(now, 30).getTime();
        
      case 'someday':
        return new Date('2099-12-31').getTime(); // Far future date
        
      default:
        return this.addHours(now, 3).getTime();
    }
  }

  addHours(date, hours) {
    const result = new Date(date);
    result.setHours(result.getHours() + hours);
    return result;
  }

  addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  addWeeks(date, weeks) {
    return this.addDays(date, weeks * 7);
  }

  setTimeToday(date, hours, minutes) {
    const result = new Date(date);
    result.setHours(hours, minutes, 0, 0);
    
    // If the time has already passed today, set it for tomorrow
    if (result <= date) {
      result.setDate(result.getDate() + 1);
    }
    
    return result;
  }

  setTimeTomorrow(date, hours, minutes) {
    const result = new Date(date);
    result.setDate(result.getDate() + 1);
    result.setHours(hours, minutes, 0, 0);
    return result;
  }

  getNextSaturday(date, hours, minutes) {
    const result = new Date(date);
    const dayOfWeek = result.getDay();
    const daysUntilSaturday = dayOfWeek === 6 ? 7 : 6 - dayOfWeek;
    
    result.setDate(result.getDate() + daysUntilSaturday);
    result.setHours(hours, minutes, 0, 0);
    
    return result;
  }

  getNextMonday(date, hours, minutes) {
    const result = new Date(date);
    const dayOfWeek = result.getDay();
    const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
    
    result.setDate(result.getDate() + daysUntilMonday);
    result.setHours(hours, minutes, 0, 0);
    
    return result;
  }

  formatUnsnoozeTime(timestamp) {
    if (timestamp === new Date('2099-12-31').getTime()) {
      return 'Someday';
    }
    
    const date = new Date(timestamp);
    const now = new Date();
    
    const isToday = date.toDateString() === now.toDateString();
    const isTomorrow = date.toDateString() === new Date(now.getTime() + 24 * 60 * 60 * 1000).toDateString();
    
    if (isToday) {
      return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (isTomorrow) {
      return `Tomorrow at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      return date.toLocaleString([], { 
        month: 'short', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    }
  }

  getSnoozeOptionLabel(option) {
    return this.snoozeOptions[option] || option;
  }

  getTimeUntilUnsnooze(timestamp) {
    const now = Date.now();
    const diff = timestamp - now;
    
    if (diff <= 0) return 'Overdue';
    
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      return `${days} day${days > 1 ? 's' : ''}`;
    } else if (hours > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''}`;
    } else {
      return `${minutes} minute${minutes > 1 ? 's' : ''}`;
    }
  }
}
