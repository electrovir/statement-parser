import {DEBUG} from '../config';

/**
 * @param filePath    path of pdf to read
 * @param yearPrefix  most statements don't include the full year so we must pass in the first two numbers of the year
 *                    so we know what millennium we're in.
 *                    Example: for the year 2010, use 20. For 1991, use 19.
 **/
export type PdfParse<OutputType extends ParsedOutput> = (filePath: string, yearPrefix: number) => Promise<OutputType>;

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

export type performStateActionFunction<StateType, ValueType, OutputType extends ParsedOutput> = (
    currentState: StateType,
    input: ValueType,
    yearPrefix: number,
    lastOutput: OutputType,
) => OutputType;
export type nextStateFunction<StateType, ValueType> = (currentState: StateType, input: ValueType) => StateType;

/**
 * This creates a state machine. The state machine is a Mealy machine but outputs are generated independent
 * of the state transition.
 * As you can see in the arguments, the "action" function (which generates outputs) is distinct from the "next"
 * function, which calculates the next state. The implementation of "action" is of course left to you though,
 * so you can totally just ignore the current value and make this a Moore machine.
 */
export function createParserStateMachine<StateType, ValueType, OutputType extends ParsedOutput>(
    action: performStateActionFunction<StateType, ValueType, OutputType>,
    next: nextStateFunction<StateType, ValueType>,
    initialState: StateType,
    endState: StateType,
    yearPrefix: number,
    initOutput?: OutputType,
) {
    return (inputs: ValueType[]) => {
        let state = initialState;
        let iterator = inputs[Symbol.iterator]();
        // no mutations!
        // note this will break function properties
        let output: OutputType = JSON.parse(JSON.stringify(initOutput));

        while (state !== endState) {
            const nextInput = iterator.next();

            if (nextInput.done) {
                if (DEBUG) {
                    console.warn(output);
                }
                console.warn(`Reached end of input before hitting end state on ${output.filePath}`);
                break;
            }

            const input: ValueType = nextInput.value;

            if (DEBUG) {
                console.log(`state: "${state}", input: "${input}"`);
            }
            try {
                output = action(state, input, yearPrefix, output);
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
