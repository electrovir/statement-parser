import {ParsedOutput} from './parsed-output';
import {CombineWithBaseParserOptions} from './parser-options';

export type SharedParserFunctionInputs<ParserOptions extends object | undefined> = {
    /** Set to true to turn on additional logging */
    debug?: boolean;
    /** Parser options that vary based on the parser being used */
    parserOptions?: Partial<CombineWithBaseParserOptions<ParserOptions>>;
    /** Used to identify parsing errors. */
    name?: string;
};

/** Parse PDF files directly. */

export type ParsePdfFunctionInput<ParserOptions extends object | undefined = undefined> = {
    /** FilePath Path of pdf to read */
    filePath: string;
} & SharedParserFunctionInputs<ParserOptions>;

export type ParsePdfFunction<
    OutputType extends ParsedOutput,
    ParserOptions extends object | undefined = undefined,
> = (input: Readonly<ParsePdfFunctionInput<ParserOptions>>) => Promise<Readonly<OutputType>>;

/** Parse text directly. */

export type ParseTextFunctionInput<ParserOptions extends object | undefined = undefined> = {
    textLines: string[];
} & SharedParserFunctionInputs<ParserOptions>;

export type ParseTextFunction<
    OutputType extends ParsedOutput,
    ParserOptions extends object | undefined = undefined,
> = (input: Readonly<ParseTextFunctionInput<ParserOptions>>) => Readonly<OutputType>;
