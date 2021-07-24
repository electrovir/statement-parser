import {AllParserOptions, parsers, ParserType} from './all-parsers';
import {ParsedOutput} from './parsed-output';
import {ParsePdfFunctionInput} from './parser-function';

export type StatementPdf =
    | {
          parserInput: ParsePdfFunctionInput<AllParserOptions[ParserType.ChasePrimeVisaCredit]>;
          /** Type is always required. Without it, the package doesn't know which parser to use. */
          type: ParserType.ChasePrimeVisaCredit;
      }
    | {
          parserInput: ParsePdfFunctionInput<AllParserOptions[ParserType.CitiCostcoVisaCredit]>;
          /** Type is always required. Without it, the package doesn't know which parser to use. */
          type: ParserType.CitiCostcoVisaCredit;
      }
    | {
          parserInput: ParsePdfFunctionInput<AllParserOptions[ParserType.UsaaBank]>;
          /** Type is always required. Without it, the package doesn't know which parser to use. */
          type: ParserType.UsaaBank;
      }
    | {
          parserInput: ParsePdfFunctionInput<AllParserOptions[ParserType.UsaaVisaCredit]>;
          /** Type is always required. Without it, the package doesn't know which parser to use. */
          type: ParserType.UsaaVisaCredit;
      }
    | {
          parserInput: ParsePdfFunctionInput<AllParserOptions[ParserType.Paypal]>;
          /** Type is always required. Without it, the package doesn't know which parser to use. */
          type: ParserType.Paypal;
      };

export type ParsedPdf = Readonly<
    StatementPdf & {
        data: ParsedOutput;
    }
>;

export async function parsePdfs(
    pdfs: StatementPdf[],
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
