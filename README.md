# Statement Parser v0.0.0

Parse bank and credit card statements.

For English USD only (currently at least).

See the [Parsers](#parsers) section below for the available parsers.

**DISCLAIMER**: I don't necessarily have sufficient data for all of the contained parsers to cover edge cases. See the [Development](#development) section for how to contribute.

# Usage

Install from the [statement-parser npm package](https://www.npmjs.com/package/statement-parser).

```sh
npm i statement-parser
```

## Api

The high level, most common function to be used is the asynchronous `parsePdfs` function. Simply pass in an array that has details for each PDF file you wish to parse. Note that there is no synchronous alternative. See the example below which is parsing two different files:

<!-- api-simple-parse.example.ts -->

```typescript
import {parsePdfs, ParserType} from '..';

parsePdfs([
    {
        parserInput: {
            filePath: 'files/downloads/myPdf.pdf',
        },
        type: ParserType.ChasePrimeVisaCredit,
    },
]).then((results) => console.log(results));
```

`parsePdfs` accepts an array of [`StatementPdf`](https://github.com/electrovir/statement-parser/tree/master/src/parser/parse-api.ts) objects. This means each element in the array should look like the following:

<!-- api-simple-parse-inputs.example.ts -->

```typescript
import {ParserType} from '../parser/all-parsers';
import {StatementPdf} from '../parser/parse-api';

const myPdfToParse: StatementPdf = {
    parserInput: {
        /**
         * This is the only necessary parserInput property. For more examples of parserInput (such
         * as parserOptions), see the Examples section in the README.
         */
        filePath: 'my/file/path.pdf',
    },
    /**
     * Any ParserType can be assigned to the "type" property. See the Parsers section in the README
     * for more information.
     */
    type: ParserType.CitiCostcoVisaCredit,
};
```

For more examples see the [Examples](#examples) section.

## Parsers

Currently built parsers are the following:

-   **`ParserType.ChasePrimeVisaCredit`**: for credit card statements from Chase for the Amazon Prime Visa credit card.
-   **`ParserType.CitiCostcoVisaCredit`**: for credit card statements from Citi for the Costco Visa credit card.
-   **`ParserType.UsaaBank`**: for checking and savings account statements with USAA.
-   **`ParserType.UsaaVisaCredit`**: for Visa credit card statements from USAA.
-   **`ParserType.Paypal`**: for statements from PayPal.

Simply import `ParserType` to use these keys, as shown below and in the other [Examples](#examples) in this README:

<!-- parser-type.example.ts -->

```typescript
import {ParserType} from 'statement-parser';

// possible ParserType keys
ParserType.ChasePrimeVisaCredit;
ParserType.CitiCostcoVisaCredit;
ParserType.UsaaBank;
ParserType.UsaaVisaCredit;
ParserType.Paypal;
```

## Examples

<!-- TODO put examples here -->

## Year Prefix

**You don't even need to think about this parameter** unless you're parsing statements from the `1900`s or this somehow lasts till the year `2100`.

Year prefix is an optional parameter in both the script and CLI usages. As most statements only include an abbreviated year (like `09` or `16`), the millennium, or "year prefix" must be assumed. This value defaults to `20`. Thus, any statements getting parsed from the year `2000` to the year `2099` (inclusive) don't need to override this parameter.

# Development

See [example-parser](src/parsers/example-parser.ts) in the git repo for a starting point.
