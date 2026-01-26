'use client';

import { useState, useRef } from 'react';
import { Upload, User, X } from 'lucide-react';
import Image from 'next/image';
import { ImageCropper } from './ImageCropper';
import { useTranslations } from 'next-intl';

interface AvatarUploadProps {
    currentAvatar?: string | null;
    onUpload: (file: File) => void;
    isUploading?: boolean;
}

export function AvatarUpload({ currentAvatar, onUpload, isUploading }: AvatarUploadProps) {
    const t = useTranslations('Image');
    const [preview, setPreview] = useState<string | null>(currentAvatar || null);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (file: File) => {
        // Validate file type
        if (!file.type.startsWith('image/')) {
            alert(t('invalidImage'));
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert(t('maxSize5MB'));
            return;
        }

        // Create preview
        const reader = new FileReader();
        reader.onloadend = () => {
            setPreview(reader.result as string);
        };
        reader.readAsDataURL(file);

        // Upload
        onUpload(file);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        const file = e.dataTransfer.files[0];
        if (file) {
            handleFileSelect(file);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            handleFileSelect(file);
        }
    };

    const handleRemove = () => {
        setPreview(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <div className="flex flex-col items-center gap-4">
            {/* Avatar Preview */}
            <div className="relative">
                <div
                    className="w-32 h-32 rounded-full overflow-hidden border-4 border-border bg-muted flex items-center justify-center"
                    style={{ background: 'var(--muted)' }}
                >
                    {preview ? (
                        <Image
                            src={preview}
                            alt={t('avatarAlt')}
                            width={128}
                            height={128}
                            className="object-cover w-full h-full"
                        />
                    ) : (
                        <User className="w-16 h-16" style={{ color: 'var(--muted-foreground)' }} aria-hidden="true" />
                    )}
                </div>

                {preview && !isUploading && (
                    <button
                        onClick={handleRemove}
                        className="absolute top-0 right-0 p-1 rounded-full text-white transition-colors"
                        style={{ backgroundColor: 'var(--error)' }}
                        aria-label={t('removeAvatar')}
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}

                {isUploading && (
                    <div
                        className="absolute inset-0 rounded-full flex items-center justify-center"
                        style={{ background: 'rgba(0, 0, 0, 0.5)' }}
                    >
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                    </div>
                )}
            </div>

            {/* Upload Area */}
            <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={handleClick}
                className={`w-full max-w-sm p-6 border-2 border-dashed rounded-lg cursor-pointer transition-all ${isDragging
                    ? 'border-accent bg-accent/10'
                    : 'border-border hover:border-accent hover:bg-muted/50'
                    }`}
                style={{ background: isDragging ? 'rgba(var(--accent-rgb, 68,183,139), 0.1)' : undefined }}
                role="button"
                tabIndex={0}
                aria-label={t('uploadAvatar')}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                    disabled={isUploading}
                />

                <div className="flex flex-col items-center gap-2 text-center">
                    <Upload className="w-8 h-8" style={{ color: 'var(--muted-foreground)' }} aria-hidden="true" />
                    <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                        {t('clickOrDrag')}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                        {t('formatsAllowed')}
                    </p>
                </div>
            </div>
        </div>
    );
}
