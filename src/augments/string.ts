export function collapseSpaces(input: string): string {
    return input.trim().replace(/\s{2,}/g, ' ');
}

export function sanitizeNumberString(input: string): string {
    return input.replace(/,/g, '');
}
