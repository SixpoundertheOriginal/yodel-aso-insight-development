export const TRAFFIC_SOURCE_COLORS = {
  'Web Referrer': '#FF6B6B',        // Red
  'App Store Search': '#4ECDC4',     // Teal
  'App Referrer': '#45B7D1',        // Blue
  'Apple Search Ads': '#96CEB4',     // Green
  'App Store Browse': '#FFA726',     // Orange
  'Other': '#9E9E9E',               // Gray
  'Institutional Purchase': '#8E24AA', // Purple
  'Event Notification': '#FF7043'    // Deep Orange
} as const;

export type TrafficSourceName = keyof typeof TRAFFIC_SOURCE_COLORS;

export function getTrafficSourceColor(sourceName: string): string {
  return TRAFFIC_SOURCE_COLORS[sourceName as TrafficSourceName] || TRAFFIC_SOURCE_COLORS['Other'];
}
