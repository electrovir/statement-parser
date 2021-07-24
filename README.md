# Statement Parser

[![tests](https://github.com/electrovir/statement-parser/workflows/tests/badge.svg)](https://github.com/electrovir/statement-parser/actions)

Parse bank and credit card statements.

For English USD only (currently at least).

See the [Parsers](#parsers) section below for the available parsers.

**DISCLAIMER**: I don't necessarily have sufficient data for all of the contained parsers to cover edge cases. See the [Development](#development) section for how to contribute.

# Usage

Install from the [statement-parser npm package](https://www.npmjs.com/package/statement-parser).

```sh
npm i statement-parser
```

Tested on Node.js versions 12.x and 14.x in combination with the latest macOS, Ubuntu, and Windows.

## Api

The high level, most common function to be used is the asynchronous `parsePdfs` function. Simply pass in an array that has details for each PDF file you wish to parse. Note that there is no synchronous alternative. See the example below which is parsing two different files:

<!-- api-simple-parse.example.ts -->

```typescript
import {parsePdfs, ParserType} from 'statement-parser';

parsePdfs([
    {
        parserInput: {
            filePath: 'files/downloads/myPdf.pdf',
        },
        type: ParserType.ChasePrimeVisaCredit,
    },
]).then((results) => console.log(results));
```

`parsePdfs` accepts an array of [`StatementPdf`](https://github.com/electrovir/statement-parser/tree/master/src/parser/parse-api.ts) objects. Each element in the array should look like the following:

<!-- api-simple-parse-inputs.example.ts -->

```typescript
import {ParserType, StatementPdf} from 'statement-parser';

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

-   There are extra parser inputs:

    <!-- all-options.example.ts -->

    ```typescript
    import {parsePdfs, ParserType} from 'statement-parser';

    parsePdfs([
        {
            parserInput: {
                filePath: 'my/paypal/file.pdf',
                /**
                 * Optional name property to help identify the pdf if any errors occur. (By default file
                 * names will be used in errors so this is only for human readability if desired.)
                 */
                name: 'pdf with all options',
                /**
                 * Optional debug property to see LOTS of output which shows the internal state machine
                 * progressing over each line of the file.
                 */
                debug: true,
                /**
                 * Optional input that provides additional parser configuration. Each parser type has
                 * slightly different parser options.
                 */
                parserOptions: {
                    /** See Year Prefix section in the README for details on this property. */
                    yearPrefix: 19,
                },
            },
            type: ParserType.Paypal,
        },
        {
            parserInput: {
                filePath: 'my/chase-prime-visa-credit/file.pdf',
                parserOptions: {
                    /**
                     * Example of extra, ParserType dependent, parser option that will change the
                     * parsing behavior.
                     */
                    includeMultiLineDescriptions: true,
                },
            },
            type: ParserType.ChasePrimeVisaCredit,
        },
    ]).then((result) => console.log(result));
    ```

-   If you're less familiar with asynchronous programming, here's a good way (not the _only_ way) to deal with that:

    <!-- better-async.example.ts -->

    ```typescript
    import {parsePdfs, ParserType} from 'statement-parser';

    async function main() {
        const results = await parsePdfs([
            {
                parserInput: {
                    filePath: 'my/paypal/file.pdf',
                },
                type: ParserType.Paypal,
            },
        ]);

        // do something with the result

        return results;
    }

    if (require.main === module) {
        main().catch((error) => {
            console.error(error);
            process.exit(1);
        });
    }
    ```

-   Parsing files directly with a single parser:

    <!-- direct-parsing.example.ts -->

    ```typescript
    import {parsers, ParserType} from 'statement-parser';

    const parser = parsers[ParserType.Paypal];
    parser.parsePdf({filePath: 'my/paypal/file.pdf'}).then((result) => console.log(result));
    ```

-   With a single parser you can parse text lines directly (if somehow that's how your statements are stored):

    <!-- direct-text-parsing.example.ts -->

    ```typescript
    import {parsers, ParserType} from 'statement-parser';

    const parser = parsers[ParserType.Paypal];
    parser.parseText({textLines: ['text here', 'line 2 here', 'line 3', 'etc.']});
    ```

## Year Prefix

**You don't even need to think about this parameter** unless you're parsing statements from the `1900`s or this somehow lasts till the year `2100`.

Year prefix is an optional parameter in both the script and CLI usages. As most statements only include an abbreviated year (like `09` or `16`), the millennium, or "year prefix" must be assumed. This value defaults to `20`. Thus, any statements getting parsed from the year `2000` to the year `2099` (inclusive) don't need to override this parameter.

# Development

Extra development work is welcome! This can take the form of one of the following:

-   adding [fixes to current parsers](#fixing-current-parsers)
-   creating [entirely new parsers](#creating-a-new-parser)
-   fixing or filing [general bugs](#general-bug-fixes) (including sanitization bugs)

Each change must be accompanied by a new test to make sure that what you add does not get broken.

**Be extra careful to not commit any bank information along with your changes. Do not commit actual statement PDFs to the repo.** See the [sanitizing pdfs](#sanitizing-pdfs) section for steps on how to create sanitized, testable versions of statement PDFs that can be committed to the repo.

## Fixing current parsers

If you're encountering errors when parsing one of your statement PDFs (if it's hooked up to the correct `ParserType`), do one of the following:

-   add a new parser option to handle the edge case
-   fix parser code to not fail in the first place

Make sure to add a sanitized file test (see [sanitizing pdfs](#sanitizing-pdfs) for details) and run tests (see [testing](#testing) for details) before committing.

## Creating a new parser

If you find that your statement type does not even have a parser implemented already, you can add one! See [`example-parser.ts`](https://github.com/electrovir/statement-parser/tree/master/src/parser/implemented-parsers/example-parser.ts) for a good starting point.

## General bug fixes

1. Add a test that fails before the bug fix. See [Adding tests](#adding-tests) for details.
2. Commit the new test separately.
3. Fix the bug.
4. Verify that all other tests still pass. See [Running tests](#running-tests) for details.
5. Commit and push!

## Sanitizing PDFs

1.  Run `npm run sanitize` on the statement PDF in question.
    -   For argument help run the following: `npm run sanitize -- --help`
2.  Extra super double check that the sanitized text does not contain any confidential information in it, such as names of people or businesses, exact transaction amounts, or dates.
    -   If it does, please [open a bug](https://github.com/electrovir/statement-parser/issues) or fix the bug.
3.  Run tests: `npm test`. See the [testing](#testing) section for more details.
4.  Verify that your sanitized `.json` output has been added to the appropriate parser folder in `files/sample-files/sanitized`.
5.  Commit away!

## Testing

### Running tests

-   to run all tests: `npm test`
-   to run a specific test: `npm run compile && test-vir dist/path-to/test-file.test.js`
    -   note that `dist` must be at the start of the file path.

### Adding tests

1. If it does not exist already, add a new `X.test.ts` file next to the file that will be tested, where `X` is the name of the file to be tested.
2. If it does not exist already, add a new `testGroup` call for the function that will be tested.
3. Add new `runTest` calls for the tests you want to add.

> v2.0.0
