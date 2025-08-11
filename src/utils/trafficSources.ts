export function toggleTrafficSourceExclusion(
  sources: string[],
  sourceToToggle: string,
  exclude: boolean
): string[] {
  if (exclude) {
    return sources.filter((src) => src !== sourceToToggle);
  }
  if (sources.length > 0 && !sources.includes(sourceToToggle)) {
    return [...sources, sourceToToggle];
  }
  return sources;
}
