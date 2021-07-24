import {parsePdfs, ParserType} from '..';

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
                /** Every parser includes this property. See Year prefix section in the README for details. */
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
