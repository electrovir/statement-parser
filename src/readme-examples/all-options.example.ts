import {parsePdfs, ParserType} from '..';

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
