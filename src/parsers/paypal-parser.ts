import {getEnumTypedValues} from '../augments/object';
import {collapseSpaces, sanitizeNumberString} from '../augments/string';
import {ParsedOutput, ParsedTransaction} from '../parser-base/parsed-output';
import {createStatementParser} from '../parser-base/statement-parser';

enum State {
    Header = 'header',
    HeaderData = 'header-data',
    Activity = 'activity',
    ExpenseInside = 'expense-inside',
    IncomeInside = 'income-inside',
    ActivityHeader = 'activity-header',
    End = 'end',
}

enum ParsingTriggers {
    Usd = 'USD',
    MustNotify = 'you must notify us no later than',
    Statement = 'statement period',
}

const pageEndRegExp = /^page\s+\d+$/i;
const activityHeader = /date\s+description\s+currency\s+amount\s+fees\s+total/i;
const headerDataLineRegExp = /(\w{3} \d{1,2}, \d{4})\s*-\s*(\w{3} \d{1,2}, \d{4})\s*(.+)$/i;
const transactionStartRegExp = new RegExp(
    `^(\\d{2}/\\d{2}/\\d{4})\\s+(.+?)${ParsingTriggers.Usd}\\s+([-,.\\d]+)\\s+([-,.\\d]+)\\s+([-,.\\d]+)$`,
    'i',
);

export type PaypalTransaction = ParsedTransaction & {
    baseAmount: number;
    fees: number;
};

export type PaypalOutput = ParsedOutput<PaypalTransaction>;

/** @param yearPrefix This is ignored in this parser because PayPal statements include the entire year */
export const paypalStatementParser = createStatementParser<State, PaypalOutput>({
    action: performStateAction,
    next: nextState,
    initialState: State.Header,
    endState: State.End,
    parserKeywords: [...getEnumTypedValues(ParsingTriggers), activityHeader, pageEndRegExp],
});

function performStateAction(currentState: State, line: string, output: PaypalOutput) {
    if (currentState === State.HeaderData && !output.startDate) {
        const match = line.match(headerDataLineRegExp);
        if (match) {
            const [, startDate, endDate, accountId] = match;
            output.startDate = new Date(startDate);
            output.endDate = new Date(endDate);
            output.accountSuffix = accountId;
        }
    } else if (currentState === State.Activity) {
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
    } else if (currentState === State.ExpenseInside && line !== '') {
        output.expenses[output.expenses.length - 1].description += collapseSpaces(line);
    } else if (currentState === State.IncomeInside && line !== '') {
        output.incomes[output.incomes.length - 1].description += ' ' + collapseSpaces(line);
    }

    return output;
}

function nextState(currentState: State, line: string): State {
    line = line.toLowerCase();

    if (line.includes(ParsingTriggers.MustNotify)) {
        return State.End;
    }

    switch (currentState) {
        case State.Header:
            if (line.includes(ParsingTriggers.Statement)) {
                return State.HeaderData;
            } else if (line.match(activityHeader)) {
                return State.ActivityHeader;
            }
            break;
        case State.ActivityHeader:
            if (line === '') {
                return State.Activity;
            }
            break;
        case State.HeaderData:
            return State.Header;
        case State.ExpenseInside:
            if (line === '') {
                return State.Activity;
            }
            break;
        case State.IncomeInside:
            if (line === '') {
                return State.Activity;
            }
            break;
        case State.Activity:
            const match = line.match(transactionStartRegExp);
            if (match) {
                if (Number(sanitizeNumberString(match[5])) < 0) {
                    return State.ExpenseInside;
                } else {
                    return State.IncomeInside;
                }
            } else if (line.match(pageEndRegExp)) {
                return State.Header;
            }
            break;
        case State.End:
            break;
    }

    return currentState;
}
