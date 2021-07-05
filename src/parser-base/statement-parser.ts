import {readPdf} from '../readPdf';
import {flatten2dArray} from '../util/array';
import {ParsedOutput} from './parsed-output';
import {ParseFunction, ParseFunctionInputs} from './parser-function';
import {
    createParserStateMachine,
    CreateStateMachineInput,
    ParserInitInput,
} from './parser-state-machine';

export type StatementParser<
    OutputType extends ParsedOutput,
    ParserOptions extends object | undefined = undefined,
> = {
    parser: ParseFunction<OutputType, ParserOptions>;
    keywords: (string | RegExp)[];
};

export type CreateStatementParserInput<
    StateType,
    OutputType extends ParsedOutput,
    ParserOptions extends object | undefined = undefined,
> = {
    pdfProcessing?: (filePath: string) => Promise<string[][]> | string[][];
    outputValidation?: (output: OutputType) => void;
    /** Keywords are used to preserve phrases in the statement text when sanitizing it for a test. */
    parserKeywords: (string | RegExp)[];
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

    const parser: ParseFunction<OutputType, ParserOptions> = async ({
        filePath,
        parserOptions,
    }: Readonly<ParseFunctionInputs<ParserOptions>>) => {
        if (!inputs.pdfProcessing) {
            throw new Error('Missing pdf processing method');
        }
        const pdfPages = await inputs.pdfProcessing(filePath);
        const statementLines = flatten2dArray(pdfPages);

        const stateMachineInputs: Readonly<
            CreateStateMachineInput<StateType, OutputType, ParserOptions>
        > = {
            // ParserInitInput is a subtype of inputs' type
            ...(inputs as ParserInitInput<StateType, OutputType, ParserOptions>),
            filePath,
            inputParserOptions: parserOptions,
        };

        const runStateMachine = createParserStateMachine<StateType, OutputType, ParserOptions>(
            stateMachineInputs,
        );

        const output = runStateMachine(statementLines);

        if (inputs.outputValidation) {
            inputs.outputValidation(output);
        }

        return output;
    };

    return {
        parser,
        keywords: inputs.parserKeywords,
    };
}
