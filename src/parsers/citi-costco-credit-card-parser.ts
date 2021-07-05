import {parsePageItems} from 'pdf-text-reader';
import {ParsedOutput, ParsedTransaction} from '../parser-base/parsed-output';
import {CombineWithBaseParserOptions} from '../parser-base/parser-options';
import {createStatementParser} from '../parser-base/statement-parser';
import {getPdfDocument} from '../readPdf';
import {dateFromSlashFormat, dateWithinRange} from '../util/date';
import {getEnumTypedValues} from '../util/object';
import {collapseSpaces, sanitizeNumberString} from '../util/string';
import {Overwrite} from '../util/type';

enum State {
    Header = 'header',
    Payment = 'payment',
    Purchase = 'purchase',
    PurchaseFiller = 'purchase filler',
    End = 'end',
}

enum ParsingTriggers {
    BillingPeriod = 'billing period:',
    AccountNumber = 'account number ending in:',
    Payments = 'payments, credits and adjustments',
    Purchases = 'standard purchases',
    AccountSummary = 'Account Summary',
}

const billingPeriodRegExp = new RegExp(
    `^\\s*${ParsingTriggers.BillingPeriod}\\s+(\\d{2}/\\d{2}/\\d{2})-(\\d{2}/\\d{2}/\\d{2})\\s*$`,
    'i',
);

const accountNumberRegExp = new RegExp(`${ParsingTriggers.AccountNumber}\\s+(\\S+)\\s*$`, 'i');

type CitiCostcoCreditIntermediateTransaction = Overwrite<
    ParsedTransaction,
    {
        amount: number | undefined;
    }
>;

/**
 * @param yearPrefix The first two digits of the current year. Example: for the year 2010, use 20.
 *   For 1991, use 19.
 */
export const citiCostcoCreditCardParser = createStatementParser<State, ParsedOutput>({
    action: performStateAction,
    next: nextState,
    initialState: State.Header,
    endState: State.End,
    parserKeywords: getEnumTypedValues(ParsingTriggers),
    pdfProcessing: readCitiCostcoPdf,
    outputValidation: outputValidation,
});

async function readCitiCostcoPdf(path: string): Promise<string[][]> {
    const doc = await getPdfDocument(path);
    const pageCount = doc.numPages;

    let pages: string[][] = [];

    /**
     * The costco card has a right column with costco rewards information that totally screws up the
     * parsing of actual transactions and payments. Here, we find where that column is so that it
     * can be removed.
     */
    const firstPageItems = (await (await doc.getPage(1)).getTextContent()).items;
    const rightColumnItem = firstPageItems.find(
        (item) => item.str === ParsingTriggers.AccountSummary,
    );
    if (!rightColumnItem) {
        throw new Error('Could not find right column.');
    }
    const columnX = Math.floor(rightColumnItem.transform[4]);

    for (let i = 0; i < pageCount; i++) {
        const pageItems = (await (await doc.getPage(i + 1)).getTextContent()).items;
        const filteredItems = pageItems.filter((item) => {
            // filter out the right column
            const beforeColumn = item.transform[4] < columnX;
            const justSpaces = item.str.match(/^\s+$/);
            return !justSpaces && beforeColumn;
        });
        pages.push(parsePageItems(filteredItems).lines);
        pages = pages.concat();
    }

    return pages;
}

function outputValidation(output: ParsedOutput) {
    // Verifying that the "lineParse as BaseTransaction" assumption below is true
    output.incomes.forEach((income) => {
        if (income.amount === undefined) {
            throw new Error(`Invalid amount for income transaction: ${income}`);
        }
    });
    output.expenses.forEach((expense) => {
        if (expense.amount === undefined) {
            throw new Error(`Invalid amount for expense transaction: ${expense}`);
        }
    });
}

const amountRegex = /^-?\$([\d,\.]+)\s*$/i;

