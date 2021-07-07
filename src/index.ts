import {getEnumTypedValues} from './augments/object';
import {setDebug} from './config';
import {ParsedOutput} from './parser-base/parsed-output';
import {chaseCreditCardParser} from './parsers/chase-credit-card-parser';
import {citiCostcoCreditCardParser} from './parsers/citi-costco-credit-card-parser';
import {paypalStatementParser} from './parsers/paypal-parser';
import {usaaBankAccountStatementParser} from './parsers/usaa-bank-account-parser';
import {usaaCreditCardStatementParser} from './parsers/usaa-credit-card-parser';

export {ParsedOutput, ParsedTransaction} from './parser-base/parsed-output';
export {ChaseCreditCardParsingOptions} from './parsers/chase-credit-card-parser';
export {PaypalOutput, PaypalTransaction} from './parsers/paypal-parser';
export {UsaaBankAccountTransaction, UsaaBankOutput} from './parsers/usaa-bank-account-parser';
export {UsaaCreditCardTransaction, UsaaCreditOutput} from './parsers/usaa-credit-card-parser';

export enum ParserType {
    CHASE_CREDIT = 'chase-credit',
    CITI_COSTCO_CREDIT = 'citi-costco-credit',
    USAA_BANK = 'usaa-bank',
    USAA_CREDIT = 'usaa-credit',
    PAYPAL = 'paypal',
}

export function isParserType(x: any): x is ParserType {
    if (typeof x === 'string' && getEnumTypedValues(ParserType).includes(x as ParserType)) {
        return true;
    }

    return false;
}

export const parsers = {
    [ParserType.CHASE_CREDIT]: chaseCreditCardParser,
    [ParserType.CITI_COSTCO_CREDIT]: citiCostcoCreditCardParser,
    [ParserType.PAYPAL]: paypalStatementParser,
    [ParserType.USAA_BANK]: usaaBankAccountStatementParser,
    [ParserType.USAA_CREDIT]: usaaCreditCardStatementParser,
};

export type StatementPdf<SelectedParser extends ParserType = ParserType> = {
    parserInput: Parameters<typeof parsers[SelectedParser]['parser']>[0];
    type: SelectedParser;
};

export type ParsedPdf<SelectedParser extends ParserType = ParserType> =
    StatementPdf<SelectedParser> & {
        data: ParsedOutput;
    };

export async function parsePdfs(
    pdfs: Readonly<Readonly<StatementPdf>[]>,
    debug = false,
): Promise<Readonly<Readonly<ParsedPdf>[]>> {
    if (debug) {
        setDebug(true);
    }
    const parsedPdfs: Readonly<Readonly<ParsedPdf>[]> = await Promise.all(
        pdfs.map(async (pdf) => {
            return {
                ...pdf,
                data: await parsers[pdf.type].parser(pdf.parserInput),
            };
        }),
    );

    return parsedPdfs;
}
