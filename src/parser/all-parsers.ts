import {getEnumTypedValues} from '../augments/object';
import {
    chaseCreditCardParser,
    ChaseCreditCardParsingOptions,
} from './implemented-parsers/chase-credit-card-parser';
import {citiCostcoCreditCardParser} from './implemented-parsers/citi-costco-credit-card-parser';
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
    CHASE_CREDIT = 'chase-credit',
    CITI_COSTCO_CREDIT = 'citi-costco-credit',
    USAA_BANK = 'usaa-bank',
    USAA_VISA_CREDIT = 'usaa-visa-credit',
    PAYPAL = 'paypal',
}

export function isParserType(x: any): x is ParserType {
    if (typeof x === 'string' && getEnumTypedValues(ParserType).includes(x as ParserType)) {
        return true;
    }

    return false;
}

export interface AllParserOptions extends Record<ParserType, Partial<BaseParserOptions>> {
    [ParserType.CHASE_CREDIT]: Partial<CombineWithBaseParserOptions<ChaseCreditCardParsingOptions>>;
    [ParserType.CITI_COSTCO_CREDIT]: Partial<BaseParserOptions>;
    [ParserType.PAYPAL]: Partial<BaseParserOptions>;
    [ParserType.USAA_BANK]: Partial<BaseParserOptions>;
    [ParserType.USAA_VISA_CREDIT]: Partial<BaseParserOptions>;
}

export interface AllParserOutput extends Record<ParserType, ParsedOutput> {
    [ParserType.CHASE_CREDIT]: ParsedOutput;
    [ParserType.CITI_COSTCO_CREDIT]: ParsedOutput;
    [ParserType.PAYPAL]: PaypalOutput;
    [ParserType.USAA_BANK]: UsaaBankOutput;
    [ParserType.USAA_VISA_CREDIT]: UsaaVisaCreditOutput;
}

export const parsers = {
    [ParserType.CHASE_CREDIT]: chaseCreditCardParser,
    [ParserType.CITI_COSTCO_CREDIT]: citiCostcoCreditCardParser,
    [ParserType.PAYPAL]: paypalStatementParser,
    [ParserType.USAA_BANK]: usaaBankAccountStatementParser,
    [ParserType.USAA_VISA_CREDIT]: usaaVisaCreditCardStatementParser,
} as const;

chaseCreditCardParser.parseText;
