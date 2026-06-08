export type EnvironmentType = 'development' | 'staging' | 'production';

export interface EnvironmentConfig {
  type: EnvironmentType;
  isProduction: boolean;
  isStaging: boolean;
  isDevelopment: boolean;
  
  // Security & Governance
  secretRotationDays: number;
  auditLevel: 'minimal' | 'standard' | 'forensic';
  replaySafety: 'loose' | 'strict' | 'immutable';
  
  // Feature Flags
  aiAdvisoryOnly: boolean;
  exportWatermark: boolean;
  demoMode: boolean;
}

const DEFAULTS = {
  secretRotationDays: 90,
  auditLevel: 'standard',
  replaySafety: 'strict',
  aiAdvisoryOnly: true,
  exportWatermark: true,
  demoMode: false,
} as const;

export function getEnvironmentConfig(): EnvironmentConfig {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const appEnv = (process.env.NEXT_PUBLIC_APP_ENV || nodeEnv) as EnvironmentType;

  switch (appEnv) {
    case 'production':
      return {
        ...DEFAULTS,
        type: 'production',
        isProduction: true,
        isStaging: false,
        isDevelopment: false,
        auditLevel: 'forensic',
        replaySafety: 'immutable',
        exportWatermark: false, // Production exports are clean
      };
    case 'staging':
      return {
        ...DEFAULTS,
        type: 'staging',
        isProduction: false,
        isStaging: true,
        isDevelopment: false,
        auditLevel: 'standard',
        replaySafety: 'strict',
        exportWatermark: true,
      };
    default:
      return {
        ...DEFAULTS,
        type: 'development',
        isProduction: false,
        isStaging: false,
        isDevelopment: true,
        auditLevel: 'minimal',
        replaySafety: 'loose',
        demoMode: true,
      };
  }
}

export const envConfig = getEnvironmentConfig();
