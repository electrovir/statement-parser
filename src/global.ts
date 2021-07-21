let sanitizerMode = false;

export function isSanitizerMode(): boolean {
    return sanitizerMode;
}

export function setSanitizerMode(): boolean {
    const original = sanitizerMode;
    sanitizerMode = true;
    return original;
}

export function unsetSanitizerMode(): boolean {
    const original = sanitizerMode;
    sanitizerMode = false;
    return original;
}
