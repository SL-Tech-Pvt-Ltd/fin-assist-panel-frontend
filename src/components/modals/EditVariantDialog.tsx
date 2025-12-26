import React, { useState, useEffect } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/utils/api";
import { ProductVariant } from "@/data/types";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { ImageUpload, ImageFile } from "@/pages/org/products/image-upload";
import { ScrollArea } from "@/components/ui/scroll-area";

interface EditVariantDialogProps {
    variant: ProductVariant | null;
    productId: string;
    orgId: string;
    isOpen: boolean;
    onClose: () => void;
    onUpdate?: (updatedVariant: ProductVariant) => void;
}

interface EditVariantFormData {
    name: string;
    description: string;
    price: number;
    minSellingPrice: number;
    stock: number;
    code: string;
    sku: string;
}

const EditVariantDialog: React.FC<EditVariantDialogProps> = ({
    variant,
    productId,
    orgId,
    isOpen,
    onClose,
    onUpdate,
}) => {
    const [isLoading, setIsLoading] = useState(false);
    const [images, setImages] = useState<ImageFile[]>([]);
    const { toast } = useToast();

    const {
        register,
        handleSubmit,
        formState: { errors },
        reset,
        setValue,
    } = useForm<EditVariantFormData>({
        defaultValues: {
            name: "",
            description: "",
            price: 0,
            minSellingPrice: 0,
            stock: 0,
            code: "",
            sku: "",
        },
    });

    // Update form values when variant changes
    useEffect(() => {
        if (variant) {
            setValue("name", variant.name);
            setValue("description", variant.description || "");
            setValue("price", variant.price);
            setValue("code", variant.code);
            setValue("minSellingPrice", variant.minSellingPrice || 0);
            setValue("sku", variant.sku);

            // Initialize images from existing URLs
            const existingImages: ImageFile[] = (variant.imageUrls || []).map((url, index) => ({
                id: `existing-${index}`,
                preview: url,
                isUploaded: true,
                url: url,
            }));
            setImages(existingImages);
        } else {
            reset();
            setImages([]);
        }
    }, [variant, setValue, reset]);

    const onSubmit: SubmitHandler<EditVariantFormData> = async (data) => {
        if (!variant) return;

        setIsLoading(true);
        try {
            // Upload new images if any
            const imageUrls: string[] = [];

            for (const image of images) {
                if (image.isUploaded && image.url) {
                    // Keep existing images
                    imageUrls.push(image.url);
                } else if (image.file) {
                    // Upload new images
                    const formData = new FormData();
                    formData.append("file", image.file);

                    const uploadResponse = await api.post("/upload/public", formData, {
                        headers: {
                            "Content-Type": "multipart/form-data",
                        },
                    });

                    imageUrls.push(uploadResponse.data.data.url);
                }
            }

            const response = await api.put(
                `/orgs/${orgId}/products/${productId}/variants/${variant.id}`,
                {
                    name: data.name,
                    description: data.description,
                    price: parseFloat(data.price.toString()),
                    minSellingPrice: parseFloat(data.minSellingPrice.toString()),
                    stock: parseInt(data.stock.toString()),
                    code: data.code,
                    sku: data.sku,
                    imageUrls: imageUrls,
                }
            );

            const updatedVariant = response.data;

            if (onUpdate) {
                onUpdate(updatedVariant);
            }

            toast({
                title: "Success",
                description: "Variant has been updated successfully!",
            });

            onClose();
        } catch (error) {
            console.error("Failed to update variant:", error);
            toast({
                title: "Error",
                description: "Could not update variant. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = () => {
        if (!isLoading) {
            reset();
            setImages([]);
            onClose();
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[600px] max-h-[80vh]">
                <DialogHeader>
                    <DialogTitle>Edit Variant</DialogTitle>
                </DialogHeader>

                <ScrollArea className="max-h-[60vh] pr-4">
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Variant Name</Label>
                                <Input
                                    id="name"
                                    placeholder="Enter variant name"
                                    {...register("name", {
                                        required: "Variant name is required",
                                        minLength: {
                                            value: 2,
                                            message: "Variant name must be at least 2 characters",
                                        },
                                    })}
                                    disabled={isLoading}
                                />
                                {errors.name && (
                                    <p className="text-red-500 text-sm">{errors.name.message}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="code">Code</Label>
                                <Input
                                    id="code"
                                    placeholder="Enter variant code"
                                    {...register("code", {
                                        required: "Variant code is required",
                                    })}
                                    disabled={isLoading}
                                />
                                {errors.code && (
                                    <p className="text-red-500 text-sm">{errors.code.message}</p>
                                )}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="sku">SKU</Label>
                            <Input
                                id="sku"
                                placeholder="Enter SKU"
                                {...register("sku", {
                                    required: "SKU is required",
                                })}
                                disabled={isLoading}
                            />
                            {errors.sku && (
                                <p className="text-red-500 text-sm">{errors.sku.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                placeholder="Enter variant description (optional)"
                                rows={3}
                                {...register("description")}
                                disabled={isLoading}
                            />
                        </div>

                        {/* Variant Images */}
                        <div className="space-y-2">
                            <ImageUpload
                                images={images}
                                onImagesChange={setImages}
                                maxImages={5}
                                label="Variant Images"
                                description="Upload, remove, or reorder variant images"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="price">Sell Price</Label>
                                <Input
                                    id="price"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    placeholder="0.00"
                                    {...register("price", {
                                        required: "Sell price is required",
                                        min: {
                                            value: 0,
                                            message: "Sell price must be positive",
                                        },
                                    })}
                                    disabled={isLoading}
                                />
                                {errors.price && (
                                    <p className="text-red-500 text-sm">{errors.price.message}</p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="price">Min Sell Price</Label>
                                <Input
                                    id="minSellingPrice"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    placeholder="0.00"
                                    {...register("minSellingPrice", {
                                        required: "Min Sell price is required",
                                        min: {
                                            value: 0,
                                            message: "Min Sell price must be positive",
                                        },
                                    })}
                                    disabled={isLoading}
                                />
                                {errors.minSellingPrice && (
                                    <p className="text-red-500 text-sm">
                                        {errors.minSellingPrice.message}
                                    </p>
                                )}
                            </div>
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleClose}
                                disabled={isLoading}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading ? "Updating..." : "Update Variant"}
                            </Button>
                        </DialogFooter>
                    </form>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
};

export default EditVariantDialog;
