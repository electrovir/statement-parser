import {deDupeRegExFlags} from './regexp';
export function collapseSpaces(input: string): string {
    return input.trim().replace(/\s{2,}/g, ' ');
}

export function sanitizeNumberString(input: string): string {
    return input.replace(/,/g, '');
}

export function allIndexesOf(
    searchIn: string,
    searchForInput: string | RegExp,
    /**
     * CaseSensitive only applies when the input is a string. Otherwise, the RegExp's "i" flag is
     * used to determine case sensitivity.
     */
    caseSensitive: boolean,
): number[] {
    const regExpFlags: string = `g${
        !caseSensitive && typeof searchForInput === 'string' ? 'i' : ''
    }`;
    const searchFor: RegExp =
        searchForInput instanceof RegExp
            ? new RegExp(
                  searchForInput.source,
                  deDupeRegExFlags(`${searchForInput.flags}${regExpFlags}`),
              )
            : new RegExp(escapeForRegExp(searchForInput), regExpFlags);

    const indexes: number[] = [];

    searchIn.replace(searchFor, (...matchResults: (string | number)[]): string => {
        /**
         * Grabbing the second to last entry in the array (rather than the second) takes capture
         * groups into account.
         */
        const matchIndex: string | number = matchResults[matchResults.length - 2];

        if (typeof matchIndex !== 'number') {
            throw new Error(
                `Match index "${matchIndex}" is not a number. Searching for "${searchForInput}" in "${searchIn}".`,
            );
        }
        indexes.push(matchIndex);

        const originalMatch = matchResults[0];

        if (typeof originalMatch !== 'string') {
            throw new Error(
                `Original match when searching for "${searchForInput}" in "${searchIn}" at index ${matchIndex} is not a string.`,
            );
        }
        /**
         * Don't actually change any text. What we do here doesn't matter because we're not using
         * the output of the .replace method, we're just producing side effects.
         */
        return originalMatch;
    });

    return indexes;
}

export function replaceStringAtIndex(
    originalString: string,
    start: number,
    newString: string,
    length = newString.length,
): string {
    const before = originalString.substring(0, start);
    const after = originalString.substring(start + length);

    return `${before}${newString}${after}`;
}

export function escapeForRegExp(input: string): string {
    return input.replace(/[\^$\\.*+?()[\]{}|]/g, '\\$&');
}
