import {dateFromSlashFormat, dateWithinRange} from '../augments/date';
import {getEnumTypedValues} from '../augments/object';
import {sanitizeNumberString} from '../augments/string';
import {ParsedOutput, ParsedTransaction} from '../parser-base/parsed-output';
import {CombineWithBaseParserOptions} from '../parser-base/parser-options';
import {createStatementParser} from '../parser-base/statement-parser';

enum State {
    Header = 'header',
    Payment = 'payment',
    Purchase = 'purchase',
    End = 'end',
}

enum ChaseParsingTriggers {
    Payments = 'payments and other credits',
    Purchase = 'purchase',
    Purchases = 'purchases',
    Totals = 'totals year-to-date',
    AccountNumber = 'account number:',
    OpeningClosingDate = 'opening/closing date',
}

const accountNumberRegExp = new RegExp(`${ChaseParsingTriggers.AccountNumber} .+(\\d{4})$`, 'i');

const closingDateRegExp = new RegExp(
    `${ChaseParsingTriggers.OpeningClosingDate}\\s+(\\d{2}/\\d{2}/\\d{2})\\s+-\\s+(\\d{2}/\\d{2}/\\d{2})`,
    'i',
);

export type ChaseCreditCardParsingOptions = {
    includeMultiLineDescriptions: boolean;
};

const defaultParserOptions: Required<Readonly<ChaseCreditCardParsingOptions>> = {
    includeMultiLineDescriptions: true,
};

/**
 * @param yearPrefix The first two digits of the current year. Example: for the year 2010, use 20.
 *   For 1991, use 19.
 */
export const chaseCreditCardParser = createStatementParser<
    State,
    ParsedOutput,
    ChaseCreditCardParsingOptions
>({
    action: performStateAction,
    next: nextState,
    initialState: State.Header,
    endState: State.End,
    defaultParserOptions,
    parserKeywords: getEnumTypedValues(ChaseParsingTriggers),
});

function processTransactionLine(
    line: string,
    startDate: Date,
    endDate: Date,
): ParsedTransaction | string {
    const match = line.match(/^(\d{2}\/\d{2})\s+(\S.+?)\s+([\.\d,\-]+)$/);
    if (match) {
        const [, date, description, amount] = match;
        const [month, day] = date.split('/');
        return {
            amount: Number(sanitizeNumberString(amount)),
            description,
            date: dateWithinRange(startDate, endDate, Number(month), Number(day)),
        };
    } else {
        return line;
    }
}

function performStateAction(
    currentState: State,
    line: string,
    output: ParsedOutput,
    parserOptions: CombineWithBaseParserOptions<ChaseCreditCardParsingOptions>,
) {
    if (currentState === State.Header) {
        const closingDateMatch = line.match(closingDateRegExp);
        const accountNumberMatch = line.match(accountNumberRegExp);
        if (closingDateMatch) {
            const [, startDateString, endDateString] = closingDateMatch;
            const startDate = dateFromSlashFormat(startDateString, parserOptions.yearPrefix);
            const endDate = dateFromSlashFormat(endDateString, parserOptions.yearPrefix);
            // Chase statements sometimes include transactions a few days outside of the statement range.
            startDate.setDate(startDate.getDate() - 3);
            endDate.setDate(endDate.getDate() + 3);
            output.startDate = startDate;
            output.endDate = endDate;
        } else if (accountNumberMatch && !output.accountSuffix) {
            output.accountSuffix = accountNumberMatch[1];
        }
    } else if (currentState === State.Payment || currentState === State.Purchase) {
        if (!output.endDate || !output.startDate) {
            throw new Error('Started reading transactions but got no start or end dates.');
        }

        const array = currentState === State.Payment ? output.incomes : output.expenses;

        const result = processTransactionLine(line, output.startDate, output.endDate);

        if (typeof result !== 'string') {
            array.push(result);
        }
    }

    return output;
}

function nextState(currentState: State, line: string): State {
    line = line.toLowerCase();

    switch (currentState) {
        case State.Header:
            if (line === ChaseParsingTriggers.Payments) {
                return State.Payment;
            } else if (
                line === ChaseParsingTriggers.Purchase ||
                line === ChaseParsingTriggers.Purchases
            ) {
                return State.Purchase;
            }
            break;
        case State.Payment:
            if (line === ChaseParsingTriggers.Purchase || line === ChaseParsingTriggers.Purchases) {
                return State.Purchase;
            }
            break;
        case State.Purchase:
            if (line.includes(ChaseParsingTriggers.Totals)) {
                return State.End;
            }
            break;
    }

    return currentState;
}
