export function truncateToHour(date: Date): Date {
  const truncated = new Date(date);
  truncated.setMinutes(0, 0, 0);
  return truncated;
}

export function parseDurationToSeconds(value?: string | number, defaultSeconds = 900): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value !== 'string' || value.trim().length === 0) {
    return defaultSeconds;
  }
  const normalized = value.trim().toLowerCase();
  const match = normalized.match(/^(\d+)(s|m|h|d)?$/);
  if (!match) {
    return defaultSeconds;
  }
  const amount = Number.parseInt(match[1], 10);
  const unit = match[2] ?? 's';
  switch (unit) {
    case 'd':
      return amount * 86400;
    case 'h':
      return amount * 3600;
    case 'm':
      return amount * 60;
    default:
      return amount;
  }
}
