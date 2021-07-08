export function collapseSpaces(input: string): string {
    return input.trim().replace(/\s{2,}/g, ' ');
}

export function sanitizeNumberString(input: string): string {
    return input.replace(/,/g, '');
}

export function allIndexesOf(
    searchIn: string,
    searchFor: string,
    caseInsensitive = false,
): number[] {
    if (caseInsensitive) {
        searchIn = searchIn.toUpperCase();
        searchFor = searchFor.toUpperCase();
    }
    const indices: number[] = [];
    let matchedIndex = 0;
    let startIndex = 0;

    while ((matchedIndex = searchIn.indexOf(searchFor, startIndex)) > -1) {
        indices.push(matchedIndex);
        startIndex = matchedIndex + searchFor.length;
    }

    return indices;
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
