import {ParsedOutput} from './parsed-output';
import {CombineWithBaseParserOptions} from './parser-options';

export type SharedParserFunctionInputs<ParserOptions extends object | undefined> = {
    /**
     * Optional debug property to see LOTS of output which shows the internal state machine
     * progressing over each line of the file.
     */
    debug?: boolean | undefined;
    /**
     * Optional input that provides additional parser configuration. Each parser type has slightly
     * different parser options.
     */
    parserOptions?: Partial<CombineWithBaseParserOptions<ParserOptions>> | undefined;
    /**
     * Optional name property to help identify the pdf if any errors occur. (By default file paths
     * will be used in errors so this is only for human readability if desired.)
     */
    name?: string | undefined;
};

/** Parse PDF files directly. */

export type ParsePdfFunctionInput<ParserOptions extends object | undefined = undefined> = {
    /** FilePath is always required. What would the parser do without it? */
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
