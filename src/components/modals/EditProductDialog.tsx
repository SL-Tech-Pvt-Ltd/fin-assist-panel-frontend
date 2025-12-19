import React, { useState, useEffect } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/utils/api";
import { Product } from "@/data/types";
import { ProductOptions } from "@/pages/org/products/types";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ImageUpload, ImageFile } from "@/pages/org/products/image-upload";

interface EditProductDialogProps {
    product: ProductWithOptions | null;
    orgId: string;
    isOpen: boolean;
    onClose: () => void;
    onUpdate?: (updatedProduct: ProductWithOptions) => void;
}

interface EditProductFormData {
    name: string;
    description: string;
}

// Extend the Product interface to include options for type safety
interface ProductWithOptions extends Product {
    options?: ProductOptions[];
}

// Component for adding values to existing options
interface OptionValueFormProps {
    option: ProductOptions;
    originalValues: { value: string; slug: string }[];
    onAddValue: (value: string) => void;
    onRemoveNewValue: (valueIndex: number) => void;
    disabled: boolean;
}

const OptionValueForm: React.FC<OptionValueFormProps> = ({
    option,
    originalValues,
    onAddValue,
    onRemoveNewValue,
    disabled,
}) => {
    const [newValue, setNewValue] = useState("");

    const handleAddValue = () => {
        if (newValue.trim()) {
            onAddValue(newValue.trim());
            setNewValue("");
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            e.preventDefault();
            handleAddValue();
        }
    };

    // Separate original and new values
    const newValues = option.values.slice(originalValues.length);

    return (
        <div className="space-y-3">
            <Label className="text-sm font-medium">{option.name}</Label>

            {/* Existing Values */}
            {originalValues.length > 0 && (
                <div>
                    <div className="text-xs text-muted-foreground mb-2">Existing values:</div>
                    <div className="flex flex-wrap gap-1">
                        {originalValues.map((value, index) => (
                            <span
                                key={index}
                                className="inline-flex items-center px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded"
                            >
                                {value.value}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* New Values */}
            {newValues.length > 0 && (
                <div>
                    <div className="text-xs text-muted-foreground mb-2">Newly added values:</div>
                    <div className="flex flex-wrap gap-1">
                        {newValues.map((value, index) => (
                            <span
                                key={index}
                                className="inline-flex items-center px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded gap-1"
                            >
                                {value.value}
                                <button
                                    type="button"
                                    onClick={() => onRemoveNewValue(originalValues.length + index)}
                                    disabled={disabled}
                                    className="ml-1 text-blue-600 hover:text-blue-800"
                                >
                                    ×
                                </button>
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Add New Value */}
            <div className="flex gap-2">
                <Input
                    value={newValue}
                    onChange={(e) => setNewValue(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={`Add ${option.name.toLowerCase()}`}
                    disabled={disabled}
                    className="flex-1"
                />
                <Button
                    type="button"
                    onClick={handleAddValue}
                    disabled={disabled || !newValue.trim()}
                    size="sm"
                >
                    Add
                </Button>
            </div>
        </div>
    );
};

const EditProductDialog: React.FC<EditProductDialogProps> = ({
    product,
    orgId,
    isOpen,
    onClose,
    onUpdate,
}) => {
    const [isLoading, setIsLoading] = useState(false);
    const [options, setOptions] = useState<ProductOptions[]>([]);
    const [originalOptions, setOriginalOptions] = useState<ProductOptions[]>([]);
    const [images, setImages] = useState<ImageFile[]>([]);
    const { toast } = useToast();

    const {
        register,
        handleSubmit,
        formState: { errors },
        reset,
        setValue,
    } = useForm<EditProductFormData>({
        defaultValues: {
            name: "",
            description: "",
        },
    });

    // Update form values when product changes
    useEffect(() => {
        if (product) {
            setValue("name", product.name);
            setValue("description", product.description || "");
            // Initialize options from product
            const productOptions = product.options || [];
            setOptions(JSON.parse(JSON.stringify(productOptions))); // Deep copy
            setOriginalOptions(JSON.parse(JSON.stringify(productOptions))); // Store original

            // Initialize images from existing URLs
            const existingImages: ImageFile[] = (product.imageUrls || []).map((url, index) => ({
                id: `existing-${index}`,
                preview: url,
                isUploaded: true,
                url: url,
            }));
            setImages(existingImages);
        } else {
            reset();
            setOptions([]);
            setOriginalOptions([]);
            setImages([]);
        }
    }, [product, setValue, reset]);

    // Function to generate slug from text
    const generateSlug = (text: string): string => {
        return text
            .toLowerCase()
            .replace(/[^\w\s-]/g, "")
            .replace(/\s+/g, "-")
            .replace(/-+/g, "-")
            .trim();
    };

    // Function to add a new value to an existing option
    const addOptionValue = (optionIndex: number, newValue: string) => {
        if (!newValue.trim()) return;

        const updatedOptions = [...options];
        const newOptionValue = {
            value: newValue.trim(),
            slug: generateSlug(newValue.trim()),
        };

        updatedOptions[optionIndex].values.push(newOptionValue);
        setOptions(updatedOptions);
    };

    // Function to remove a newly added value
    const removeNewValue = (optionIndex: number, valueIndex: number) => {
        const updatedOptions = [...options];
        updatedOptions[optionIndex].values.splice(valueIndex, 1);
        setOptions(updatedOptions);
    };

    const onSubmit: SubmitHandler<EditProductFormData> = async (data) => {
        if (!product) return;

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

            const response = await api.put(`/orgs/${orgId}/products/${product.id}`, {
                name: data.name,
                description: data.description,
                options: options, // Include options in the update
                imageUrls: imageUrls,
            });

            const updatedProduct = response.data;

            if (onUpdate) {
                onUpdate(updatedProduct);
            }

            toast({
                title: "Success",
                description: "Product has been updated successfully!",
            });

            onClose();
        } catch (error) {
            console.error("Failed to update product:", error);
            toast({
                title: "Error",
                description: "Could not update product. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = () => {
        if (!isLoading) {
            reset();
            setOptions([]);
            setOriginalOptions([]);
            setImages([]);
            onClose();
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[600px] max-h-[80vh]">
                <DialogHeader>
                    <DialogTitle>Edit Product</DialogTitle>
                </DialogHeader>

                <ScrollArea className="max-h-[60vh] pr-4">
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Product Name</Label>
                            <Input
                                id="name"
                                placeholder="Enter product name"
                                {...register("name", {
                                    required: "Product name is required",
                                    minLength: {
                                        value: 2,
                                        message: "Product name must be at least 2 characters",
                                    },
                                })}
                                disabled={isLoading}
                            />
                            {errors.name && (
                                <p className="text-red-500 text-sm">{errors.name.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                placeholder="Enter product description (optional)"
                                rows={4}
                                {...register("description")}
                                disabled={isLoading}
                            />
                            {errors.description && (
                                <p className="text-red-500 text-sm">{errors.description.message}</p>
                            )}
                        </div>

                        {/* Product Images */}
                        <div className="space-y-2">
                            <ImageUpload
                                images={images}
                                onImagesChange={setImages}
                                maxImages={5}
                                label="Product Images"
                                description="Upload, remove, or reorder product images"
                            />
                        </div>

                        {/* Product Options Section */}
                        {options.length > 0 && (
                            <div className="space-y-4">
                                <h3 className="text-lg font-medium">Product Options</h3>
                                <div className="space-y-4">
                                    {options.map((option, optionIndex) => (
                                        <div key={optionIndex} className="border rounded-lg p-4">
                                            <OptionValueForm
                                                option={option}
                                                originalValues={
                                                    originalOptions[optionIndex]?.values || []
                                                }
                                                onAddValue={(newValue) =>
                                                    addOptionValue(optionIndex, newValue)
                                                }
                                                onRemoveNewValue={(valueIndex) =>
                                                    removeNewValue(optionIndex, valueIndex)
                                                }
                                                disabled={isLoading}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

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
                                {isLoading ? "Updating..." : "Update Product"}
                            </Button>
                        </DialogFooter>
                    </form>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
};

export default EditProductDialog;
