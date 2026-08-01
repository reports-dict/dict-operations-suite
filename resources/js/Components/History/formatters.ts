const PH_FORMATTER = new Intl.DateTimeFormat('en-PH', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Manila',
});

export function formatPH(value: string | null | undefined): string {
    if (!value) return '—';
    try {
        return PH_FORMATTER.format(new Date(value));
    } catch {
        return value;
    }
}
