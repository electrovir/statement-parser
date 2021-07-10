import {getEnumTypedValues} from '../augments/object';
import {
    chaseCreditCardParser,
    ChaseCreditCardParsingOptions,
} from './implemented-parsers/chase-credit-card-parser';
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
    ChaseCredit = 'chase-credit',
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
    [ParserType.ChaseCredit]: Partial<CombineWithBaseParserOptions<ChaseCreditCardParsingOptions>>;
    [ParserType.CitiCostcoVisaCredit]: Partial<BaseParserOptions>;
    [ParserType.Paypal]: Partial<BaseParserOptions>;
    [ParserType.UsaaBank]: Partial<BaseParserOptions>;
    [ParserType.UsaaVisaCredit]: Partial<BaseParserOptions>;
}

export interface AllParserOutput extends Record<ParserType, ParsedOutput> {
    [ParserType.ChaseCredit]: ParsedOutput;
    [ParserType.CitiCostcoVisaCredit]: ParsedOutput;
    [ParserType.Paypal]: PaypalOutput;
    [ParserType.UsaaBank]: UsaaBankOutput;
    [ParserType.UsaaVisaCredit]: UsaaVisaCreditOutput;
}

export const parsers = {
    [ParserType.ChaseCredit]: chaseCreditCardParser,
    [ParserType.CitiCostcoVisaCredit]: citiCostcoVisaCreditCardParser,
    [ParserType.Paypal]: paypalStatementParser,
    [ParserType.UsaaBank]: usaaBankAccountStatementParser,
    [ParserType.UsaaVisaCredit]: usaaVisaCreditCardStatementParser,
} as const;

chaseCreditCardParser.parseText;
