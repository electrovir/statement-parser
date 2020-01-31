import {createParserStateMachine, ParsedTransaction, PdfParse, ParsedOutput} from './base-parser';
import {dateFromSlashFormat, dateWithinRange} from '../util/date';
import {flatten2dArray} from '../util/array';
import {collapseSpaces} from '../util/string';
import {readPdf} from '../readPdf';

enum State {
    PAGE_HEADER = 'header',
    STATEMENT_PERIOD = 'statement-period',
    DEPOSIT_HEADERS = 'deposit-headers',
    DEPOSIT = 'deposit',
    DEBIT_HEADERS = 'debit-headers',
    DEBIT = 'debit',
    FILLER = 'filler',
    END = 'end',
}

export type UsaaBankAccountTransaction = ParsedTransaction & {
    from: string;
};

export type UsaaBankOutput = ParsedOutput<UsaaBankAccountTransaction>;

const initOutput: UsaaBankOutput = {
    incomes: [],
    expenses: [],

    accountSuffix: '',
    startDate: undefined,
    endDate: undefined,
};
/**
 * @param yearPrefix       The first two digits of the current year.
 *                         Example: for the year 2010, use 20. For 1991, use 19.
 **/
export const usaaBankAccountParse: PdfParse<UsaaBankOutput> = async (filePath: string, yearPrefix: number) => {
    const lines: string[] = flatten2dArray(await readPdf(filePath));

    const parser = createParserStateMachine<State, string, UsaaBankOutput>(
        performStateAction,
        nextState,
        State.PAGE_HEADER,
        State.END,
        yearPrefix,
        initOutput,
    );

    const output = parser(lines);
    return output;
};

const validTransactionLineRegex = /(?:^\d{2}\/\d{2}\s+|^\s{4,})/;

function performStateAction(currentState: State, line: string, yearPrefix: number, output: UsaaBankOutput) {
    if (currentState === State.STATEMENT_PERIOD && line !== '') {
        const match = line.match(/([\d-]{5})\s+.+?(\d{2}\/\d{2}\/\d{2}).+?(\d{2}\/\d{2}\/\d{2})/);
        if (match) {
            const [, accountSuffix, startDateString, endDateString] = match;
            output.accountSuffix = accountSuffix.replace('-', '').substring(0, 4);
            if (!output.accountSuffix.match(/\d{4}/)) {
                throw new Error(`Invalid account suffix: "${output.accountSuffix}"`);
            }
            output.startDate = dateFromSlashFormat(startDateString, yearPrefix);
            output.endDate = dateFromSlashFormat(endDateString, yearPrefix);
        } else {
            throw new Error(
                `Start and end date were not found in line for "${State.STATEMENT_PERIOD}" state: "${line}"`,
            );
        }
    } else if (
        (currentState === State.DEBIT || currentState === State.DEPOSIT) &&
        line.match(validTransactionLineRegex)
    ) {
        const array = currentState === State.DEBIT ? output.expenses : output.incomes;

        const match = line.match(/^(\d{2}\/\d{2})\s+((?:\d+|,|\.)+)\s+(.*)$/);
        if (match) {
            if (!output.startDate || !output.endDate) {
                throw new Error(
                    `Missing start/end date: ${JSON.stringify({start: output.startDate, end: output.endDate})}`,
                );
            }
            // start line of debit
            const parts = match[1].split('/');
            const date = dateWithinRange(output.startDate, output.endDate, Number(parts[0]), Number(parts[1]));
            array.push({
                date: date,
                amount: Number(match[2].replace(',', '')),
                description: '',
                from: collapseSpaces(match[3]).trim(),
            });
        } else {
            const currentDebit = array[array.length - 1];
            /*
             * Assume that the current line is the last line for the current debit.
             * "from" is always the last line, so shift the current "from" to "method" since it wasn't the last line.
             */
            if (currentDebit.description) {
                currentDebit.description += '\n' + currentDebit.from;
            } else {
                currentDebit.description = currentDebit.from;
            }

            currentDebit.from = collapseSpaces(line).trim();
        }
    }
    return output;
}

const otherDebitsRegex = /^\s+other debits$/;

function nextState(currentState: State, line: string): State {
    line = line.toLowerCase();

    if (line.match(/^\s+account balance summary$/)) {
        return State.END;
    }

    switch (currentState) {
        case State.PAGE_HEADER:
            if (line.match(/account number\s+account type\s+statement period/)) {
                return State.STATEMENT_PERIOD;
            } else if (line.match(/^\s+deposits and other credits$/)) {
                return State.DEPOSIT_HEADERS;
            }
            break;
        case State.STATEMENT_PERIOD:
            if (line !== '') {
                return State.PAGE_HEADER;
            }
            break;
        case State.DEPOSIT_HEADERS:
            return State.DEPOSIT;
        case State.DEPOSIT:
            if (line === '') {
                return State.FILLER;
            } else if (line.match(otherDebitsRegex)) {
                return State.DEBIT_HEADERS;
            }
            break;
        case State.DEBIT_HEADERS:
            return State.DEBIT;
        case State.DEBIT:
            if (line === '') {
                return State.FILLER;
            }
            break;
        case State.FILLER:
            if (line.match(otherDebitsRegex)) {
                return State.DEBIT_HEADERS;
            }
            break;
        case State.END:
            break;
    }

    return currentState;
}
