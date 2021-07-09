export function deDupeFlags(flags: string): string {
    const deDuped = new Set(Array.from(flags.toLowerCase()));

    return Array.from(deDuped).join('');
}
