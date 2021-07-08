export function collapseSpaces(input: string): string {
    return input.trim().replace(/\s{2,}/g, ' ');
}

export function sanitizeNumberString(input: string): string {
    return input.replace(/,/g, '');
}

export function allIndexesOf(
    searchIn: string,
    searchForInput: string | RegExp,
    caseInsensitive = false,
): number[] {
    const regExpFlags: string = `g${caseInsensitive ? 'i' : ''}`;
    const searchFor: RegExp =
        searchForInput instanceof RegExp
            ? new RegExp(searchForInput.source, `${searchForInput.flags}${regExpFlags}`)
            : new RegExp(escapeForRegExp(searchForInput), regExpFlags);

    const indexes: number[] = [];

    searchIn.replace(searchFor, (match, matchIndex) => {
        indexes.push(matchIndex);
        /**
         * Don't actually change any text. What we do here doesn't matter because we're not using
         * the output of the .replace method, we're just producing side effects.
         */
        return match;
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
