"use client";

import React, { useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { X, Upload, ImagePlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export interface ImageFile {
    id: string;
    file?: File;
    preview: string;
    isUploaded?: boolean;
    url?: string;
}

interface ImageUploadProps {
    images: ImageFile[];
    onImagesChange: (images: ImageFile[]) => void;
    maxImages?: number;
    label?: string;
    description?: string;
    compact?: boolean;
}

export function ImageUpload({
    images,
    onImagesChange,
    maxImages = 5,
    label = "Product Images",
    description = "Upload up to 5 images (JPG, PNG, WebP). Max 1MB each.",
    compact = false,
}: ImageUploadProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();

    const generateId = () => Math.random().toString(36).substring(2, 15);

    const handleFileSelect = useCallback(
        (event: React.ChangeEvent<HTMLInputElement>) => {
            const files = event.target.files;
            if (!files || files.length === 0) return;

            const remainingSlots = maxImages - images.length;
            if (remainingSlots <= 0) {
                toast({
                    title: "Maximum images reached",
                    description: `You can only upload up to ${maxImages} images`,
                    variant: "destructive",
                });
                return;
            }

            const allowedTypes = [
                "image/jpeg",
                "image/jpg",
                "image/png",
                "image/gif",
                "image/webp",
            ];
            const maxSize = 1 * 1024 * 1024; // 1MB

            const newImages: ImageFile[] = [];
            const filesToProcess = Array.from(files).slice(0, remainingSlots);

            for (const file of filesToProcess) {
                if (!allowedTypes.includes(file.type)) {
                    toast({
                        title: "Invalid file type",
                        description: `${file.name} is not a valid image file`,
                        variant: "destructive",
                    });
                    continue;
                }

                if (file.size > maxSize) {
                    toast({
                        title: "File too large",
                        description: `${file.name} exceeds 1MB limit`,
                        variant: "destructive",
                    });
                    continue;
                }

                newImages.push({
                    id: generateId(),
                    file,
                    preview: URL.createObjectURL(file),
                    isUploaded: false,
                });
            }

            if (newImages.length > 0) {
                onImagesChange([...images, ...newImages]);
            }

            // Reset input
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        },
        [images, maxImages, onImagesChange, toast]
    );

    const removeImage = useCallback(
        (id: string) => {
            const imageToRemove = images.find((img) => img.id === id);
            if (imageToRemove && imageToRemove.preview && !imageToRemove.isUploaded) {
                URL.revokeObjectURL(imageToRemove.preview);
            }
            onImagesChange(images.filter((img) => img.id !== id));
        },
        [images, onImagesChange]
    );

    const handleClick = () => {
        fileInputRef.current?.click();
    };

    if (compact) {
        return (
            <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                    {images.map((image) => (
                        <div
                            key={image.id}
                            className="relative h-12 w-12 rounded border overflow-hidden group"
                        >
                            <img
                                src={image.preview}
                                alt="Product"
                                className="h-full w-full object-cover"
                            />
                            <button
                                type="button"
                                onClick={() => removeImage(image.id)}
                                className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <X className="h-4 w-4 text-white" />
                            </button>
                        </div>
                    ))}
                    {images.length < maxImages && (
                        <button
                            type="button"
                            onClick={handleClick}
                            className="h-12 w-12 rounded border-2 border-dashed border-gray-300 flex items-center justify-center hover:border-primary hover:bg-primary/5 transition-colors"
                        >
                            <ImagePlus className="h-5 w-5 text-gray-400" />
                        </button>
                    )}
                </div>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                    onChange={handleFileSelect}
                    className="hidden"
                    multiple
                />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div>
                <label className="text-sm font-medium">{label}</label>
                <p className="text-sm text-muted-foreground">{description}</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                {images.map((image) => (
                    <div
                        key={image.id}
                        className="relative aspect-square rounded-lg border-2 border-gray-200 overflow-hidden group"
                    >
                        <img
                            src={image.preview}
                            alt="Product"
                            className="h-full w-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Button
                                type="button"
                                variant="destructive"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => removeImage(image.id)}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                ))}

                {images.length < maxImages && (
                    <button
                        type="button"
                        onClick={handleClick}
                        className="aspect-square rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center gap-2 hover:border-primary hover:bg-primary/5 transition-colors cursor-pointer"
                    >
                        <Upload className="h-8 w-8 text-gray-400" />
                        <span className="text-sm text-gray-500">Add Image</span>
                    </button>
                )}
            </div>

            <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                onChange={handleFileSelect}
                className="hidden"
                multiple
            />
        </div>
    );
}

// Utility function to upload images and get URLs
export async function uploadImages(images: ImageFile[], api: any): Promise<Map<string, string>> {
    const uploadedUrls = new Map<string, string>();

    for (const image of images) {
        // Skip already uploaded images
        if (image.isUploaded && image.url) {
            uploadedUrls.set(image.id, image.url);
            continue;
        }

        if (!image.file) continue;

        try {
            const formData = new FormData();
            formData.append("file", image.file);

            const uploadResponse = await api.post("/upload/public", formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            });

            const imageUrl = uploadResponse.data.data.url;
            uploadedUrls.set(image.id, imageUrl);
        } catch (error) {
            console.error("Failed to upload image:", error);
            throw error;
        }
    }

    return uploadedUrls;
}

// Utility to check if two images are the same (by file reference or preview URL)
export function isSameImage(img1: ImageFile, img2: ImageFile): boolean {
    if (img1.file && img2.file && img1.file === img2.file) return true;
    if (img1.url && img2.url && img1.url === img2.url) return true;
    if (img1.preview && img2.preview && img1.preview === img2.preview) return true;
    return false;
}

// Get unique images from product and all variants
export function getUniqueImages(
    productImages: ImageFile[],
    variantImages: ImageFile[][]
): ImageFile[] {
    const allImages = [...productImages];
    const seenPreviews = new Set(productImages.map((img) => img.preview));

    for (const images of variantImages) {
        for (const img of images) {
            if (!seenPreviews.has(img.preview)) {
                seenPreviews.add(img.preview);
                allImages.push(img);
            }
        }
    }

    return allImages;
}
