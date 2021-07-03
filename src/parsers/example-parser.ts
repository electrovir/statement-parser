import {readPdf} from '../readPdf';
import {flatten2dArray} from '../util/array';
import {sanitizeNumberString} from '../util/string';
import {
    createParserStateMachine,
    ParsedOutput,
    ParsedTransaction,
    StatementParser,
} from './base-parser';

enum State {
    HEADER = 'header',
    INNER_STATE = 'inner-state',
    END = 'end',
}

/**
 * @param yearPrefix The first two digits of the current year. Example: for the year 2010, use 20.
 *   For 1991, use 19.
 */
export const exampleParse: StatementParser<ParsedOutput> = async (
    filePath: string,
    yearPrefix: number,
) => {
    const initOutput: ParsedOutput = {
        expenses: [],
        incomes: [],
        filePath,
        accountSuffix: 'EXAMPLE',
        startDate: new Date(),
        endDate: new Date(),
    };

    const lines: string[] = flatten2dArray(await readPdf(filePath));

    const parser = createParserStateMachine<State, string, ParsedOutput>({
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

const validPaymentRegex = /(\d{2}\/\d{2})\s+(.+)\$([-,.\d]+)/;

function readPayment(line: string): ParsedTransaction | undefined {
    const match = line.match(validPaymentRegex);

    if (match) {
        const [, dateString, descriptionString, amountString] = match;
        return {
            amount: Number(sanitizeNumberString(amountString)),
            description: descriptionString,
            date: new Date(dateString),
        };
    } else {
        return undefined;
    }
}

function performStateAction(
    currentState: State,
    line: string,
    yearPrefix: number,
    output: ParsedOutput,
) {
    if (currentState === State.INNER_STATE && line.match(validPaymentRegex)) {
        const transaction = readPayment(line);
        if (transaction) {
            output.incomes.push(transaction);
        }
    }

    return output;
}

function nextState(currentState: State, line: string): State {
    line = line.toLowerCase();

    switch (currentState) {
        case State.HEADER:
            return State.INNER_STATE;
        case State.INNER_STATE:
            if (line === 'end inner state') {
                return State.END;
            }
            break;
        case State.END:
            break;
    }

    return currentState;
}
