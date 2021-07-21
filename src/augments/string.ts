import {deDupeRegExFlags} from './regexp';
export function collapseSpaces(input: string): string {
    return input.trim().replace(/\s{2,}/g, ' ');
}

export function sanitizeNumberString(input: string): string {
    return input.replace(/,/g, '');
}

function makeCaseInsensitiveString(searchForInput: string | RegExp, caseSensitive: boolean) {
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

    return searchFor;
}

export function allIndexesOf(
    searchIn: string,
    searchForInput: string | RegExp,
    caseSensitive: boolean,
    includeLength: true,
): {index: number; length: number}[];
export function allIndexesOf(
    searchIn: string,
    searchForInput: string | RegExp,
    caseSensitive: boolean,
    includeLength?: false | undefined,
): number[];
export function allIndexesOf(
    searchIn: string,
    searchForInput: string | RegExp,
    /**
     * CaseSensitive only applies when the input is a string. Otherwise, the RegExp's "i" flag is
     * used to determine case sensitivity.
     */
    caseSensitive: boolean,
    includeLength = false,
): number[] | {index: number; length: number}[] {
    const searchFor: RegExp = makeCaseInsensitiveString(searchForInput, caseSensitive);

    const indexes: number[] = [];
    const indexesAndLengths: {index: number; length: number}[] = [];

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

        const regExpMatch = matchResults[0];

        if (typeof regExpMatch === 'number') {
            throw new Error(`regExpMatch should've been a string but was a number!`);
        }

        indexesAndLengths.push({index: matchIndex, length: regExpMatch.length});
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

    if (includeLength) {
        return indexesAndLengths;
    } else {
        return indexes;
    }
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

/** Same as String.prototype.split but includes the delimiter to split by in the output array. */
export function splitIncludeSplit(
    original: string,
    splitterInput: string | RegExp,
    caseSensitive: boolean,
) {
    const indexLengths = allIndexesOf(original, splitterInput, caseSensitive, true);

    const splitter = makeCaseInsensitiveString(splitterInput, caseSensitive);

    const splits = original.split(splitter);

    const splitterIncluded = splits.reduce((accum: string[], current, index) => {
        // this will be undefined on the last index
        const splitterLength: {index: number; length: number} | undefined = indexLengths[index];

        const includeCurrent = accum.concat(current);

        if (splitterLength) {
            const splitterMatch = original.slice(
                splitterLength.index,
                splitterLength.index + splitterLength.length,
            );

            return includeCurrent.concat(splitterMatch);
        } else {
            return includeCurrent;
        }
    }, []);

    return splitterIncluded;
}

export function escapeForRegExp(input: string): string {
    return input.replace(/[\^$\\.*+?()[\]{}|]/g, '\\$&');
}
