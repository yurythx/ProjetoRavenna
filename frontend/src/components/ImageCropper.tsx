'use client';

import { useState, useCallback } from 'react';
import Cropper, { Area } from 'react-easy-crop';
import { X, RotateCw, ZoomIn, ZoomOut, Check } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface ImageCropperProps {
    image: string;
    onCropComplete: (croppedImage: Blob) => void;
    onCancel: () => void;
}

export function ImageCropper({ image, onCropComplete, onCancel }: ImageCropperProps) {
    const t = useTranslations('Image');
    const tc = useTranslations('Common');
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

    const onCropChange = useCallback((crop: { x: number; y: number }) => {
        setCrop(crop);
    }, []);

    const onZoomChange = useCallback((zoom: number) => {
        setZoom(zoom);
    }, []);

    const onCropAreaComplete = useCallback((_: Area, croppedAreaPixels: Area) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const createCroppedImage = async (): Promise<Blob> => {
        if (!croppedAreaPixels) throw new Error('No crop area');

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('No 2d context');

        const imageElement = new Image();
        imageElement.src = image;

        await new Promise((resolve) => {
            imageElement.onload = resolve;
        });

        // Calculate canvas size (400x400 for avatar)
        const targetSize = 400;
        canvas.width = targetSize;
        canvas.height = targetSize;

        // Apply rotation
        ctx.translate(targetSize / 2, targetSize / 2);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.translate(-targetSize / 2, -targetSize / 2);

        // Draw cropped image
        ctx.drawImage(
            imageElement,
            croppedAreaPixels.x,
            croppedAreaPixels.y,
            croppedAreaPixels.width,
            croppedAreaPixels.height,
            0,
            0,
            targetSize,
            targetSize
        );

        return new Promise((resolve) => {
            canvas.toBlob((blob) => {
                if (blob) resolve(blob);
            }, 'image/webp', 0.95);
        });
    };

    const handleSave = async () => {
        try {
            const croppedBlob = await createCroppedImage();
            onCropComplete(croppedBlob);
        } catch (error) {
            console.error('Error cropping image:', error);
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0, 0, 0, 0.9)' }}
        >
            <div
                className="w-full max-w-2xl rounded-xl overflow-hidden"
                style={{ background: 'var(--card-bg)' }}
            >
                {/* Header */}
                <div
                    className="flex items-center justify-between p-4 border-b"
                    style={{ borderColor: 'var(--border)' }}
                >
                    <h3 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
                        {t('adjustPhoto')}
                    </h3>
                    <button
                        onClick={onCancel}
                        className="p-2 rounded-lg hover:bg-muted transition-colors"
                        aria-label={tc('cancel')}
                    >
                        <X className="w-5 h-5" style={{ color: 'var(--foreground)' }} />
                    </button>
                </div>

                {/* Cropper */}
                <div className="relative h-96 bg-black">
                    <Cropper
                        image={image}
                        crop={crop}
                        zoom={zoom}
                        rotation={rotation}
                        aspect={1}
                        cropShape="round"
                        showGrid={false}
                        onCropChange={onCropChange}
                        onZoomChange={onZoomChange}
                        onCropComplete={onCropAreaComplete}
                    />
                </div>

                {/* Controls */}
                <div className="p-6 space-y-4">
                    {/* Zoom */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                                <ZoomIn className="w-4 h-4 inline mr-1" aria-hidden="true" />
                                {t('zoom')}
                            </label>
                            <span className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                                {Math.round(zoom * 100)}%
                            </span>
                        </div>
                        <input
                            type="range"
                            min={1}
                            max={3}
                            step={0.1}
                            value={zoom}
                            onChange={(e) => setZoom(Number(e.target.value))}
                            className="w-full"
                            aria-label={t('zoomControl')}
                        />
                    </div>

                    {/* Rotation */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                                <RotateCw className="w-4 h-4 inline mr-1" aria-hidden="true" />
                                {t('rotation')}
                            </label>
                            <span className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                                {rotation}°
                            </span>
                        </div>
                        <input
                            type="range"
                            min={0}
                            max={360}
                            step={1}
                            value={rotation}
                            onChange={(e) => setRotation(Number(e.target.value))}
                            className="w-full"
                            aria-label={t('rotationControl')}
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                        <button
                            onClick={onCancel}
                            className="btn btn-outline flex-1"
                        >
                            {tc('cancel')}
                        </button>
                        <button
                            onClick={handleSave}
                            className="btn btn-primary flex-1 flex items-center justify-center gap-2"
                        >
                            <Check className="w-4 h-4" aria-hidden="true" />
                            {t('apply')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
