// Shared shape for sleep-stage providers (§17: sleep stages — light/core/
// deep/REM — are NEVER guessed from phone-only sensor data; they only
// ever come from a real platform integration that reports them directly).

export interface SleepStageReading {
  start: string; // ISO
  end: string; // ISO
  awakeMinutes: number;
  lightMinutes: number | null;
  coreMinutes: number | null;
  deepMinutes: number | null;
  remMinutes: number | null;
}

export interface SleepStageProvider {
  id: 'healthkit' | 'health_connect' | 'wearable';
  available: boolean;
  reason: string; // honest, user-facing explanation for why it's unavailable today
  fetchLatest(): Promise<SleepStageReading | null>;
}
