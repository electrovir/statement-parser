export function dateFromSlashFormat(input: string, yearPrefix: number) {
    const [month, day, yearEnding] = input.split('/');
    return new Date(`${yearPrefix}${yearEnding}-${month}-${day}`);
}

export function dateWithinRange(
    startDate: Date | undefined,
    endDate: Date,
    monthNumber: number,
    dayNumber: Number,
): Date {
    const errorString = `Invalid date input: ${JSON.stringify({
        startDate,
        endDate,
        monthNumber,
        dayNumber,
    })}`;
    const month = monthNumber < 10 ? `0${monthNumber}` : String(monthNumber);
    const day = dayNumber < 10 ? `0${dayNumber}` : String(dayNumber);

    if (!startDate || startDate.getFullYear() === endDate.getFullYear()) {
        const newDate = new Date(`${endDate.getFullYear()}-${month}-${day}`);
        if (newDate <= endDate) {
            return newDate;
        } else {
            return new Date(`${endDate.getFullYear() - 1}-${month}-${day}`);
        }
    } else if (startDate) {
        const dateFromStartYear = new Date(`${startDate.getFullYear()}-${month}-${day}`);
        const dateFromEndYear = new Date(`${endDate.getFullYear()}-${month}-${day}`);
        if (dateFromStartYear <= endDate && startDate <= dateFromStartYear) {
            return dateFromStartYear;
        } else if (dateFromEndYear <= endDate && startDate <= dateFromEndYear) {
            return dateFromEndYear;
        } else {
            throw new Error(errorString);
        }
    } else {
        throw new Error(errorString);
    }
}
