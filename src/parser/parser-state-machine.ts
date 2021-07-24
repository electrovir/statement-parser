import {IfEquals} from '../augments/type';
import {InitOutput, ParsedOutput} from './parsed-output';
import {SharedParserFunctionInputs} from './parser-function';
import {
    BaseParserOptions,
    collapseDefaultParserOptions,
    CombineWithBaseParserOptions,
} from './parser-options';

export type performStateActionFunction<
    StateType,
    OutputType extends ParsedOutput,
    ParserOptions extends object | undefined = undefined,
> = (
    currentState: StateType,
    input: string,
    lastOutput: OutputType,
    parserOptions: CombineWithBaseParserOptions<ParserOptions>,
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
    initOutput?: Readonly<InitOutput<OutputType>>;
    defaultParserOptions?: IfEquals<
        ParserOptions,
        BaseParserOptions,
        undefined,
        Readonly<Required<ParserOptions>>
    >;
};

export type CreateStateMachineInput<
    StateType,
    OutputType extends ParsedOutput,
    ParserOptions extends object | undefined = undefined,
> = ParserInitInput<StateType, OutputType, ParserOptions> &
    SharedParserFunctionInputs<ParserOptions>;

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
    name,
    initOutput,
    parserOptions: inputParserOptions,
    defaultParserOptions,
    debug = false,
}: Readonly<
    CreateStateMachineInput<StateType, OutputType, ParserOptions>
>): StateMachineParserFunction<OutputType> {
    return (inputs: Readonly<string[]>): Readonly<OutputType> => {
        let state: StateType = initialState;
        let iterator = inputs[Symbol.iterator]();

        const errorName = name ?? `${inputs[0].substring(0, 10)}...`;

        const defaultOptions: CombineWithBaseParserOptions<ParserOptions> =
            collapseDefaultParserOptions(defaultParserOptions);

        const parserOptions: CombineWithBaseParserOptions<ParserOptions> = {
            ...defaultOptions,
            ...(inputParserOptions ?? {}),
        };

        const startingOutput: ParsedOutput = {
            incomes: [],
            expenses: [],
            name,
            yearPrefix: parserOptions.yearPrefix,
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
                if (debug) {
                    console.error(output);
                }
                throw new Error(`Reached end of input before hitting end state on "${errorName}"`);
            }

            const input: string = nextInput.value;

            if (debug) {
                console.log(`state: "${state}", input: "${input}"`);
            }
            try {
                output = action(state, input, output, parserOptions);
                state = next(state, input);
            } catch (error) {
                error.message += ` in: "${errorName}"`;
                throw error;
            }
        }

        if (!output.accountSuffix) {
            const message = `Parse completed without filling in account suffix on "${errorName}"`;
            if (debug) {
                console.error(output);
            }
            console.error(message);
            throw new Error(message);
        }

        return output;
    };
}
