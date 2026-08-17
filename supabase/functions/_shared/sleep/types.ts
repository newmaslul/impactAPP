// Shared types for the Sleep Estimation Engine. This is explicitly a
// Sleep ESTIMATION Engine, not a medical device — every result carries
// estimatedSleepMinutes + confidenceScore + source, never a bare number
// presented as certain (§24).

export type SleepSource = 'phone_sensor' | 'healthkit' | 'health_connect' | 'wearable' | 'manual';

export interface SleepSample {
  timestamp: string; // ISO
  screenActivity: number; // 0..1
  touchActivity: number; // 0..1
  motionActivity: number; // 0..1
  appActivity: number; // 0..1 — always 0 from a website; see README platform-constraints section
  charging: boolean | null; // null = unknown (Battery Status API unavailable on most current browsers)
  source: SleepSource;
}

export interface SleepWindow {
  startTime: string;
  endTime: string;
  screenActivity: number;
  touchActivity: number;
  motionActivity: number;
  appActivity: number;
  charging: number; // 0/1/0.5(unknown), numeric for use directly in the formula
  sleepProbability: number; // 0..1
  awakeProbability: number; // 0..1
  isGapFilled: boolean; // true when no real sample existed for this window
}

export type ConfidenceStatus = 'LOW_CONFIDENCE' | 'ESTIMATED' | 'GOOD';

export interface ConfidenceBreakdown {
  sensorQuality: number; // 0..1
  signalContinuity: number; // 0..1
  screenReliability: number; // 0..1
  usageReliability: number; // 0..1
  chargingReliability: number; // 0..1
  confidenceScore: number; // 0..100, rounded
  band: 'HIGH' | 'GOOD' | 'MEDIUM' | 'LOW';
}

export interface AwakePeriod {
  start: string;
  end: string;
  movementOnly: boolean; // true = motion without phone use — not counted as a real interruption
}

export interface SleepSessionResult {
  sleepStart: string | null;
  sleepEnd: string | null;
  timeInBedMinutes: number;
  estimatedSleepMinutes: number;
  awakeMinutes: number;
  interruptions: number; // count of real (non movementOnly) awake periods within the session
  awakePeriods: AwakePeriod[];
}

export interface SleepConfigValues {
  sleepProbabilityThreshold: number;
  minSleepWindows: number;
  windowSizeMinutes: number;
  awakeProbabilityThreshold: number;
  minAwakeWindows: number;
}

export interface AgeBand {
  minAge: number;
  maxAge: number;
  targetMinHours: number;
  targetMaxHours: number;
}

export interface DailyScoreBreakdown {
  activityScore: number | null;
  sleepScore: number | null;
  stepsScore: number | null;
  consistencyScore: number | null;
  dailyScore: number | null;
}
