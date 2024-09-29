export function calculateNotificationDate(
  targetDate: Date,
  periodInDays: string,
) {
  // Parse the target date string into a Date object
  const target = new Date(targetDate);

  // Calculate the notification date by subtracting the period from the target date
  const notificationDate = new Date(
    target.getTime() - Number(periodInDays) * 24 * 60 * 60 * 1000,
  );

  return notificationDate;
}

export function convertToDateTime(dateString: string): string {
  const dateFormats = [
    /^\d{4}\/\d{1,2}\/\d{1,2}$/, // e.g., 2024/8/30 or 2024/08/30
    /^\d{1,2}\/\d{1,2}\/\d{4}$/, // e.g., 8/30/2024
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/, // e.g., 2024-08-30T00:00:00.000Z
  ];

  if (dateFormats[0].test(dateString)) {
    // Format: YYYY/MM/DD
    const [year, month, day] = dateString.split('/').map(Number);
    return new Date(Date.UTC(year, month - 1, day)).toISOString();
  } else if (dateFormats[1].test(dateString)) {
    // Format: MM/DD/YYYY
    const [month, day, year] = dateString.split('/').map(Number);
    return new Date(Date.UTC(year, month - 1, day)).toISOString();
  } else if (dateFormats[2].test(dateString)) {
    // Format: YYYY-MM-DDTHH:mm:ss.sssZ (already ISO 8601)
    return dateString;
  } else {
    throw new Error('Invalid date format');
  }
}
