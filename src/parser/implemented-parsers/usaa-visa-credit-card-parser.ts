import {createDateFromSlashFormat, safeMatch, stripCommasFromNumberString} from 'augment-vir';
import {dateWithinRange} from '../../augments/date';
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

const transactionRegExp =
    /^(\d{1,2}\/\d{1,2})\s+(\d{1,2}\/\d{1,2})\s+(\S.*?)\s+?(\S.*?)\s+\$((?:\d+|,|\.)+)\-?$/;

function processTransactionLine(
    line: string,
    endDate: Date,
): UsaaVisaCreditCardTransaction | string {
    const [, transactionDate, postDate, referenceNumber, description, amount] = safeMatch(
        line,
        transactionRegExp,
    );
    if (transactionDate && postDate && referenceNumber && description && amount) {
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
            amount: Number(stripCommasFromNumberString(amount)),
            description,
            referenceNumber,
            originalText: [line],
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
        (currentState === State.CreditStartedFiller && line.match(transactionRegExp))
    ) {
        if (!output.endDate) {
            throw new Error('Started reading transactions but got no statement close date.');
        }
        // Critical ternary here that sets the array to expenses even if the above State.CREDIT_STARTED_FILLER condition
        // is true
        const array = currentState === State.Payment ? output.incomes : output.expenses;

        const result = processTransactionLine(line, output.endDate);

        if (typeof result === 'string') {
            const lastTransaction = array[array.length - 1];
            if (result && lastTransaction) {
                lastTransaction.description += '\n' + result;
                lastTransaction.originalText.push(line);
            }
        } else {
            array.push(result);
        }
    } else if (currentState === State.Header) {
        const [, closingDateString] = safeMatch(line, closingDateRegExp);
        const [, accountNumberString] = safeMatch(line, extractAccountNumberRegExp);
        if (closingDateString) {
            output.endDate = createDateFromSlashFormat(closingDateString, parserOptions.yearPrefix);
        } else if (accountNumberString && !output.accountSuffix) {
            output.accountSuffix = accountNumberString;
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
                line.match(PreserveKeywords.TransactionsContinued) ||
                line.match(transactionRegExp)
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