function parseAmount(input: string, negate: boolean): number {
    const match = input.match(amountRegex);
    if (match) {
        const amount = Number(sanitizeNumberString(match[1]));
        let multiplier = negate ? -1 : 1;

        if (input[0] === '-') {
            multiplier *= -1;
        }

        return amount * multiplier;
    } else {
        throw new Error(`Failed to parse a dollar amount: "${input}"`);
    }
}

function parseTransactionLine(
    line: string,
    output: ParsedOutput,
    negate: boolean,
): string | number | CitiCostcoCreditIntermediateTransaction {
    if (!output.startDate || !output.endDate) {
        throw new Error(
            `Tried to parse a transaction but no start date (${output.startDate}) or end date (${output.endDate}) were found yet`,
        );
    }

    const transactionMatch = line.match(
        /(?:\d{2}\/\d{2}\s*)?(\d{2})\/(\d{2})\s+(\S.+)\s+(-?\$[\d\.,]+)?\s*$/i,
    );

    if (transactionMatch) {
        const [, monthString, dayString, description, amountString] = transactionMatch;
        const transaction: CitiCostcoCreditIntermediateTransaction = {
            date: dateWithinRange(
                output.startDate,
                output.endDate,
                Number(monthString),
                Number(dayString),
            ),
            amount: undefined,
            description: collapseSpaces(description),
        };
        if (amountString) {
            transaction.amount = parseAmount(amountString, negate);
        }

        return transaction;
    } else {
        const amountMatch = line.match(amountRegex);
        if (amountMatch) {
            return parseAmount(line, negate);
        } else {
            return collapseSpaces(line);
        }
    }
}

function performStateAction(
    currentState: State,
    line: string,
    output: ParsedOutput,
    parserOptions: CombineWithBaseParserOptions,
) {
    if (currentState === State.Header) {
        const billingPeriodMatch = line.match(billingPeriodRegExp);
        const accountEndingMatch = line.match(accountNumberRegExp);
        if (billingPeriodMatch) {
            const [, startDateString, endDateString] = billingPeriodMatch;
            output.startDate = dateFromSlashFormat(startDateString, parserOptions.yearPrefix);
            output.endDate = dateFromSlashFormat(endDateString, parserOptions.yearPrefix);
        } else if (accountEndingMatch) {
            output.accountSuffix = accountEndingMatch[1];
        }
    } else if (line !== '' && (currentState === State.Purchase || currentState === State.Payment)) {
        const array = currentState === State.Purchase ? output.expenses : output.incomes;

        const lineParse = parseTransactionLine(line, output, currentState === State.Payment);
        const lastTransaction: CitiCostcoCreditIntermediateTransaction | undefined =
            array[array.length - 1];

        if (typeof lineParse === 'string') {
            lastTransaction.description += '\n' + lineParse;
        } else if (typeof lineParse === 'number') {
            lastTransaction.amount = lineParse;
        } else {
            // because a transaction's amount may not be on its first line, we must make sure we actually got the amount
            // before moving onto the next transaction
            if (lastTransaction && lastTransaction.amount === undefined) {
                throw new Error(`Moving onto next transaction but last one's amount is still undefined.
                last transaction: ${lastTransaction}
                current line: "${line}"`);
            }
            // This assumption is not always true! However, it should become true later.
            // It must be verified later that it indeed did come true.
            array.push(lineParse as ParsedTransaction);
        }
    }

    return output;
}

function nextState(currentState: State, line: string): State {
    line = line.toLowerCase();

    switch (currentState) {
        case State.Header:
            if (line === ParsingTriggers.Payments) {
                return State.Payment;
            } else if (line === ParsingTriggers.Purchases) {
                return State.Purchase;
            }
            break;
        case State.Payment:
            if (line === '') {
                return State.PurchaseFiller;
            }
            break;
        case State.PurchaseFiller:
            if (line === ParsingTriggers.Purchases) {
                return State.Purchase;
            }
            break;
        case State.Purchase:
            if (line === '') {
                return State.End;
            }
            break;
    }

    return currentState;
}
