# Statement Parser

Parse bank and credit card statements.

See the [Parsers](#parsers) section below for the available parsers.

Tests are not included as actual bank statement PDFs should, obviously, not be included anywhere in here and tests are useless without them.

**DISCLAIMER**: I don't necessarily have sufficient data for all of the contained parsers to cover edge cases. Feel free to submit issues or open pull requests to add or modify parsers as needed. Make sure to never accidentally commit sensitive information though (such as the bank statement PDFs that you're parsing). The `downloads` folder is intentionally git-ignored for this purpose: put files in there that shouldn't be committed.

# Usage

[statement-parser npm package](https://www.npmjs.com/package/statement-parser)

```sh
npm install statement-parser
```

## Script

```typescript
import {parsePdfs, ParsedPdf, ParserType} from 'statement-parser';

async function run() {
    return await parsePdfs([
        {
            path: 'downloads/myPdfs.pdf',
            type: ParserType.CHASE_CREDIT,
        },
        {
            path: 'downloads/myAncientStatement.pdf',
            type: ParserType.USAA_CREDIT,
            yearPrefix: 19,
        },
    ]);
}

run();
```

-   `path`: path to file to parse
-   `type`: parser to use to parse the file. See [Parsers](#parsers) section for details.
-   `yearPrefix`: optional parameter. See [Year Prefix](#year-prefix) section below for details.

`parsePdfs` accepts an array of this. While the CLI (explained below) accepts directories, this function does not. Directories must be expanded before passing files into this function.

See [dist/src/index.d.ts](dist/src/index.d.ts) (in the npm package) or [src/index.ts](src/index.ts) (in the git repo) for more types and helper functions.

## CLI

Accessible via npm scripts.

```sh
s-parse [-d] filePath parseType [-p yearPrefix]
```

-   `[-d]`: optional, indicates that the passed `filePath` is a directory and all pdfs therein should be read with the given settings.
-   `filePath`: path to file (or directory) to parse with the given settings.
-   `parseType`: the type of parser that should be used for this file. See [Parsers](#parsers) section for details.
-   `[-p yearPrefix]`: optional. See [Year Prefix](#year-prefix) section below for details.

The argument lists can be repeated indefinitely for multiple files or directories.

Example:

```sh
s-parse downloads/myPdf.pdf chase-credit -d downloads/citi citi-costco-credit downloads/myAncientStatement.pdf usaa-credit -p 19;
```

# Parsers

Currently built parsers are the following:

-   `'chase-credit'`: for credit card statements from Chase.
-   `'citi-costco-credit'`: for credit card statements from Citi for the Costco credit card.
-   `'usaa-bank'`: for checking and savings account statements with USAA.
-   `'usaa-credit'`: for credit card statements from USAA.

The string at the beginning of each bullet point is the parser key. This is to be used in the CLI `parserType` and the `type` parameter for file data passed to the `parsePdfs` function. When used in TypeScript, it is better to use the `ParserType` enum as shown below.

```typescript
// typescript usage
import {parsers, ParserType} from 'statement-parser';

const chaseCreditParser = parsers[ParserType.CHASE_CREDIT];
```

```sh
# CLI usage
s-parse downloads/myPdf.pdf chase-credit;
s-parse downloads/myPdf.pdf usaa-credit;
```

# Year Prefix

**You don't even need to think about this parameter** unless you're parsing statements from the `1900`s or this somehow lasts till the year `2100`.

Year prefix is an optional parameter in both the script and CLI usages. As most statements only include an abbreviated year (like `09` or `16`), the millennium, or "year prefix" must be assumed. This value is defaulted to `20`. Thus, any statements getting parsed from the year `2000` to the year `2099` (inclusive) don't need to set this parameter.
