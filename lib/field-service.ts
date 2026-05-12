export const FIELD_SERVICE_STATUSES = [
  "NEW_CALLOUT",
  "SCHEDULED",
  "TECHNICIAN_ASSIGNED",
  "TECHNICIAN_ON_THE_WAY",
  "ARRIVED_ON_SITE",
  "WORK_IN_PROGRESS",
  "WAITING_FOR_PARTS",
  "WAITING_FOR_CUSTOMER",
  "COMPLETED",
  "CANCELLED",
] as const;

export const ACTIVE_FIELD_STATUSES = [
  "NEW_CALLOUT",
  "SCHEDULED",
  "TECHNICIAN_ASSIGNED",
  "TECHNICIAN_ON_THE_WAY",
  "ARRIVED_ON_SITE",
  "WORK_IN_PROGRESS",
  "WAITING_FOR_PARTS",
  "WAITING_FOR_CUSTOMER",
] as const;

export const RUNNING_LATE_EXCLUDED_STATUSES = new Set([
  "ARRIVED_ON_SITE",
  "WORK_IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
  "CLOSED",
]);

export const formatFieldStatus = (status?: string | null) =>
  (status || "NEW_CALLOUT")
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

export const getCalloutScheduledTime = (job: {
  scheduledTime?: Date | string | null;
  preferredCalloutDate?: Date | string | null;
}) => {
  const value = job.scheduledTime || job.preferredCalloutDate;
  return value ? new Date(value) : null;
};

export const isRunningLate = (job: {
  status?: string | null;
  scheduledTime?: Date | string | null;
  preferredCalloutDate?: Date | string | null;
}) => {
  const scheduledTime = getCalloutScheduledTime(job);
  if (!scheduledTime || RUNNING_LATE_EXCLUDED_STATUSES.has(job.status || "")) {
    return false;
  }

  return Date.now() - scheduledTime.getTime() > 15 * 60 * 1000;
};

export const isWithinQuietHours = (date = new Date()) => {
  const hour = date.getHours();
  return hour >= 21 || hour < 7;
};

export const nextQuietHoursSendTime = (date = new Date()) => {
  const next = new Date(date);
  if (date.getHours() >= 21) {
    next.setDate(next.getDate() + 1);
  }
  next.setHours(7, 0, 0, 0);
  return next;
};

export const FIELD_NOTE_TYPES = [
  "Site Visit",
  "Diagnosis",
  "Work Completed",
  "Parts Required",
  "Customer Comment",
  "Internal Note",
] as const;

export const FIELD_PHOTO_CATEGORIES = [
  "Before Repair",
  "During Repair",
  "After Repair",
  "Appliance Serial Plate",
  "Damage Evidence",
  "Parts Used",
] as const;
