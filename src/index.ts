import {ParsedOutput} from './parsers/base-parser';
import {usaaBankAccountParse} from './parsers/usaa-bank-account-parser';
import {chaseCreditCardParse} from './parsers/chase-credit-card-parser';
import {citiCostcoCreditCardParse} from './parsers/citi-costco-credit-card-parser';
import {usaaCreditCardParse} from './parsers/usaa-credit-card-parser';
import {getEnumTypedValues} from './util/object';
import {setDebug} from './config';

export {ParsedTransaction, ParsedOutput} from './parsers/base-parser';
export {UsaaBankAccountTransaction, UsaaBankOutput} from './parsers/usaa-bank-account-parser';
export {UsaaCreditCardTransaction, UsaaCreditOutput} from './parsers/usaa-credit-card-parser';

/**
 * Most bank statements use a abbreviated year number, for example: 18 for 2018.
 * So we have to make an assumption here as to what millennium the statement is from.
 * This can be altered from both the CLI and the module export interface.
 * See README for additional details.
 **/
export const DEFAULT_YEAR_PREFIX = 20;

export enum ParserType {
    CHASE_CREDIT = 'chase-credit',
    CITI_COSTCO_CREDIT = 'citi-costco-credit',
    USAA_BANK = 'usaa-bank',
    USAA_CREDIT = 'usaa-credit',
}

export function isParserType(x: any): x is ParserType {
    if (typeof x === 'string' && (getEnumTypedValues(ParserType) as string[]).includes(x)) {
        return true;
    }

    return false;
}

export const parsers = {
    [ParserType.CHASE_CREDIT]: chaseCreditCardParse,
    [ParserType.CITI_COSTCO_CREDIT]: citiCostcoCreditCardParse,
    [ParserType.USAA_BANK]: usaaBankAccountParse,
    [ParserType.USAA_CREDIT]: usaaCreditCardParse,
};

export type StatementPdf = {
    path: string;
    type: keyof typeof parsers;
    yearPrefix?: number;
};

export type ParsedPdf = StatementPdf & {
    data: ParsedOutput;
};

export async function parsePdfs(pdfs: StatementPdf[], debug = false): Promise<ParsedPdf[]> {
    if (debug) {
        setDebug(true);
    }
    const parsedPdfs: ParsedPdf[] = await Promise.all(
        pdfs.map(async pdf => {
            return {
                ...pdf,
                data: await parsers[pdf.type](
                    pdf.path,
                    pdf.yearPrefix == undefined ? DEFAULT_YEAR_PREFIX : pdf.yearPrefix,
                ),
            };
        }),
    );

    return parsedPdfs;
}
