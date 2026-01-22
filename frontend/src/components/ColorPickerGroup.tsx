'use client';

import { useState } from 'react';
import { RotateCcw } from 'lucide-react';

interface ColorPickerGroupProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
    defaultValue: string;
    placeholder?: string;
    helpText?: string;
}

export function ColorPickerGroup({
    label,
    value,
    onChange,
    defaultValue,
    placeholder = '#44B78B',
    helpText
}: ColorPickerGroupProps) {
    const [isCustom, setIsCustom] = useState(!!value);

    const handleReset = () => {
        onChange('');
        setIsCustom(false);
    };

    const handleChange = (newValue: string) => {
        onChange(newValue);
        setIsCustom(!!newValue);
    };

    const displayValue = value || defaultValue;

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-foreground">
                    {label}
                </label>
                {isCustom && value && (
                    <button
                        type="button"
                        onClick={handleReset}
                        className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                        title="Restaurar ao padrão"
                    >
                        <RotateCcw className="w-3 h-3" />
                        <span>Padrão</span>
                    </button>
                )}
            </div>

            <div className="flex gap-2 items-center">
                {/* Color Picker Visual */}
                <div className="relative">
                    <input
                        type="color"
                        value={displayValue}
                        onChange={(e) => handleChange(e.target.value)}
                        className="w-12 h-12 rounded-lg cursor-pointer border-2 border-border bg-background hover:border-accent transition-colors"
                        style={{ colorScheme: 'light' }}
                    />
                    {!isCustom && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="w-6 h-6 rounded-full bg-background/80 backdrop-blur-sm border border-border" />
                        </div>
                    )}
                </div>

                {/* Text Input */}
                <div className="flex-1 relative">
                    <input
                        type="text"
                        value={value}
                        onChange={(e) => handleChange(e.target.value)}
                        placeholder={placeholder}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-accent"
                        pattern="^#[0-9A-Fa-f]{6}$"
                    />
                    {!value && (
                        <span className="absolute right-3 top-2 text-xs text-muted-foreground pointer-events-none">
                            Padrão
                        </span>
                    )}
                </div>
            </div>

            {/* Help Text */}
            {helpText && (
                <p className="text-xs text-muted-foreground">
                    {helpText}
                </p>
            )}
        </div>
    );
}
