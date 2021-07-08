export type BaseParserOptions = {
    /**
     * YearPrefix Most statements don't include the full year so we must pass in the first two
     * numbers of the year so we know what millennium we're in. Example: for the year 2010, use 20.
     * For 1991, use 19.
     */
    yearPrefix: number;
};

export const defaultBaseParserOptions: Required<Readonly<BaseParserOptions>> = {
    yearPrefix: 20,
} as const;

export type CombineWithBaseParserOptions<ParserOptions extends object | undefined = undefined> =
    Required<Readonly<(ParserOptions extends undefined ? {} : ParserOptions) & BaseParserOptions>>;

export function collapseDefaultParserOptions<ParserOptions extends object | undefined = undefined>(
    inputDefaultParserOptions?: Required<Readonly<ParserOptions>>,
): CombineWithBaseParserOptions<ParserOptions> {
    return {
        ...defaultBaseParserOptions,
        ...(inputDefaultParserOptions || {}),
    } as CombineWithBaseParserOptions<ParserOptions>;
}

export type ParserKeyword = string | RegExp;
