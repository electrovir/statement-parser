import {AllParserOptions, parsers, ParserType} from './all-parsers';
import {ParsedOutput} from './parsed-output';
import {ParsePdfFunctionInput} from './parser-function';

export type StatementPdf<SelectedParser extends ParserType = ParserType> = {
    parserInput: ParsePdfFunctionInput<AllParserOptions[SelectedParser]>;
    type: SelectedParser;
};

export type ParsedPdf<SelectedParser extends ParserType = ParserType> =
    StatementPdf<SelectedParser> & {
        data: ParsedOutput;
    };

export async function parsePdfs(
    pdfs: Readonly<Readonly<StatementPdf>[]>,
    debug = false,
): Promise<Readonly<Readonly<ParsedPdf>[]>> {
    const parsedPdfs: Readonly<Readonly<ParsedPdf>[]> = await Promise.all(
        pdfs.map(async (pdf) => {
            return {
                ...pdf,
                data: await parsers[pdf.type].parsePdf({
                    debug,
                    ...pdf.parserInput,
                }),
            };
        }),
    );

    return parsedPdfs;
}
