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

    searchIn.replace(searchFor, (_, matchIndex) => {
        indexes.push(matchIndex);
        return '';
    });

    return indexes;
}

export function getLength(matchIn: string, matchFor: string | RegExp): number {
    if (matchFor instanceof RegExp) {
        const match = matchIn.match(matchFor);
        if (match) {
            return match[0].length;
        } else {
            return 0;
        }
    } else {
        return matchFor.length;
    }
}

export function replaceStringAtIndex(
    originalString: string,
    start: number,
    newString: string | RegExp,
    length = getLength(originalString, newString),
): string {
    const before = originalString.substring(0, start);
    const after = originalString.substring(start + length);

    return `${before}${newString}${after}`;
}

export function escapeForRegExp(input: string): string {
    return input.replace(/[\^$\\.*+?()[\]{}|]/g, '\\$&');
}
