/**
 * Utility for fluid color manipulation
 */

export interface HSL {
    h: number;
    s: number;
    l: number;
}

/**
 * Converts hex color to HSL
 */
export function hexToHSL(hex: string): HSL {
    // Remove # if present
    hex = hex.replace(/^#/, '');

    // Parse R, G, B
    let r = 0, g = 0, b = 0;
    if (hex.length === 3) {
        r = parseInt(hex[0] + hex[0], 16) / 255;
        g = parseInt(hex[1] + hex[1], 16) / 255;
        b = parseInt(hex[2] + hex[2], 16) / 255;
    } else if (hex.length === 6) {
        r = parseInt(hex.substring(0, 2), 16) / 255;
        g = parseInt(hex.substring(2, 4), 16) / 255;
        b = parseInt(hex.substring(4, 6), 16) / 255;
    }

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;

    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }

    return {
        h: Math.round(h * 360),
        s: Math.round(s * 100),
        l: Math.round(l * 100)
    };
}

/**
 * Ensures a color has a specific lightness range
 */
export function adjustLightness(hsl: HSL, min: number, max: number): HSL {
    return {
        ...hsl,
        l: Math.min(Math.max(hsl.l, min), max)
    };
}
