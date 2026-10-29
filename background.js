// Service worker entry point for Snoozed Tabs
import { SnoozeService } from './background/snoozeService.js';

new SnoozeService().start();
