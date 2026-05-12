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

export const calculateStraightLineDistanceKm = (
  from: { latitude?: number | null; longitude?: number | null },
  to: { latitude?: number | null; longitude?: number | null }
) => {
  if (
    typeof from.latitude !== "number" ||
    typeof from.longitude !== "number" ||
    typeof to.latitude !== "number" ||
    typeof to.longitude !== "number"
  ) {
    return null;
  }

  const toRadians = (degrees: number) => degrees * (Math.PI / 180);
  const earthRadiusKm = 6371;
  const latDelta = toRadians(to.latitude - from.latitude);
  const lngDelta = toRadians(to.longitude - from.longitude);
  const startLat = toRadians(from.latitude);
  const endLat = toRadians(to.latitude);
  const haversine =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos(startLat) * Math.cos(endLat) * Math.sin(lngDelta / 2) ** 2;

  return 2 * earthRadiusKm * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
};

export const estimateTravelTimeFromDistance = (distanceKm?: number | null) => {
  if (typeof distanceKm !== "number") {
    return null;
  }

  const minutes = Math.max(5, Math.round((distanceKm / 35) * 60));
  if (minutes < 60) {
    return `Approx. ${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes ? `Approx. ${hours} hr ${remainingMinutes} min` : `Approx. ${hours} hr`;
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
