import {dateFromSlashFormat, dateWithinRange} from '../../augments/date';
import {sanitizeNumberString} from '../../augments/string';
import {ParsedOutput, ParsedTransaction} from '../parsed-output';
import {CombineWithBaseParserOptions} from '../parser-options';
import {createStatementParser} from '../statement-parser';

enum State {
    Header = 'header',
    PaymentHeader = 'payment-header',
    Payment = 'payment',
    PaymentFiller = 'payment-filler',
    CreditHeader = 'credit-header',
    Credit = 'credit',
    CreditFiller = 'credit-filler',
    CreditStartedFiller = 'credit-started-filler',
    End = 'end',
}

const PreserveKeywords = {
    TotalPayments: 'total payments and credits for this period',
    AccountNumber: /^Account Number\s+/,
    Payments: /^\s*payments and credits\s*$/i,
    TransactionsContinued: /^\s*transactions \(continued\)\s*$/i,
    Transactions: /^\s*transactions\s*$/i,
    StatementClosingDate: 'statement closing date',
};

export type UsaaVisaCreditCardTransaction = ParsedTransaction & {
    postDate: Date;
    referenceNumber: string;
};

export type UsaaVisaCreditOutput = ParsedOutput<UsaaVisaCreditCardTransaction>;

const tableHeadersRegExp = /^trans date\s*post date/i;
const creditsEndRegExp = /^\s*total transactions for/i;
const paymentsEndRegExp = new RegExp(`(?:^${PreserveKeywords.TotalPayments}\\s+\\$)|(?:^$)`, 'i');
const extractAccountNumberRegExp = new RegExp(
    `${PreserveKeywords.AccountNumber.source}.+(\\d{1,4})$`,
    'i',
);
const closingDateRegExp = new RegExp(
    `${PreserveKeywords.StatementClosingDate}\\s+(\\d{1,2}/\\d{1,2}/\\d{1,2})`,
    'i',
);
const feesRegExp = /^\s*fees\s*$/i;

export const usaaVisaCreditCardStatementParser = createStatementParser<State, UsaaVisaCreditOutput>(
    {
        action: performStateAction,
        next: nextState,
        initialState: State.Header,
        endState: State.End,
        parserKeywords: [
            // most of the RegExps are not included here because they capture sensitive information
            ...Object.values(PreserveKeywords),
            tableHeadersRegExp,
            creditsEndRegExp,
            feesRegExp,
        ],
    },
);

const transactionRegex =
    /^(\d{1,2}\/\d{1,2})\s+(\d{1,2}\/\d{1,2})\s+(\S.+?)\s+?(\S.+?)\s+\$((?:\d+|,|\.)+)\-?$/;

function processTransactionLine(
    line: string,
    endDate: Date,
): UsaaVisaCreditCardTransaction | string {
    const match = line.match(transactionRegex);
    if (match) {
        const [, transactionDate, postDate, referenceNumber, description, amount] = match;
        const [transactionMonth, transactionDay] = transactionDate.split('/');
        const [postMonth, postDay] = postDate.split('/');
        return {
            date: dateWithinRange(
                undefined,
                endDate,
                Number(transactionMonth),
                Number(transactionDay),
            ),
            postDate: dateWithinRange(undefined, endDate, Number(postMonth), Number(postDay)),
            amount: Number(sanitizeNumberString(amount)),
            description,
            referenceNumber,
        };
    } else {
        return line;
    }
}

function performStateAction(
    currentState: State,
    line: string,
    output: UsaaVisaCreditOutput,
    parserOptions: CombineWithBaseParserOptions,
) {
    if (
        (currentState === State.Credit && !line.match(creditsEndRegExp)) ||
        (currentState === State.Payment && !line.match(paymentsEndRegExp)) ||
        // read expenses if in this state and the line matches a transaction
        (currentState === State.CreditStartedFiller && line.match(transactionRegex))
    ) {
        if (!output.endDate) {
            throw new Error('Started reading transactions but got no statement close date.');
        }
        // Critical ternary here that sets the array to expenses even if the above State.CREDIT_STARTED_FILLER condition
        // is true
        const array = currentState === State.Payment ? output.incomes : output.expenses;

        const result = processTransactionLine(line, output.endDate);

        if (typeof result === 'string') {
            if (result) {
                array[array.length - 1].description += '\n' + result;
            }
        } else {
            array.push(result);
        }
    } else if (currentState === State.Header) {
        const statementClosingDateRegex = line.match(closingDateRegExp);
        const accountNumberRegex = line.match(extractAccountNumberRegExp);
        if (statementClosingDateRegex) {
            output.endDate = dateFromSlashFormat(
                statementClosingDateRegex[1],
                parserOptions.yearPrefix,
            );
        } else if (accountNumberRegex && !output.accountSuffix) {
            output.accountSuffix = accountNumberRegex[1];
        }
    }

    return output;
}

function nextState(currentState: State, line: string): State {
    line = line.toLowerCase();

    switch (currentState) {
        case State.Header:
            if (line.match(PreserveKeywords.Payments)) {
                return State.PaymentHeader;
            }
            break;
        case State.PaymentHeader:
            if (line.match(tableHeadersRegExp)) {
                return State.Payment;
            }
            break;
        case State.Payment:
            // use this regex here so that it can be shared with performStateAction
            if (line.match(paymentsEndRegExp)) {
                if (line === '') {
                    return State.PaymentFiller;
                } else {
                    return State.CreditFiller;
                }
            }
            break;
        case State.PaymentFiller:
            if (line.match(PreserveKeywords.TransactionsContinued)) {
                return State.Payment;
            }
            break;
        case State.CreditFiller:
            if (line.match(PreserveKeywords.Transactions)) {
                return State.CreditHeader;
            } else if (line.match(feesRegExp)) {
                return State.End;
            }
            break;
        case State.CreditStartedFiller:
            if (
                line.match(PreserveKeywords.TransactionsContinued || line.match(transactionRegex))
            ) {
                return State.Credit;
            }
            break;
        case State.CreditHeader:
            if (line.match(tableHeadersRegExp)) {
                return State.Credit;
            }
            break;
        case State.Credit:
            if (line.match(creditsEndRegExp)) {
                return State.CreditFiller;
            } else if (line === '') {
                return State.CreditStartedFiller;
            }
        case State.End:
            break;
    }

    return currentState;
}
