import {DEBUG} from '../config';
import {InitOutput, ParsedOutput} from './parsed-output';

export type performStateActionFunction<
    StateType,
    OutputType extends ParsedOutput,
    ParserOptions extends object | undefined = undefined,
> = (
    currentState: StateType,
    input: string,
    yearPrefix: number,
    lastOutput: OutputType,
    parserOptions?: Required<Readonly<ParserOptions>>,
) => OutputType;
export type nextStateFunction<StateType> = (currentState: StateType, input: string) => StateType;

export type ParserInitInput<
    StateType,
    OutputType extends ParsedOutput,
    ParserOptions extends object | undefined = undefined,
> = {
    action: performStateActionFunction<StateType, OutputType, ParserOptions>;
    next: nextStateFunction<StateType>;
    endState: StateType;
    initialState: StateType;
    initOutput?: InitOutput<OutputType>;
} & (ParserOptions extends undefined
    ? {defaultParserOptions?: undefined}
    : {
          defaultParserOptions: Required<Readonly<ParserOptions>>;
      });

export type CreateStateMachineInput<
    StateType,
    OutputType extends ParsedOutput,
    ParserOptions extends object | undefined = undefined,
> = ParserInitInput<StateType, OutputType, ParserOptions> & {
    filePath: string;
    yearPrefix: number;
    inputParserOptions?: Readonly<Partial<ParserOptions>>;
};

export type StateMachineParserFunction<OutputType extends ParsedOutput> = (
    inputs: Readonly<string[]>,
) => Readonly<OutputType>;

/**
 * This creates a state machine. The state machine is a Mealy machine but outputs are generated
 * independent of the state transition. As you can see in the arguments, the "action" function
 * (which generates outputs) is distinct from the "next" function, which calculates the next state.
 * The implementation of "action" is of course left to you though, so you can totally just ignore
 * the current value and make this a Moore machine.
 */
export function createParserStateMachine<
    StateType,
    OutputType extends ParsedOutput,
    ParserOptions extends object | undefined = undefined,
>({
    action,
    next,
    initialState,
    endState,
    filePath,
    yearPrefix,
    initOutput,
    inputParserOptions,
    defaultParserOptions,
}: Readonly<
    CreateStateMachineInput<StateType, OutputType, ParserOptions>
>): StateMachineParserFunction<OutputType> {
    return (inputs: Readonly<string[]>): Readonly<OutputType> => {
        let state: StateType = initialState;
        let iterator = inputs[Symbol.iterator]();
        const defaultOptions: Required<Readonly<ParserOptions>> | undefined =
            defaultParserOptions as
                | undefined
                /**
                 * This cast is needed because Typescript is too smart about the conditional type in
                 * ParserInitInput and defaultParserOptions gets turned into just "object"
                 */
                | Required<Readonly<ParserOptions>>;
        const parserOptions: Required<Readonly<ParserOptions>> | undefined = defaultOptions
            ? {
                  ...defaultOptions,
                  ...(inputParserOptions ?? {}),
              }
            : undefined;

        const startingOutput: ParsedOutput = {
            incomes: [],
            expenses: [],
            filePath,
            accountSuffix: '',
            endDate: undefined,
            startDate: undefined,
        };
        // no mutations!
        // note this will break function properties on OutputType
        let output: OutputType = {
            ...startingOutput,
            ...(JSON.parse(JSON.stringify(initOutput || {})) as InitOutput<OutputType>),
        } as OutputType;

        while (state !== endState) {
            const nextInput = iterator.next();

            if (nextInput.done) {
                if (DEBUG) {
                    console.error(output);
                }
                throw new Error(
                    `Reached end of input before hitting end state on ${output.filePath}`,
                );
            }

            const input: string = nextInput.value;

            if (DEBUG) {
                console.log(`state: "${state}", input: "${input}"`);
            }
            try {
                output = action(state, input, yearPrefix, output, parserOptions);
                state = next(state, input);
            } catch (error) {
                error.message += ` in file: ${filePath}`;
                throw error;
            }
        }

        if (!output.accountSuffix) {
            const message = `Parse completed without filling in account suffix on ${output.filePath}`;
            if (DEBUG) {
                console.error(output);
            }
            console.error(message);
            throw new Error(message);
        }

        return output;
    };
}
