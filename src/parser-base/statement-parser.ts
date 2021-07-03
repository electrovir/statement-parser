import {ParsedOutput} from './parsed-output';

/**
 * @param filePath Path of pdf to read
 * @param yearPrefix Most statements don't include the full year so we must pass in the first two
 *   numbers of the year so we know what millennium we're in. Example: for the year 2010, use 20.
 *   For 1991, use 19.
 */
export type StatementParser<
    OutputType extends ParsedOutput,
    ParserOptions extends object | undefined = undefined,
> = (
    filePath: string,
    yearPrefix: number,
    options?: Readonly<Partial<ParserOptions>>,
) => Promise<Readonly<OutputType>>;
