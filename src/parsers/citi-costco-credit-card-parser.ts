import {parsePageItems} from 'pdf-text-reader';
import {DEBUG} from '../config';
import {ParsedOutput, ParsedTransaction} from '../parser-base/parsed-output';
import {createParserStateMachine} from '../parser-base/parser-state-machine';
import {StatementParser} from '../parser-base/statement-parser';
import {getPdfDocument} from '../readPdf';
import {flatten2dArray} from '../util/array';
import {dateFromSlashFormat, dateWithinRange} from '../util/date';
import {collapseSpaces, sanitizeNumberString} from '../util/string';
import {Overwrite} from '../util/type';

enum State {
    HEADER = 'header',
    PAYMENT = 'payment',
    PURCHASE = 'purchase',
    PURCHASE_FILLER = 'purchase filler',
    END = 'end',
}

type CitiCostcoCreditIntermediateTransaction = Overwrite<
    ParsedTransaction,
    {
        amount: number | undefined;
    }
>;

async function readCitiCostcoPdf(path: string): Promise<string[]> {
    const doc = await getPdfDocument(path);
    const pageCount = doc.numPages;

    let pages: string[][] = [];

    /**
     * The costco card has a right column with costco rewards information that totally screws up the
     * parsing of actual transactions and payments. Here, we find where that column is so that it
     * can be removed.
     */
    const firstPageItems = (await (await doc.getPage(1)).getTextContent()).items;
    const rightColumnItem = firstPageItems.find((item) => item.str === 'Account Summary');
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

    return flatten2dArray(pages);
}

/**
 * @param yearPrefix The first two digits of the current year. Example: for the year 2010, use 20.
 *   For 1991, use 19.
 */
export const citiCostcoCreditCardParse: StatementParser<ParsedOutput> = async (
    filePath: string,
    yearPrefix: number,
) => {
    const initOutput: ParsedOutput = {
        incomes: [],
        expenses: [],
        accountSuffix: '',
        filePath,
        startDate: undefined,
        endDate: undefined,
    };
    const lines: string[] = await readCitiCostcoPdf(filePath);

    if (DEBUG) {
        console.log('flattened lines', JSON.stringify(lines, null, 4));
    }

    const parser = createParserStateMachine<State, string, ParsedOutput>({
        action: performStateAction,
        next: nextState,
        initialState: State.HEADER,
        endState: State.END,
        yearPrefix,
        initOutput,
    });

    const output = parser(lines);
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
    return output;
};

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
    yearPrefix: number,
    output: ParsedOutput,
) {
    if (currentState === State.HEADER) {
        const billingPeriodMatch = line.match(
            /^\s*billing period:\s+(\d{2}\/\d{2}\/\d{2})-(\d{2}\/\d{2}\/\d{2})\s*$/i,
        );
        const accountEndingMatch = line.match(/account number ending in:\s+(\S+)\s*$/i);
        if (billingPeriodMatch) {
            const [, startDateString, endDateString] = billingPeriodMatch;
            output.startDate = dateFromSlashFormat(startDateString, yearPrefix);
            output.endDate = dateFromSlashFormat(endDateString, yearPrefix);
        } else if (accountEndingMatch) {
            output.accountSuffix = accountEndingMatch[1];
        }
    } else if (line !== '' && (currentState === State.PURCHASE || currentState === State.PAYMENT)) {
        const array = currentState === State.PURCHASE ? output.expenses : output.incomes;

        const lineParse = parseTransactionLine(line, output, currentState === State.PAYMENT);
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
        case State.HEADER:
            if (line === 'payments, credits and adjustments') {
                return State.PAYMENT;
            } else if (line === 'standard purchases') {
                return State.PURCHASE;
            }
            break;
        case State.PAYMENT:
            if (line === '') {
                return State.PURCHASE_FILLER;
            }
            break;
        case State.PURCHASE_FILLER:
            if (line === 'standard purchases') {
                return State.PURCHASE;
            }
            break;
        case State.PURCHASE:
            if (line === '') {
                return State.END;
            }
            break;
    }

    return currentState;
}
