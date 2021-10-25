# statement-parser

[![tests](https://github.com/electrovir/statement-parser/workflows/tests/badge.svg)](https://github.com/electrovir/statement-parser/actions/workflows/master-tests.yml)

Parse bank and credit card statements.

For English USD only (currently at least).

See the [Parsers](#parsers) section below for the available parsers.

**DISCLAIMER**: I don't necessarily have sufficient data for all of the contained parsers to cover edge cases. See the [Development](#development) section for how to contribute.

# Usage

Install from the [`statement-parser` npm package](https://www.npmjs.com/package/statement-parser).

```sh
npm i statement-parser
```

Currently tested on Node.js versions 12.x and 14.x in combination with the latest macOS, Ubuntu, and Windows.

## Api

The high level most useful api function is the asynchronous [`parsePdfs`](https://github.com/electrovir/statement-parser/tree/master/src/parser/parse-api.ts) function. Simply pass in an array that has details for each PDF file you wish to parse. Note that there is no synchronous alternative.

<!-- example-link: src/readme-examples/api-simple-parse.example.ts -->

```TypeScript
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

`parsePdfs` accepts an array of [`StatementPdf`](https://github.com/electrovir/statement-parser/tree/master/src/parser/parse-api.ts) objects. Thus, each element in the array should look like the following:

<!-- example-link: src/readme-examples/api-simple-parse-inputs.example.ts -->

```TypeScript
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

<!-- example-link: src/readme-examples/parser-type.example.ts -->

```TypeScript
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

    <!-- example-link: src/readme-examples/all-options.example.ts -->

    ```TypeScript
    import {parsePdfs, ParserType} from 'statement-parser';

    parsePdfs([
        {
            parserInput: {
                /** FilePath is always required. What would the parser do without it? */
                filePath: 'my/paypal/file.pdf',
                /**
                 * Optional name property to help identify the pdf if any errors occur. (By default file
                 * paths will be used in errors so this is only for human readability if desired.)
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
                    /** Every parser includes this option. See Year prefix section in the README for details. */
                    yearPrefix: 19,
                },
            },
            /** Type is always required. Without it, the package doesn't know which parser to use. */
            type: ParserType.Paypal,
        },
        {
            parserInput: {
                filePath: 'my/chase-prime-visa-credit/file.pdf',
                parserOptions: {
                    /**
                     * Example of an extra ParserType specific option that will change the parsing
                     * behavior. This option is not valid for any of the other parser types except for
                     * the ParserType.ChasePrimeVisaCredit parser.
                     */
                    includeMultiLineDescriptions: true,
                },
            },
            type: ParserType.ChasePrimeVisaCredit,
        },
    ]).then((result) => console.log(result));
    ```

-   If you're less familiar with asynchronous programming, here's a good way (but not the _only_ way) to deal with that:

    <!-- example-link: src/readme-examples/better-async.example.ts -->

    ```TypeScript
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

-   Parsing files can be done directly with a single parser:

    <!-- example-link: src/readme-examples/direct-parsing.example.ts -->

    ```TypeScript
    import {parsers, ParserType} from 'statement-parser';

    const parser = parsers[ParserType.Paypal];
    parser.parsePdf({filePath: 'my/paypal/file.pdf'}).then((result) => console.log(result));
    ```

-   With a single parser you can parse text lines directly (if somehow that's how your statements are stored), rather than using a PDF file:

    <!-- example-link: src/readme-examples/direct-text-parsing.example.ts -->

    ```TypeScript
    import {parsers, ParserType} from 'statement-parser';

    const parser = parsers[ParserType.Paypal];
    parser.parseText({textLines: ['text here', 'line 2 here', 'line 3', 'etc.']});
    ```

## Year prefix

**You don't even need to think about this option** unless you're parsing statements from the `1900`s or this package is somehow relevant still in the year `2100`.

Year prefix is an optional parser option. Many statements only include an abbreviated year (like `09` or `16`). As such, the first two digits of the full year, or "year prefix" must be assumed. This value defaults to `20`. Thus, any statements getting parsed from the year `2000` to the year `2099` (inclusive) don't need to set this option.

# Development

Contributions are welcome! This can take the form of one of the following:

-   adding [fixes to current parsers](#fixing-current-parsers)
-   creating [entirely new parsers](#creating-a-new-parser)
-   fixing or filing [bugs](#general-bug-fixes) (including sanitization bugs)

Each change must be accompanied by a new test to make sure that what you add does not get broken.

**Be extra careful to not commit any bank information along with your changes. Do not commit actual statement PDFs to the repo.** See the [sanitizing pdfs](#sanitizing-pdfs) section for steps on how to create sanitized, testable versions of statement PDFs that can be committed to the repo.

## Fixing current parsers

If you're encountering errors when parsing one of your statement PDFs (when hooked up to the correct `ParserType` for course), an already implemented parser may need fixing. This can be done through one of the following:

-   add a new parser option to handle an edge case
-   fix parser code to not fail in the first place

Make sure to add a sanitized file test (see [sanitizing pdfs](#sanitizing-pdfs)) and run tests (see [testing](#testing)) before committing.

## Creating a new parser

If you find that your statement PDF is coming from a bank or credit card that this package does even have a parser for yet, you can add that parser! See [`example-parser.ts`](https://github.com/electrovir/statement-parser/tree/master/src/parser/implemented-parsers/example-parser.ts) for a good starting point.

## General bug fixes

1. Add a test that fails because of the bug. See [Adding tests](#adding-tests) for details.
2. Verify that the test fails before fixing the bug.
3. Commit the new test.
4. Fix the bug.
5. Verify that your test from step 2 now passes and all other tests still pass. See [Running tests](#running-tests) for details.
6. Commit, push, open a PR!

## Sanitizing PDFs

1.  Run `npm run sanitize` with the relevant arguments.
    -   For argument help run the following: `npm run sanitize -- --help`
2.  **Extra super quadruple check** that the sanitized `.json` file does not contain any confidential information in it, such as names of people or businesses, exact transaction amounts, actual dates, etc.
    -   If there is confidential information, please [open a bug](https://github.com/electrovir/statement-parser/issues) or fix the bug.
3.  Run tests. (See [Running tests](#running-tests) for details.)
4.  Verify that your sanitized `.json` file has been added to the appropriate parser folder in `files/sample-files/sanitized`.
5.  Commit away!

## Testing

### Running tests

-   to run all TypeScript tests (usually all you need): `npm test`
-   to test a specific file: `npm run test:file path/to/file.ts`
    -   example: `npm run test:file repo-paths.ts`
-   to run _all_ repository tests (this is what runs in GitHub Actions): `npm run test:full`

### Adding tests

1. If it does not exist already, add a new `X.test.ts` file next to the file that contains the function to be tested, where `X` is the name of the file to be tested.
2. If it does not exist already, add a new `testGroup()` call (imported from `test-vir`) for the function that will be tested.
3. Add new `runTest` calls for the tests you want to add.

See other test files for examples, such as [`array.test.ts`](https://github.com/electrovir/statement-parser/tree/master/src/augments/array.test.ts).
