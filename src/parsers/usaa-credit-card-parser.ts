import {createParserStateMachine, ParsedTransaction, PdfParse, ParsedOutput} from './base-parser';
import {dateFromSlashFormat, dateWithinRange} from '../util/date';
import {flatten2dArray} from '../util/array';
import {readPdf} from '../readPdf';
import {sanitizeNumberString} from '../util/string';

enum State {
    HEADER = 'header',
    PAYMENT_HEADER = 'payment-header',
    PAYMENT = 'payment',
    PAYMENT_FILLER = 'payment-filler',
    CREDIT_HEADER = 'credit-header',
    CREDIT = 'credit',
    CREDIT_FILLER = 'credit-filler',
    CREDIT_STARTED_FILLER = 'credit-started-filler',
    END = 'end',
}

export type UsaaCreditCardTransaction = ParsedTransaction & {
    postDate: Date;
    referenceNumber: string;
};

export type UsaaCreditOutput = ParsedOutput<UsaaCreditCardTransaction>;

/**
 * @param yearPrefix       The first two digits of the current year.
 *                         Example: for the year 2010, use 20. For 1991, use 19.
 **/
export const usaaCreditCardParse: PdfParse<UsaaCreditOutput> = async (filePath: string, yearPrefix: number) => {
    const initOutput: UsaaCreditOutput = {
        incomes: [],
        expenses: [],
        filePath,
        accountSuffix: '',
        endDate: undefined,
    };
    const lines: string[] = flatten2dArray(await readPdf(filePath));

    const parser = createParserStateMachine<State, string, UsaaCreditOutput>({
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

const transactionRegex = /^(\d{2}\/\d{2})\s+(\d{2}\/\d{2})\s+(\S.+?)\s+?(\S.+?)\s+\$((?:\d+|,|\.)+)\-?$/;

function processTransactionLine(line: string, endDate: Date): UsaaCreditCardTransaction | string {
    const match = line.match(transactionRegex);
    if (match) {
        const [, transactionDate, postDate, referenceNumber, description, amount] = match;
        const [transactionMonth, transactionDay] = transactionDate.split('/');
        const [postMonth, postDay] = postDate.split('/');
        return {
            date: dateWithinRange(undefined, endDate, Number(transactionMonth), Number(transactionDay)),
            postDate: dateWithinRange(undefined, endDate, Number(postMonth), Number(postDay)),
            amount: Number(sanitizeNumberString(amount)),
            description,
            referenceNumber,
        };
    } else {
        return line;
    }
}

const tableHeadersRegex = /^trans date\s*post date/i;
const creditsEndRegex = /(?:^\s*total transactions for)/i;
const paymentsEndRegex = /(?:^total payments and credits for this period\s+\$)|(?:^$)/i;

function performStateAction(currentState: State, line: string, yearPrefix: number, output: UsaaCreditOutput) {
    if (
        (currentState === State.CREDIT && !line.match(creditsEndRegex)) ||
        (currentState === State.PAYMENT && !line.match(paymentsEndRegex)) ||
        // read expenses if in this state and the line matches a transaction
        (currentState === State.CREDIT_STARTED_FILLER && line.match(transactionRegex))
    ) {
        if (!output.endDate) {
            throw new Error('Started reading transactions but got no statement close date.');
        }
        // Critical ternary here that sets the array to expenses even if the above State.CREDIT_STARTED_FILLER condition
        // is true
        const array = currentState === State.PAYMENT ? output.incomes : output.expenses;

        const result = processTransactionLine(line, output.endDate);

        if (typeof result === 'string') {
            if (result) {
                array[array.length - 1].description += '\n' + result;
            }
        } else {
            array.push(result);
        }
    } else if (currentState === State.HEADER) {
        const statementClosingDateRegex = line.match(/statement closing date\s+(\d{2}\/\d{2}\/\d{2})/i);
        const accountNumberRegex = line.match(/^account number.+(\d{4})$/i);
        if (statementClosingDateRegex) {
            output.endDate = dateFromSlashFormat(statementClosingDateRegex[1], yearPrefix);
        } else if (accountNumberRegex && !output.accountSuffix) {
            output.accountSuffix = accountNumberRegex[1];
        }
    }

    return output;
}

function nextState(currentState: State, line: string): State {
    line = line.toLowerCase();

    switch (currentState) {
        case State.HEADER:
            if (line.match(/^\s*payments and credits$/)) {
                return State.PAYMENT_HEADER;
            }
            break;
        case State.PAYMENT_HEADER:
            if (line.match(tableHeadersRegex)) {
                return State.PAYMENT;
            }
            break;
        case State.PAYMENT:
            // use this regex here so that it can be shared with performStateAction
            if (line.match(paymentsEndRegex)) {
                if (line === '') {
                    return State.PAYMENT_FILLER;
                } else {
                    return State.CREDIT_FILLER;
                }
            }
            break;
        case State.PAYMENT_FILLER:
            if (line === 'transactions (continued)') {
                return State.PAYMENT;
            }
            break;
        case State.CREDIT_FILLER:
            if (line === 'transactions') {
                return State.CREDIT_HEADER;
            } else if (line.match(/^\s*fees\s*$/)) {
                return State.END;
            }
            break;
        case State.CREDIT_STARTED_FILLER:
            if (line === 'transactions (continued)' || line.match(transactionRegex)) {
                return State.CREDIT;
            }
            break;
        case State.CREDIT_HEADER:
            if (line.match(tableHeadersRegex)) {
                return State.CREDIT;
            }
            break;
        case State.CREDIT:
            if (line.match(creditsEndRegex)) {
                return State.CREDIT_FILLER;
            } else if (line === '') {
                return State.CREDIT_STARTED_FILLER;
            }
        case State.END:
            break;
    }

    return currentState;
}
