import {ParsedOutput} from './parsed-output';
import {CombineWithBaseParserOptions} from './parser-options';

export type ParseFunction<
    OutputType extends ParsedOutput,
    ParserOptions extends object | undefined = undefined,
> = (input: Readonly<ParseFunctionInputs<ParserOptions>>) => Promise<Readonly<OutputType>>;

export type ParseFunctionInputs<ParserOptions extends object | undefined = undefined> = {
    /** FilePath Path of pdf to read */
    filePath: string;
    /** Set to true to turn on additional logging */
    debug?: boolean;
    /** Parser options that vary based on the parser being used */
    inputParserOptions?: Partial<CombineWithBaseParserOptions<ParserOptions>>;
};
