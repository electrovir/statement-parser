import {createParserStateMachine, ParsedTransaction, PdfParse, ParsedOutput} from './base-parser';
import {flatten2dArray} from '../util/array';
import {readPdf} from '../readPdf';

enum State {
    HEADER = 'header',
    INNER_STATE = 'inner-state',
    END = 'end',
}

const initOutput: ParsedOutput = {
    expenses: [],
    incomes: [],
    accountSuffix: 'EXAMPLE',
    startDate: new Date(),
};
/**
 * @param yearPrefix       The first two digits of the current year.
 *                         Example: for the year 2010, use 20. For 1991, use 19.
 **/
export const exampleParser: PdfParse<ParsedOutput> = async (filePath: string, yearPrefix: number) => {
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

function readPayment(line: string): ParsedTransaction {
    return {
        amount: 101,
        description: 'example transaction',
        date: new Date(),
    };
}

const validPaymentRegex = /^\d{d}\/\d{2}\s+.+?\s+\$([\d|,|\.]+)$/;

function performStateAction(currentState: State, line: string, yearPrefix: number, output: ParsedOutput) {
    if (currentState === State.INNER_STATE && line.match(validPaymentRegex)) {
        output.incomes.push(readPayment(line));
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
