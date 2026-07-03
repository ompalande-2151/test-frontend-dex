export function bucketTime(
  timestamp: number,
  timeframeInSeconds: number,
): number {
  return Math.floor(timestamp / timeframeInSeconds) * timeframeInSeconds;
}
