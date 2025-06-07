export const valueHasher = (value: unknown): string => {
    return JSON.stringify(value);
}