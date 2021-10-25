import {createDateFromUtcIsoFormat} from 'augment-vir';
import {isSanitizerMode} from '../global';

/**
 * Creates a date object that's between the two dates given. If a valid date cannot be created with
 * the given inputs, a date is created that is at least earlier than the given endDate.
 *
 * @param startDate Optional. The earlier (date wise) bounds for creating the new Date object. If
 *   this is not provided, a date is created that is as close to, but earlier than, the given endDate.
 * @param endDate Required. The later bounds for creating the new Date object.
 * @param monthNumber Month number for the new Date object. This is 1 indexed. So a `1` here
 *   corresponds to January.
 * @param dayNumber Number for the month for the new Date object. This is 1 indexed; the first day
 *   of the mont is `1`.
 */
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
        const newDate = createDateFromUtcIsoFormat(`${endDate.getUTCFullYear()}-${month}-${day}`);
        if (newDate <= endDate) {
            return newDate;
        } else {
            return createDateFromUtcIsoFormat(`${endDate.getUTCFullYear() - 1}-${month}-${day}`);
        }
    } else if (startDate) {
        const dateFromStartYear = createDateFromUtcIsoFormat(
            `${startDate.getUTCFullYear()}-${month}-${day}`,
        );
        const dateFromStartYearPlus = createDateFromUtcIsoFormat(
            `${startDate.getUTCFullYear() + 1}-${month}-${day}`,
        );
        const dateFromEndYear = createDateFromUtcIsoFormat(
            `${endDate.getUTCFullYear()}-${month}-${day}`,
        );
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
