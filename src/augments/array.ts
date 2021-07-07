export function flatten2dArray(pages: string[][]): string[] {
    const lines: string[] = pages.reduce(
        (accum: string[], pageLines) => accum.concat(pageLines),
        [],
    );

    return lines;
}
