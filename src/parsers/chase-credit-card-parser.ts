import {createParserStateMachine, ParsedTransaction, PdfParse, ParsedOutput} from './base-parser';
import {flatten2dArray} from '../util/array';
import {dateFromSlashFormat, dateWithinRange} from '../util/date';
import {collapseSpaces, sanitizeNumberString} from '../util/string';
import {readPdf} from '../readPdf';

enum State {
    HEADER = 'header',
    PAYMENT = 'payment',
    PURCHASE = 'purchase',
    /**
     * For page boundaries between multiple pages
     */
    PAYMENT_PAGE_BOUNDARY = 'payment-page-boundary',
    PURCHASE_PAGE_BOUNDARY = 'purchase-page-boundary',
    END = 'end',
}

/**
 * @param yearPrefix       The first two digits of the current year.
 *                         Example: for the year 2010, use 20. For 1991, use 19.
 **/
export const chaseCreditCardParse: PdfParse<ParsedOutput> = async (filePath: string, yearPrefix: number) => {
    const initOutput: ParsedOutput = {
        incomes: [],
        expenses: [],
        accountSuffix: '',
        filePath,
        startDate: undefined,
        endDate: undefined,
    };

    const lines: string[] = flatten2dArray(await readPdf(filePath));

    const parser = createParserStateMachine<State, string, ParsedOutput>(
        performStateAction,
        nextState,
        State.HEADER,
        State.END,
        yearPrefix,
        initOutput,
    );

    const output = parser(lines);
    return output;
};

function processTransactionLine(line: string, startDate: Date, endDate: Date): ParsedTransaction | string {
    const match = line.match(/^(\d{2}\/\d{2})\s+(\S.+?)\s+([\.\d,\-]+)$/);
    if (match) {
        const [, date, description, amount] = match;
        const [month, day] = date.split('/');

        // Chase statements sometimes include transactions a few days outside of the statement range
        const startDateWithWindow = new Date(Number(startDate));
        startDateWithWindow.setDate(startDateWithWindow.getDate() - 3);
        const endDateWithWindow = new Date(Number(endDate));
        endDateWithWindow.setDate(endDateWithWindow.getDate() + 3);

        return {
            amount: Number(sanitizeNumberString(amount)),
            description,
            date: dateWithinRange(startDateWithWindow, endDateWithWindow, Number(month), Number(day)),
        };
    } else {
        return line;
    }
}

const pageBoundaryRegex = /page\s*\d\s*of\s*\d\s+statement date:/i;

function shouldTransitionToPurchases(line: string): boolean {
    const normalizedLine = line.toLowerCase();
    return normalizedLine === 'purchase' || normalizedLine === 'purchases';
}

function isEndOfPurchases(line: string): boolean {
    return line.toLowerCase().includes('totals year-to-date');
}

function performStateAction(currentState: State, line: string, yearPrefix: number, output: ParsedOutput) {
    if (currentState === State.HEADER) {
        const closingDateMatch = line.match(
            /opening\/closing date\s+(\d{2}\/\d{2}\/\d{2})\s+-\s+(\d{2}\/\d{2}\/\d{2})/i,
        );
        const accountNumberMatch = line.match(/account number: .+(\d{4})$/i);
        if (closingDateMatch) {
            const [, startDateString, endDateString] = closingDateMatch;
            output.startDate = dateFromSlashFormat(startDateString, yearPrefix);
            output.endDate = dateFromSlashFormat(endDateString, yearPrefix);
        } else if (accountNumberMatch && !output.accountSuffix) {
            output.accountSuffix = accountNumberMatch[1];
        }
    } else if (
        (currentState === State.PAYMENT || currentState === State.PURCHASE) &&
        !isEndOfPurchases(line) &&
        !shouldTransitionToPurchases(line) &&
        !line.match(pageBoundaryRegex)
    ) {
        if (!output.endDate || !output.startDate) {
            throw new Error('Started reading transactions but got no start or end dates.');
        }

        const array = currentState === State.PAYMENT ? output.incomes : output.expenses;

        const result = processTransactionLine(line, output.startDate, output.endDate);

        if (typeof result === 'string') {
            if (!!result) {
                array[array.length - 1].description += '\n' + collapseSpaces(result);
            }
        } else {
            array.push(result);
        }
    }

    return output;
}

function nextState(currentState: State, line: string): State {
    line = line.toLowerCase();

    switch (currentState) {
        case State.HEADER:
            if (line === 'payments and other credits') {
                return State.PAYMENT;
            } else if (shouldTransitionToPurchases(line)) {
                return State.PURCHASE;
            }
            break;
        case State.PAYMENT:
            // this payment page boundary transition has not been tested
            if (line.match(pageBoundaryRegex)) {
                return State.PAYMENT_PAGE_BOUNDARY;
            } else if (shouldTransitionToPurchases(line)) {
                return State.PURCHASE;
            }
            break;
        case State.PAYMENT_PAGE_BOUNDARY:
            if (line.startsWith('payments')) {
                return State.PAYMENT;
            }
            break;
        case State.PURCHASE_PAGE_BOUNDARY:
            if (shouldTransitionToPurchases(line)) {
                return State.PURCHASE;
            }
            break;
        case State.PURCHASE:
            if (line.match(pageBoundaryRegex)) {
                return State.PURCHASE_PAGE_BOUNDARY;
            } else if (isEndOfPurchases(line)) {
                return State.END;
            }
            break;
    }

    return currentState;
}
