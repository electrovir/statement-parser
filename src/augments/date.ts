import {isSanitizerMode} from '../global';
const longMonthNames = [
    'january',
    'february',
    'march',
    'april',
    'may',
    'june',
    'july',
    'august',
    'september',
    'october',
    'november',
    'december',
];

const shortMonthNames = longMonthNames.map((longMonthName) => longMonthName.slice(0, 3));

export class InvalidDateError extends Error {
    public override readonly name = 'InvalidDateError';
}

export function dateFromSlashFormat(input: string, yearPrefix: number | string = '') {
    const [month, day, rawYearEnding = ''] = input.split('/');

    if (!month || !day) {
        throw new Error(`Unable to extract month or day from "${input}"`);
    }

    const yearEnding =
        rawYearEnding.length < 4 ? `${yearPrefix}${rawYearEnding.padStart(2, '0')}` : rawYearEnding;

    const returnDate = createUtcDate(
        `${yearEnding.padStart(4, '0')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`,
    );
    return returnDate;
}

export function dateFromNamedCommaFormat(input: string) {
    const [monthName, dayNumber, fullYear] = input.replace(',', '').split(' ');
    if (!monthName || !dayNumber || !fullYear) {
        throw new InvalidDateError(`Invalid ${dateFromNamedCommaFormat.name} input: ${input}`);
    }

    const longMonthIndex = longMonthNames.indexOf(monthName.toLowerCase());
    const shortMonthIndex = shortMonthNames.indexOf(monthName.toLowerCase());

    let monthIndex = longMonthIndex === -1 ? shortMonthIndex : longMonthIndex;

    if (monthIndex === -1) {
        if (isSanitizerMode()) {
            monthIndex = 4;
        } else {
            throw new InvalidDateError(`Month name ${monthName} was not found.`);
        }
    }

    const returnDate = createUtcDate(
        `${fullYear.padStart(4, '0')}-${String(monthIndex + 1).padStart(
            2,
            '0',
        )}-${dayNumber.padStart(2, '0')}`,
    );

    return returnDate;
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
            if (isSanitizerMode()) {
                return dateFromStartYear;
            } else {
                throw new Error(
                    `Invalid potential dates generated, none fit between start and end: ${errorString}`,
                );
            }
        }
    } else {
        throw new Error(`Invalid inputs: ${errorString}`);
    }
}
