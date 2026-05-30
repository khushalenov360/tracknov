/**
 * Tracknov Enterprise Telemetry Layer
 * Standardized contracts and streams for system audit logs, metrics, and compliance events.
 */

export interface SystemTelemetryEvent {
  id: string;
  timestamp: string;
  subsystem: string;
  severity: "INFO" | "WARN" | "ERROR" | "CRITICAL";
  event: string;
  replaySafe: boolean;
  tenantScoped: boolean;
  payload: Record<string, unknown>;
}

export class TelemetryLogger {
  /**
   * Dispatches a standardized telemetry event to the system audit streams.
   */
  public static log(event: Omit<SystemTelemetryEvent, "id" | "timestamp">): SystemTelemetryEvent {
    const fullEvent: SystemTelemetryEvent = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      ...event,
    };

    // Output to system console with uniform tagging
    const logPrefix = `📊 [TELEMETRY::${fullEvent.severity}::${fullEvent.subsystem}]`;
    const message = `${fullEvent.event} (ReplaySafe: ${fullEvent.replaySafe}, TenantScoped: ${fullEvent.tenantScoped})`;
    
    if (fullEvent.severity === "ERROR" || fullEvent.severity === "CRITICAL") {
      console.error(`${logPrefix} ${message}`, JSON.stringify(fullEvent.payload));
    } else if (fullEvent.severity === "WARN") {
      console.warn(`${logPrefix} ${message}`, JSON.stringify(fullEvent.payload));
    } else {
      console.log(`${logPrefix} ${message}`, JSON.stringify(fullEvent.payload));
    }

    return fullEvent;
  }
}
