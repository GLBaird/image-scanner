import type { Timestamp } from '../generated/google/protobuf/Timestamp';

/**
 * Convert a JS Date to protobuf Timestamp
 * @param date
 * @returns
 */
export function toTimestamp(date: Date): Timestamp {
    const ms = date.getTime(); // milliseconds since 1970-01-01T00:00:00Z
    let seconds = Math.floor(ms / 1_000);
    let nanos = (ms % 1_000) * 1_000_000; // remainder → nanoseconds

    // For negative dates ensure nanos is non-negative (spec requires 0 ≤ nanos < 1e9)
    if (nanos < 0) {
        nanos += 1_000_000_000;
        seconds -= 1;
    }

    return { seconds, nanos };
}

/**
 * Convert a protobuf Timestamp back into a JS Date
 * @param ts
 * @returns
 */
export function fromTimestamp(ts: Timestamp): Date {
    // `seconds` may be number | string; Number() safely converts both
    const seconds = Number(ts.seconds ?? 0);
    const nanos = ts.nanos ?? 0;

    const millis = seconds * 1_000 + Math.floor(nanos / 1_000_000);
    return new Date(millis);
}
