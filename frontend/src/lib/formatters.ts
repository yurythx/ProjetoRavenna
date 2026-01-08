/**
 * Formats large numbers into readable strings with suffixes (K, M)
 * and Portuguese (Brazil) localization.
 * 
 * Examples:
 * 999 -> "999"
 * 1234 -> "1,2K"
 * 10000 -> "10K"
 * 1500000 -> "1,5M"
 * 
 * @param num - The number to format
 * @returns Formatted string
 */
export const formatCompactNumber = (num: number): string => {
    if (num >= 1000000) {
        const formatted = (num / 1000000).toFixed(1);
        // Use comma as decimal separator for PT-BR
        const result = formatted.replace('.', ',');
        return `${result.endsWith(',0') ? result.slice(0, -2) : result}M`;
    }

    if (num >= 1000) {
        const formatted = (num / 1000).toFixed(1);
        // Use comma as decimal separator for PT-BR
        const result = formatted.replace('.', ',');
        return `${result.endsWith(',0') ? result.slice(0, -2) : result}K`;
    }

    return num.toString();
};

/**
 * Formats a number with thousands separators for PT-BR
 * 
 * Example: 1234 -> "1.234"
 * 
 * @param num - The number to format
 * @returns Formatted string
 */
export const formatFullNumber = (num: number): string => {
    return num.toLocaleString('pt-BR');
};
