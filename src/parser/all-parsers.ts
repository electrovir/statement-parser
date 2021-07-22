import {getEnumTypedValues} from '../augments/object';
import {
    ChaseCreditCardParsingOptions,
    chasePrimeVisaCreditCardParser,
} from './implemented-parsers/chase-prime-visa-credit-card-parser';
import {citiCostcoVisaCreditCardParser} from './implemented-parsers/citi-costco-visa-credit-card-parser';
import {PaypalOutput, paypalStatementParser} from './implemented-parsers/paypal-parser';
import {
    usaaBankAccountStatementParser,
    UsaaBankOutput,
} from './implemented-parsers/usaa-bank-account-parser';
import {
    usaaVisaCreditCardStatementParser,
    UsaaVisaCreditOutput,
} from './implemented-parsers/usaa-visa-credit-card-parser';
import {ParsedOutput} from './parsed-output';
import {BaseParserOptions, CombineWithBaseParserOptions} from './parser-options';

export enum ParserType {
    ChasePrimeVisaCredit = 'chase-prime-visa-credit',
    CitiCostcoVisaCredit = 'citi-costco-visa-credit',
    UsaaBank = 'usaa-bank',
    UsaaVisaCredit = 'usaa-visa-credit',
    Paypal = 'paypal',
}

export function isParserType(x: any): x is ParserType {
    if (typeof x === 'string' && getEnumTypedValues(ParserType).includes(x as ParserType)) {
        return true;
    }

    return false;
}

export interface AllParserOptions extends Record<ParserType, Partial<BaseParserOptions>> {
    [ParserType.ChasePrimeVisaCredit]: Partial<
        CombineWithBaseParserOptions<ChaseCreditCardParsingOptions>
    >;
    [ParserType.CitiCostcoVisaCredit]: Partial<BaseParserOptions>;
    [ParserType.Paypal]: Partial<BaseParserOptions>;
    [ParserType.UsaaBank]: Partial<BaseParserOptions>;
    [ParserType.UsaaVisaCredit]: Partial<BaseParserOptions>;
}

export interface AllParserOutput extends Record<ParserType, ParsedOutput> {
    [ParserType.ChasePrimeVisaCredit]: ParsedOutput;
    [ParserType.CitiCostcoVisaCredit]: ParsedOutput;
    [ParserType.Paypal]: PaypalOutput;
    [ParserType.UsaaBank]: UsaaBankOutput;
    [ParserType.UsaaVisaCredit]: UsaaVisaCreditOutput;
}

export const parsers = {
    [ParserType.ChasePrimeVisaCredit]: chasePrimeVisaCreditCardParser,
    [ParserType.CitiCostcoVisaCredit]: citiCostcoVisaCreditCardParser,
    [ParserType.Paypal]: paypalStatementParser,
    [ParserType.UsaaBank]: usaaBankAccountStatementParser,
    [ParserType.UsaaVisaCredit]: usaaVisaCreditCardStatementParser,
} as const;

chasePrimeVisaCreditCardParser.parseText;
