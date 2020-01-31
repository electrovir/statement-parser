import {createParserStateMachine, ParsedTransaction, PdfParse, ParsedOutput} from './base-parser';
import {flatten2dArray} from '../util/array';
import {dateFromSlashFormat, dateWithinRange} from '../util/date';
import {collapseSpaces} from '../util/string';
import {readPdf} from '../readPdf';

enum State {
    HEADER = 'header',
    PAYMENT = 'payment',
    PURCHASE = 'purchase',
    END = 'end',
}

const initOutput: ParsedOutput = {
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
export const chaseCreditCardParse: PdfParse<ParsedOutput> = async (filePath: string, yearPrefix: number) => {
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
        return {
            amount: Number(amount),
            description,
            date: dateWithinRange(startDate, endDate, Number(month), Number(day)),
        };
    } else {
        return line;
    }
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
    } else if (currentState === State.PAYMENT || currentState === State.PURCHASE) {
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
            }
            break;
        case State.PAYMENT:
            if (line === 'purchase') {
                return State.PURCHASE;
            }
            break;
        case State.PURCHASE:
            if (line === '') {
                return State.END;
            }
            break;
    }

    return currentState;
}
