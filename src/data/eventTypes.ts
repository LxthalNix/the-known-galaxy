export const eventTypes = ['political', 'military', 'discovery', 'personal', 'other'] as const;

export type EventType = (typeof eventTypes)[number];
