import {parsers, ParserType} from '..';

const parser = parsers[ParserType.Paypal];
parser.parsePdf({filePath: 'my/paypal/file.pdf'}).then((result) => console.log(result));
