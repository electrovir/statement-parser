import {parsePdfs, ParserType} from '..';

parsePdfs([
    {
        parserInput: {
            filePath: 'files/downloads/myPdf.pdf',
        },
        type: ParserType.ChasePrimeVisaCredit,
    },
]).then((results) => console.log(results));
