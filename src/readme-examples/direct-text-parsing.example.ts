import {parsers, ParserType} from '..';

const parser = parsers[ParserType.Paypal];
parser.parseText({textLines: ['text here', 'line 2 here', 'line 3', 'etc.']});
