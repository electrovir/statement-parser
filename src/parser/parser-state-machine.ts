import {IfEquals} from 'augment-vir';
import {
    createStateMachine,
    handleErrorFunction,
    nextStateFunction,
    performStateActionFunction,
} from 'fsm-vir';
import {InitOutput, ParsedOutput} from './parsed-output';
import {SharedParserFunctionInputs} from './parser-function';
import {
    BaseParserOptions,
    collapseDefaultParserOptions,
    CombineWithBaseParserOptions,
} from './parser-options';

export type performParseActionFunction<
    StateType,
    OutputType extends ParsedOutput,
    ParserOptions extends object | undefined = undefined,
> = (
    currentState: StateType,
    input: string,
    lastOutput: OutputType,
    parserOptions: CombineWithBaseParserOptions<ParserOptions>,
) => OutputType;

export type nextParseStateFunction<
    StateType,
    ParserOptions extends object | undefined = undefined,
> = (
    currentState: StateType,
    input: string,
    parserOptions: CombineWithBaseParserOptions<ParserOptions>,
) => StateType;

export type ParserInitInput<
    StateType,
    OutputType extends ParsedOutput,
    ParserOptions extends object | undefined = undefined,
> = {
    action: performParseActionFunction<StateType, OutputType, ParserOptions>;
    next: nextParseStateFunction<StateType, ParserOptions>;
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
    const handleError: handleErrorFunction<StateType, string, OutputType> = (error) => {
        const errorName = name ?? `${String(error.currentValue?.[0]).substring(0, 10)}...`;
        const printError = error.stack ?? error.message;
        throw new Error(`Error parsing ${errorName} at "${error.currentValue}": ${printError}`);
    };
    const defaultOptions: CombineWithBaseParserOptions<ParserOptions> =
        collapseDefaultParserOptions(defaultParserOptions);

    const parserOptions: CombineWithBaseParserOptions<ParserOptions> = {
        ...defaultOptions,
        ...(inputParserOptions ?? {}),
    };

    const baseOutput: ParsedOutput = {
        incomes: [],
        expenses: [],
        name,
        yearPrefix: parserOptions.yearPrefix,
        accountSuffix: '',
        endDate: undefined,
        startDate: undefined,
    };

    const startingOutput: Readonly<OutputType> = {
        ...baseOutput,
        ...(JSON.parse(JSON.stringify(initOutput || {})) as InitOutput<OutputType>),
    } as OutputType;

    const performStateAction: performStateActionFunction<StateType, string, OutputType> = (
        currentState,
        input,
        lastOutput,
    ) => {
        return action(currentState, input, lastOutput, parserOptions);
    };
    const calculateNextState: nextStateFunction<StateType, string> = (currentState, input) => {
        return next(currentState, input, parserOptions);
    };

    const stateMachine = createStateMachine<StateType, string, OutputType>({
        performStateAction,
        calculateNextState,
        initialState,
        endState,
        handleError,
        initialOutput: startingOutput,
    });

    return (inputs: Readonly<string[]>): Readonly<OutputType> => {
        const machineResult = stateMachine.runMachine(inputs);

        if (debug) {
            machineResult.logs.forEach((log) => {
                console.log(log);
            });
        }

        if (machineResult.aborted) {
            if (debug) {
                machineResult.errors.forEach((error) => {
                    console.error(error);
                });
            }
            throw new Error(machineResult.errors.join('\n'));
        }

        return machineResult.output;
    };
}
