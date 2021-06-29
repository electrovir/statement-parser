import {DEBUG} from '../config';

/**
 * @param filePath    path of pdf to read
 * @param yearPrefix  most statements don't include the full year so we must pass in the first two numbers of the year
 *                    so we know what millennium we're in.
 *                    Example: for the year 2010, use 20. For 1991, use 19.
 **/
export type PdfParse<OutputType extends ParsedOutput, ParserOptions extends object | undefined = undefined> = (
    filePath: string,
    yearPrefix: number,
    options?: Readonly<Partial<ParserOptions>>,
) => Promise<Readonly<OutputType>>;

export type ParsedTransaction = {
    date: Date;
    amount: number;
    description: string;
};

/**
 * Incomes vs Expenses means different thing for different account types
 *
 * Incomes
 *      For credit cards, an "income" transaction is a payment on the credit card
 *      For bank accounts or debit cards, an "income" is a deposit
 *
 * Expenses
 *      For credit cards, an "expense" is a purchase or credit charge
 *      For bank accounts or debit cards, an "expense" is a withdrawal or debit charge
 *
 * yearPrefix is the first two digits of the current year
 * accountSuffix is the last digits of the account number (this is usually 4 digits long)
 **/
export type ParsedOutput<T extends ParsedTransaction = ParsedTransaction> = {
    incomes: T[];
    expenses: T[];
    accountSuffix: string;
    filePath: string;
    startDate?: Date;
    endDate?: Date;
};

export type performStateActionFunction<
    StateType,
    ValueType,
    OutputType extends ParsedOutput,
    ParserOptions extends object | undefined = undefined,
> = (
    currentState: StateType,
    input: ValueType,
    yearPrefix: number,
    lastOutput: OutputType,
    parserOptions?: Required<Readonly<ParserOptions>>,
) => OutputType;
export type nextStateFunction<StateType, ValueType> = (currentState: StateType, input: ValueType) => StateType;

/**
 * This creates a state machine. The state machine is a Mealy machine but outputs are generated independent
 * of the state transition.
 * As you can see in the arguments, the "action" function (which generates outputs) is distinct from the "next"
 * function, which calculates the next state. The implementation of "action" is of course left to you though,
 * so you can totally just ignore the current value and make this a Moore machine.
 */
export function createParserStateMachine<
    StateType,
    ValueType,
    OutputType extends ParsedOutput,
    ParserOptions extends object | undefined = undefined,
>({
    action,
    next,
    initialState,
    endState,
    yearPrefix,
    initOutput,
    inputParserOptions,
    defaultParserOptions,
}:
    | {
          action: performStateActionFunction<StateType, ValueType, OutputType, ParserOptions>;
          next: nextStateFunction<StateType, ValueType>;
          initialState: StateType;
          endState: StateType;
          yearPrefix: number;
          initOutput?: OutputType;
          inputParserOptions?: undefined;
          defaultParserOptions?: undefined;
      }
    | {
          action: performStateActionFunction<StateType, ValueType, OutputType, ParserOptions>;
          next: nextStateFunction<StateType, ValueType>;
          initialState: StateType;
          endState: StateType;
          yearPrefix: number;
          initOutput?: OutputType;
          /**
           * If input parser options is used, default must also be used.
           */
          inputParserOptions: Partial<Readonly<ParserOptions>>;
          defaultParserOptions: Required<Readonly<ParserOptions>>;
      }
    | {
          action: performStateActionFunction<StateType, ValueType, OutputType, ParserOptions>;
          next: nextStateFunction<StateType, ValueType>;
          initialState: StateType;
          endState: StateType;
          yearPrefix: number;
          initOutput?: OutputType;
          inputParserOptions?: undefined;
          defaultParserOptions: Required<Readonly<ParserOptions>>;
      }) {
    return (inputs: ValueType[]) => {
        let state = initialState;
        let iterator = inputs[Symbol.iterator]();
        const parserOptions =
            defaultParserOptions && inputParserOptions
                ? {
                      ...defaultParserOptions,
                      ...inputParserOptions,
                  }
                : undefined;
        // no mutations!
        // note this will break function properties on OutputType
        let output: OutputType = JSON.parse(JSON.stringify(initOutput));

        while (state !== endState) {
            const nextInput = iterator.next();

            if (nextInput.done) {
                if (DEBUG) {
                    console.error(output);
                }
                throw new Error(`Reached end of input before hitting end state on ${output.filePath}`);
            }

            const input: ValueType = nextInput.value;

            if (DEBUG) {
                console.log(`state: "${state}", input: "${input}"`);
            }
            try {
                output = action(state, input, yearPrefix, output, parserOptions);
                state = next(state, input);
            } catch (error) {
                error.message += ` in file: ${output.filePath}`;
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
