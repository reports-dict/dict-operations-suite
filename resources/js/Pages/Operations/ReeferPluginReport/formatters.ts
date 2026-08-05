export function formatHoursMinutes(totalHours: number) {
    const totalMinutes = Math.round(totalHours * 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    return `${hours.toLocaleString()} hrs ${minutes} min`;
}
