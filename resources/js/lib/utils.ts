export function cn(...classes: Array<string | false | null | undefined>): string {
    return classes.filter(Boolean).join(' ');
}

const ACTIVE_THRESHOLD_MS = 5 * 60 * 1000;
const relativeTimeFormatter = new Intl.RelativeTimeFormat('en', { numeric: 'always' });

/**
 * "Active now" if seen within the last 5 minutes, otherwise a relative
 * "X ago" string (or "Never" if they've never logged in).
 */
export function describeActivity(lastSeenAt: string | null): { active: boolean; label: string } {
    if (!lastSeenAt) {
        return { active: false, label: 'Never' };
    }

    const diffMs = Date.now() - new Date(lastSeenAt).getTime();

    if (diffMs < ACTIVE_THRESHOLD_MS) {
        return { active: true, label: 'Active now' };
    }

    const minutes = Math.round(diffMs / 60_000);
    if (minutes < 60) {
        return { active: false, label: relativeTimeFormatter.format(-minutes, 'minute') };
    }

    const hours = Math.round(minutes / 60);
    if (hours < 24) {
        return { active: false, label: relativeTimeFormatter.format(-hours, 'hour') };
    }

    const days = Math.round(hours / 24);
    return { active: false, label: relativeTimeFormatter.format(-days, 'day') };
}
