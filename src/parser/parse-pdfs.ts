import {parsers, ParserType} from './all-parsers';
import {ParsedOutput} from './parsed-output';

export type StatementPdf<SelectedParser extends ParserType = ParserType> = {
    parserInput: Parameters<typeof parsers[SelectedParser]['parsePdf']>[0];
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
