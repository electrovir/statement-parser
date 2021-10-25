import {
    collapseSpaces,
    createDateFromNamedCommaFormat,
    createDateFromSlashFormat,
    getEnumTypedValues,
    safeMatch,
    stripCommasFromNumberString,
} from 'augment-vir';
import {isSanitizerMode} from '../../global';
import {ParsedOutput, ParsedTransaction} from '../parsed-output';
import {createStatementParser} from '../statement-parser';

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
const headerDataLineRegExp =
    /(\w{1,3} \d{1,2},? \d{1,4})\s*-\s*(\w{1,3} \d{1,2},? \d{1,4})\s*(.+)$/;
const transactionStartRegExp = new RegExp(
    `^(\\d{1,2}/\\d{1,2}/\\d{1,4})\\s+(.+?)${ParsingTriggers.Usd}\\s+([-,.\\d]+)\\s+([-,.\\d]+)\\s+([-,.\\d]+)$`,
    'i',
);

export type PaypalTransaction = ParsedTransaction & {
    baseAmount: number;
    fees: number;
};

export type PaypalOutput = ParsedOutput<PaypalTransaction>;

export const paypalStatementParser = createStatementParser<State, PaypalOutput>({
    action: performStateAction,
    next: nextState,
    initialState: State.Header,
    endState: State.End,
    parserKeywords: [...getEnumTypedValues(ParsingTriggers), activityHeader, pageEndRegExp],
});

function performStateAction(currentState: State, line: string, output: PaypalOutput) {
    const lastExpense = output.expenses[output.expenses.length - 1];
    const lastIncome = output.incomes[output.incomes.length - 1];

    if (currentState === State.HeaderData && !output.startDate) {
        const [, startDate, endDate, accountId] = safeMatch(line, headerDataLineRegExp);
        if (startDate && endDate && accountId) {
            output.startDate = createDateFromNamedCommaFormat(startDate, isSanitizerMode());
            output.endDate = createDateFromNamedCommaFormat(endDate, isSanitizerMode());
            output.accountSuffix = accountId;
        }
    } else if (currentState === State.Activity) {
        const [, date, description, amountString, fees, total] = safeMatch(
            line,
            transactionStartRegExp,
        );
        if (date && description && amountString && fees && total) {
            const amount = Number(stripCommasFromNumberString(amountString));
            const newTransaction: PaypalTransaction = {
                date: createDateFromSlashFormat(date),
                description: collapseSpaces(description),
                // this assumption that we can always use absolute value here may be wrong
                amount: Math.abs(Number(stripCommasFromNumberString(total))),
                fees: Math.abs(Number(stripCommasFromNumberString(fees))),
                baseAmount: Math.abs(amount),
                originalText: [line],
            };
            const array = amount < 0 ? output.expenses : output.incomes;

            array.push(newTransaction);
        }
    } else if (currentState === State.ExpenseInside && line !== '' && lastExpense) {
        lastExpense.description += '\n' + collapseSpaces(line);
        lastExpense.originalText.push(line);
    } else if (currentState === State.IncomeInside && line !== '' && lastIncome) {
        lastIncome.description += '\n' + collapseSpaces(line);
        lastIncome.originalText.push(line);
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
            const amountMatch = safeMatch(line, transactionStartRegExp)[5];
            if (amountMatch) {
                if (Number(stripCommasFromNumberString(amountMatch)) < 0) {
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
