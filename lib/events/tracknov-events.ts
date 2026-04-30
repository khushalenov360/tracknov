export const TracknovEvents = {
  DocumentUploaded: "document.uploaded",
  DocumentStatusUpdated: "document.status_updated",
  DocumentDeleted: "document.deleted",
  ProjectUpdated: "project.updated",
  BillingUpdated: "billing.updated",
} as const;

export type TracknovEventName = (typeof TracknovEvents)[keyof typeof TracknovEvents];

