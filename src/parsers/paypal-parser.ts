import {readPdf} from '../readPdf';
import {flatten2dArray} from '../util/array';
import {collapseSpaces, sanitizeNumberString} from '../util/string';
import {createParserStateMachine, ParsedOutput, ParsedTransaction, PdfParse} from './base-parser';

enum State {
    HEADER = 'header',
    HEADER_DATA = 'header-data',
    ACTIVITY = 'activity',
    EXPENSE_INSIDE = 'expense-inside',
    INCOME_INSIDE = 'income-inside',
    ACTIVITY_HEADER = 'activity-header',
    END = 'end',
}

export type PaypalTransaction = ParsedTransaction & {
    baseAmount: number;
    fees: number;
};

export type PaypalOutput = ParsedOutput<PaypalTransaction>;

/** @param yearPrefix This is ignored in this parser because PayPal statements include the entire year */
export const paypalParse: PdfParse<PaypalOutput> = async (filePath: string, yearPrefix: number) => {
    const initOutput: PaypalOutput = {
        expenses: [],
        incomes: [],
        filePath,
        accountSuffix: '',
    };

    const lines: string[] = flatten2dArray(await readPdf(filePath));

    const parser = createParserStateMachine<State, string, PaypalOutput>({
        action: performStateAction,
        next: nextState,
        initialState: State.HEADER,
        endState: State.END,
        yearPrefix,
        initOutput,
    });

    const output = parser(lines);
    return output;
};

const headerDataLineRegExp = /(\w{3} \d{1,2}, \d{4})\s*-\s*(\w{3} \d{1,2}, \d{4})\s*(.+)$/i;
const transactionStartRegExp =
    /^(\d{2}\/\d{2}\/\d{4})\s+(.+?)USD\s+([-,.\d]+)\s+([-,.\d]+)\s+([-,.\d]+)$/i;

function performStateAction(
    currentState: State,
    line: string,
    yearPrefix: number,
    output: PaypalOutput,
) {
    if (currentState === State.HEADER_DATA && !output.startDate) {
        const match = line.match(headerDataLineRegExp);
        if (match) {
            const [, startDate, endDate, accountId] = match;
            output.startDate = new Date(startDate);
            output.endDate = new Date(endDate);
            output.accountSuffix = accountId;
        }
    } else if (currentState === State.ACTIVITY) {
        const match = line.match(transactionStartRegExp);
        if (match) {
            const [, date, description, amountString, fees, total] = match;
            const amount = Number(sanitizeNumberString(amountString));
            const newTransaction: PaypalTransaction = {
                date: new Date(date),
                description: collapseSpaces(description),
                // this assumption that we can always use absolute value here may be wrong
                amount: Math.abs(Number(sanitizeNumberString(total))),
                fees: Math.abs(Number(sanitizeNumberString(fees))),
                baseAmount: Math.abs(amount),
            };
            const array = amount < 0 ? output.expenses : output.incomes;

            array.push(newTransaction);
        }
    } else if (currentState === State.EXPENSE_INSIDE && line !== '') {
        output.expenses[output.expenses.length - 1].description += collapseSpaces(line);
    } else if (currentState === State.INCOME_INSIDE && line !== '') {
        output.incomes[output.incomes.length - 1].description += ' ' + collapseSpaces(line);
    }

    return output;
}

const pageEndRegExp = /^page\s+\d+$/i;
const activityHeader = /date\s+description\s+currency\s+amount\s+fees\s+total/i;

function nextState(currentState: State, line: string): State {
    line = line.toLowerCase();

    if (line.includes('you must notify us no later than')) {
        return State.END;
    }

    switch (currentState) {
        case State.HEADER:
            if (line.includes('statement period')) {
                return State.HEADER_DATA;
            } else if (line.match(activityHeader)) {
                return State.ACTIVITY_HEADER;
            }
            break;
        case State.ACTIVITY_HEADER:
            if (line === '') {
                return State.ACTIVITY;
            }
            break;
        case State.HEADER_DATA:
            return State.HEADER;
        case State.EXPENSE_INSIDE:
            if (line === '') {
                return State.ACTIVITY;
            }
            break;
        case State.INCOME_INSIDE:
            if (line === '') {
                return State.ACTIVITY;
            }
            break;
        case State.ACTIVITY:
            const match = line.match(transactionStartRegExp);
            if (match) {
                if (Number(sanitizeNumberString(match[5])) < 0) {
                    return State.EXPENSE_INSIDE;
                } else {
                    return State.INCOME_INSIDE;
                }
            } else if (line.match(pageEndRegExp)) {
                return State.HEADER;
            }
            break;
        case State.END:
            break;
    }

    return currentState;
}
