import {getEnumTypedValues} from '../augments/object';
import {chaseCreditCardParser} from './implemented-parsers/chase-credit-card-parser';
import {citiCostcoCreditCardParser} from './implemented-parsers/citi-costco-credit-card-parser';
import {paypalStatementParser} from './implemented-parsers/paypal-parser';
import {usaaBankAccountStatementParser} from './implemented-parsers/usaa-bank-account-parser';
import {usaaCreditCardStatementParser} from './implemented-parsers/usaa-credit-card-parser';

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
} as const;
