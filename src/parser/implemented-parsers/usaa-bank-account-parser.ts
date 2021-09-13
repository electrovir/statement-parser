import {dateFromSlashFormat, dateWithinRange} from '../../augments/date';
import {getEnumTypedValues} from '../../augments/object';
import {safeMatch} from '../../augments/regexp';
import {collapseSpaces, sanitizeNumberString} from '../../augments/string';
import {ParsedOutput, ParsedTransaction} from '../parsed-output';
import {CombineWithBaseParserOptions} from '../parser-options';
import {createStatementParser} from '../statement-parser';

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
const accountSummaryRegExp = /^\s+account balance summary$/i;
const accountNumberHeaderRegExp = /account number\s+account type\s+statement period/i;
const depositsRegExp = /^\s+deposits and other credits$/i;
const fromRegExp = /^\s{2,}FROM\s+/;

export type UsaaBankAccountTransaction = ParsedTransaction & {
    from: undefined | string;
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
        fromRegExp,
    ],
});

const validTransactionLineRegex = /(?:^\d{1,2}\/\d{1,2}\s+|^\s{2,})/;

function performStateAction(
    currentState: State,
    line: string,
    output: UsaaBankOutput,
    parserOptions: CombineWithBaseParserOptions,
) {
    if (currentState === State.StatementPeriod && line !== '') {
        const [, accountSuffix, startDateString, endDateString] = safeMatch(
            line,
            /([\d-]+)\s+.+?(\d{1,2}\/\d{1,2}\/\d{1,2}).+?(\d{1,2}\/\d{1,2}\/\d{1,2})/,
        );
        if (accountSuffix && startDateString && endDateString) {
            output.accountSuffix = accountSuffix.replace(/-/g, '').slice(-4);
            if (!output.accountSuffix.match(/\d+/)) {
                throw new Error(`Invalid account suffix: "${output.accountSuffix}"`);
            }
            output.startDate = dateFromSlashFormat(startDateString, parserOptions.yearPrefix);
            output.endDate = dateFromSlashFormat(endDateString, parserOptions.yearPrefix);
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

        const [, dateString, amountString, descriptionString] = safeMatch(
            line,
            /^(\d{1,2}\/\d{1,2})\s+((?:\d+|,|\.)+)\s+(.*)$/,
        );
        const currentDebit = array[array.length - 1];
        if (dateString && amountString && descriptionString) {
            if (!output.startDate || !output.endDate) {
                throw new Error(
                    `Missing start/end date: ${JSON.stringify({
                        start: output.startDate,
                        end: output.endDate,
                    })}`,
                );
            }
            // start line of debit
            const parts = dateString.split('/');
            const date = dateWithinRange(
                output.startDate,
                output.endDate,
                Number(parts[0]),
                Number(parts[1]),
            );
            array.push({
                date: date,
                amount: Number(sanitizeNumberString(amountString)),
                description: collapseSpaces(descriptionString).trim(),
                from: undefined,
                originalText: [line],
            });
        } else if (currentDebit) {
            /*
             * Assume that the current line is the last line for the current debit.
             * "from" is always the last line, so shift the current "from" to "method" since it wasn't the last line.
             */
            currentDebit.description += '\n' + collapseSpaces(line).trim();
            if (line.match(fromRegExp)) {
                currentDebit.from = collapseSpaces(line.replace(fromRegExp, '')).trim();
            }
            currentDebit.originalText.push(line);
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
