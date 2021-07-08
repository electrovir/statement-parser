export function flatten2dArray<T>(pages: T[][]): T[] {
    const flattened: T[] = pages.reduce((accum: T[], row) => accum.concat(row), []);

    return flattened;
}

export function trimArray(input: string[]): string[] {
    return input.map((line) => line.trim()).filter((line) => line !== '');
}
