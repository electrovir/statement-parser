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
