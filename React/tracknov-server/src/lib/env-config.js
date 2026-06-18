"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.envConfig = void 0;
exports.getEnvironmentConfig = getEnvironmentConfig;
const DEFAULTS = {
    secretRotationDays: 90,
    auditLevel: 'standard',
    replaySafety: 'strict',
    aiAdvisoryOnly: true,
    exportWatermark: true,
    demoMode: false,
};
function getEnvironmentConfig() {
    const nodeEnv = process.env.NODE_ENV || 'development';
    const appEnv = (process.env.APP_ENV || process.env.VITE_APP_ENV || nodeEnv);
    switch (appEnv) {
        case 'production':
            return Object.assign(Object.assign({}, DEFAULTS), { type: 'production', isProduction: true, isStaging: false, isDevelopment: false, auditLevel: 'forensic', replaySafety: 'immutable', exportWatermark: false });
        case 'staging':
            return Object.assign(Object.assign({}, DEFAULTS), { type: 'staging', isProduction: false, isStaging: true, isDevelopment: false, auditLevel: 'standard', replaySafety: 'strict', exportWatermark: true });
        default:
            return Object.assign(Object.assign({}, DEFAULTS), { type: 'development', isProduction: false, isStaging: false, isDevelopment: true, auditLevel: 'minimal', replaySafety: 'loose', demoMode: true });
    }
}
exports.envConfig = getEnvironmentConfig();
