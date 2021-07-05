import {ParsedOutput, ParsedTransaction} from '../parser-base/parsed-output';
import {createStatementParser} from '../parser-base/statement-parser';
import {dateFromSlashFormat, dateWithinRange} from '../util/date';
import {getEnumTypedValues} from '../util/object';
import {collapseSpaces, sanitizeNumberString} from '../util/string';

enum State {
    PageHeader = 'header',
    StatementPeriod = 'statement-period',
    DepositHeaders = 'deposit-headers',
    Deposit = 'deposit',
    DebitHeaders = 'debit-headers',
    Debit = 'debit',
    Filler = 'filler',
    End = 'end',
}

enum ParsingTriggers {
    OtherDebits = 'other debits',
}

const otherDebitsRegExp = /^\s+other debits$/;
const accountSummaryRegExp = /^\s+account balance summary$/;
const accountNumberHeaderRegExp = /account number\s+account type\s+statement period/;
const depositsRegExp = /^\s+deposits and other credits$/;

export type UsaaBankAccountTransaction = ParsedTransaction & {
    from: string;
};

export type UsaaBankOutput = ParsedOutput<UsaaBankAccountTransaction>;

export const usaaBankAccountStatementParser = createStatementParser<State, UsaaBankOutput>({
    action: performStateAction,
    next: nextState,
    initialState: State.PageHeader,
    endState: State.End,
    parserKeywords: [
        ...getEnumTypedValues(ParsingTriggers),
        otherDebitsRegExp,
        accountSummaryRegExp,
        accountNumberHeaderRegExp,
        depositsRegExp,
    ],
});

const validTransactionLineRegex = /(?:^\d{2}\/\d{2}\s+|^\s{4,})/;

function performStateAction(
    currentState: State,
    line: string,
    yearPrefix: number,
    output: UsaaBankOutput,
) {
    if (currentState === State.StatementPeriod && line !== '') {
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
                `Start and end date were not found in line for "${State.StatementPeriod}" state: "${line}"`,
            );
        }
    } else if (
        (currentState === State.Debit || currentState === State.Deposit) &&
        line.match(validTransactionLineRegex)
    ) {
        const array = currentState === State.Debit ? output.expenses : output.incomes;

        const match = line.match(/^(\d{2}\/\d{2})\s+((?:\d+|,|\.)+)\s+(.*)$/);
        if (match) {
            if (!output.startDate || !output.endDate) {
                throw new Error(
                    `Missing start/end date: ${JSON.stringify({
                        start: output.startDate,
                        end: output.endDate,
                    })}`,
                );
            }
            // start line of debit
            const parts = match[1].split('/');
            const date = dateWithinRange(
                output.startDate,
                output.endDate,
                Number(parts[0]),
                Number(parts[1]),
            );
            array.push({
                date: date,
                amount: Number(sanitizeNumberString(match[2])),
                description: collapseSpaces(match[3]).trim(),
                from: collapseSpaces(match[3]).trim(),
            });
        } else {
            const currentDebit = array[array.length - 1];
            /*
             * Assume that the current line is the last line for the current debit.
             * "from" is always the last line, so shift the current "from" to "method" since it wasn't the last line.
             */
            currentDebit.description += '\n' + collapseSpaces(line).trim();

            currentDebit.from = collapseSpaces(line).trim();
        }
    }
    return output;
}

function nextState(currentState: State, line: string): State {
    line = line.toLowerCase();

    if (line.match(accountSummaryRegExp)) {
        return State.End;
    }

    switch (currentState) {
        case State.PageHeader:
            if (line.match(accountNumberHeaderRegExp)) {
                return State.StatementPeriod;
            } else if (line.match(depositsRegExp)) {
                return State.DepositHeaders;
            }
            break;
        case State.StatementPeriod:
            if (line !== '') {
                return State.PageHeader;
            }
            break;
        case State.DepositHeaders:
            return State.Deposit;
        case State.Deposit:
            if (line === '') {
                return State.Filler;
            } else if (line.match(otherDebitsRegExp)) {
                return State.DebitHeaders;
            }
            break;
        case State.DebitHeaders:
            return State.Debit;
        case State.Debit:
            if (line === '') {
                return State.Filler;
            }
            break;
        case State.Filler:
            if (line.match(otherDebitsRegExp)) {
                return State.DebitHeaders;
            }
            break;
        case State.End:
            break;
    }

    return currentState;
}
