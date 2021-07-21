export function dateFromSlashFormat(input: string, yearPrefix: number) {
    const [month, day, yearEnding] = input.split('/');
    const returnDate = createUtcDate(
        `${yearPrefix}${yearEnding.padStart(2, '0')}-${month.padStart(2, '0')}-${day.padStart(
            2,
            '0',
        )}`,
    );
    return returnDate;
}

export class InvalidDateError extends Error {
    public readonly name = 'InvalidDateError';
}

export function createUtcDate(isoFormatString: string) {
    const utcDate = new Date(isoFormatString + 'T00:00:00.000Z');

    if (isNaN(Number(utcDate))) {
        throw new InvalidDateError(`Invalid utc date formed from input "${isoFormatString}"`);
    }
    return utcDate;
}

export function dateWithinRange(
    startDate: Date | undefined,
    endDate: Date,
    monthNumber: number,
    dayNumber: Number,
): Date {
    const errorString = `${JSON.stringify({
        startDate,
        endDate,
        monthNumber,
        dayNumber,
    })}`;
    const month = monthNumber < 10 ? `0${monthNumber}` : String(monthNumber);
    const day = dayNumber < 10 ? `0${dayNumber}` : String(dayNumber);

    if (!startDate || startDate.getUTCFullYear() === endDate.getUTCFullYear()) {
        const newDate = createUtcDate(`${endDate.getUTCFullYear()}-${month}-${day}`);
        if (newDate <= endDate) {
            return newDate;
        } else {
            return createUtcDate(`${endDate.getUTCFullYear() - 1}-${month}-${day}`);
        }
    } else if (startDate) {
        const dateFromStartYear = createUtcDate(`${startDate.getUTCFullYear()}-${month}-${day}`);
        const dateFromStartYearPlus = createUtcDate(
            `${startDate.getUTCFullYear() + 1}-${month}-${day}`,
        );
        const dateFromEndYear = createUtcDate(`${endDate.getUTCFullYear()}-${month}-${day}`);
        if (dateFromStartYear <= endDate && startDate <= dateFromStartYear) {
            return dateFromStartYear;
        } else if (dateFromEndYear <= endDate && startDate <= dateFromEndYear) {
            return dateFromEndYear;
        } else if (dateFromStartYearPlus <= endDate && startDate <= dateFromStartYearPlus) {
            return dateFromStartYearPlus;
        } else {
            throw new Error(
                `Invalid potential dates generated, none fit between start and end: ${errorString}`,
            );
        }
    } else {
        throw new Error(`Invalid inputs: ${errorString}`);
    }
}
