export function collapseSpaces(input: string): string {
    return input.trim().replace(/\s{2,}/g, ' ');
}
