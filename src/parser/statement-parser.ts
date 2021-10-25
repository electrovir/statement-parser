import {flatten2dArray} from 'augment-vir';
import {readPdf} from '../pdf/read-pdf';
import {ParsedOutput} from './parsed-output';
import {
    ParsePdfFunction,
    ParsePdfFunctionInput,
    ParseTextFunction,
    ParseTextFunctionInput,
} from './parser-function';
import {ParserKeyword} from './parser-options';
import {
    createParserStateMachine,
    CreateStateMachineInput,
    ParserInitInput,
} from './parser-state-machine';

export type ConvertPdfToTextFunction = (filePath: string) => Promise<string[]>;

export type StatementParser<
    OutputType extends ParsedOutput,
    ParserOptions extends object | undefined = undefined,
> = {
    parsePdf: ParsePdfFunction<OutputType, ParserOptions>;
    parseText: ParseTextFunction<OutputType, ParserOptions>;
    convertPdfToText: (filePath: string) => Promise<string[]>;
    parserKeywords: ParserKeyword[];
};

export type CreateStatementParserInput<
    StateType,
    OutputType extends ParsedOutput,
    ParserOptions extends object | undefined = undefined,
> = {
    pdfProcessing?: (filePath: string) => Promise<string[][]> | string[][];
    outputValidation?: (output: OutputType) => void;
    /** Keywords are used to preserve phrases in the statement text when sanitizing it for a test. */
    parserKeywords: ParserKeyword[];
} & ParserInitInput<StateType, OutputType, ParserOptions>;

export const createStatementParserInputDefault: Required<
    Pick<CreateStatementParserInput<unknown, ParsedOutput>, 'pdfProcessing'>
> = {
    async pdfProcessing(filePath: string): Promise<string[][]> {
        return await readPdf(filePath);
    },
};

export function createStatementParser<
    StateType,
    OutputType extends ParsedOutput,
    ParserOptions extends object | undefined = undefined,
>(
    rawInputs: Readonly<CreateStatementParserInput<StateType, OutputType, ParserOptions>>,
): Readonly<StatementParser<OutputType, ParserOptions>> {
    const inputs: Readonly<CreateStatementParserInput<StateType, OutputType, ParserOptions>> = {
        ...createStatementParserInputDefault,
        ...rawInputs,
    };

    const pdfProcessing = inputs.pdfProcessing;

    if (!pdfProcessing) {
        throw new Error('Missing pdf processing method');
    }

    const parseText: ParseTextFunction<OutputType, ParserOptions> = ({
        textLines,
        parserOptions: inputParserOptions,
        debug,
        name,
    }: ParseTextFunctionInput<ParserOptions>) => {
        const stateMachineInputs: Readonly<
            CreateStateMachineInput<StateType, OutputType, ParserOptions>
        > = {
            // ParserInitInput is a subtype of inputs' type
            ...(inputs as ParserInitInput<StateType, OutputType, ParserOptions>),
            name,
            debug,
            parserOptions: inputParserOptions,
        };

        const runStateMachine = createParserStateMachine<StateType, OutputType, ParserOptions>(
            stateMachineInputs,
        );

        const output = runStateMachine(textLines);

        if (inputs.outputValidation) {
            inputs.outputValidation(output);
        }

        return output;
    };

    const convertPdfToText: ConvertPdfToTextFunction = async (
        filePath: string,
    ): Promise<string[]> => {
        const pdfPages = await pdfProcessing(filePath);
        const textLines = flatten2dArray(pdfPages);

        return textLines;
    };

    const parsePdf: ParsePdfFunction<OutputType, ParserOptions> = async ({
        filePath,
        parserOptions: inputParserOptions,
        debug,
    }: Readonly<ParsePdfFunctionInput<ParserOptions>>) => {
        const textLines = await convertPdfToText(filePath);

        return parseText({
            parserOptions: inputParserOptions,
            debug,
            name: filePath,
            textLines,
        });
    };

    const defaultParserOptionsWrapper = inputs.defaultParserOptions
        ? {defaultParserOptions: inputs.defaultParserOptions}
        : {};

    const returnValue: Readonly<StatementParser<OutputType, ParserOptions>> = {
        parsePdf,
        parseText,
        convertPdfToText,
        parserKeywords: inputs.parserKeywords,
        ...defaultParserOptionsWrapper,
    };

    return returnValue;
}
