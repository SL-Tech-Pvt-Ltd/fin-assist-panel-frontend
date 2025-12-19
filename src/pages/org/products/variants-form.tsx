"use client";
import type React from "react";
import { useEffect } from "react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import type { ProductVariant, ProductOptions } from "./types";
import { Loader2, Trash2, ImageIcon } from "lucide-react";
import { ImageUpload, type ImageFile } from "./image-upload";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

interface VariantsFormProps {
    variants: ProductVariant[];
    updateVariants: (variants: ProductVariant[]) => void;
    isLoading: boolean;
    options?: ProductOptions[];
    productName?: string;
    productSKU?: string;
    buyPrice?: number;
    sellPrice?: number;
    stock?: number;
    productImages?: ImageFile[];
}

export function VariantsForm({
    variants,
    updateVariants,
    isLoading,
    productImages = [],
}: VariantsFormProps) {
    // Initialize variant images with product images when product images change
    useEffect(() => {
        if (productImages.length > 0 && variants.length > 0) {
            const needsUpdate = variants.some(
                (variant) => !variant.pendingImages || variant.pendingImages.length === 0
            );
            if (needsUpdate) {
                const updatedVariants = variants.map((variant) => {
                    if (!variant.pendingImages || variant.pendingImages.length === 0) {
                        return {
                            ...variant,
                            pendingImages: [...productImages],
                        };
                    }
                    return variant;
                });
                updateVariants(updatedVariants);
            }
        }
    }, [productImages]);

    // Get all unique option names for table headers
    const optionNames =
        variants.length > 0
            ? Object.keys(variants[0].values).filter((key) => key !== "undefined")
            : [];

    // Remove a variant
    const removeVariant = (index: number) => {
        const newVariants = variants.filter((_, i) => i !== index);
        updateVariants(newVariants);
    };

    const updateVariant = (
        index: number,
        field: "buyPrice" | "sellPrice" | "stock" | "sku",
        value: any
    ) => {
        const newVariants = [...variants];

        if (field === "buyPrice" || field === "sellPrice" || field === "stock") {
            newVariants[index][field] = value === "" ? 0 : Number.parseFloat(value);
        } else {
            newVariants[index][field] = value;
        }

        updateVariants(newVariants);
    };

    // Update variant images
    const updateVariantImages = (index: number, images: ImageFile[]) => {
        const newVariants = [...variants];
        newVariants[index] = {
            ...newVariants[index],
            pendingImages: images,
        };
        updateVariants(newVariants);
    };

    // Get image count for a variant
    const getVariantImageCount = (variant: ProductVariant) => {
        return variant.pendingImages?.length || 0;
    };

    // Handle keyboard navigation in the table
    // Handle keyboard navigation in the table
    const handleKeyDown = (
        e: React.KeyboardEvent<HTMLInputElement>,
        rowIndex: number,
        field: string
    ) => {
        if (e.key === "ArrowDown" || (e.key === "Tab" && !e.shiftKey)) {
            // Move to the next row, same column
            if (rowIndex < variants.length - 1) {
                e.preventDefault();
                const nextRow = document.querySelector(
                    `#variant-${rowIndex + 1}-${field}`
                ) as HTMLElement;
                if (nextRow) nextRow.focus();
            }
        } else if (e.key === "ArrowUp" || (e.key === "Tab" && e.shiftKey)) {
            // Move to the previous row, same column
            if (rowIndex > 0) {
                e.preventDefault();
                const prevRow = document.querySelector(
                    `#variant-${rowIndex - 1}-${field}`
                ) as HTMLElement;
                if (prevRow) prevRow.focus();
            }
        }
    };

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-semibold">Product Variants</h2>

            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed rounded-lg">
                    <Loader2 className="h-8 w-8 text-primary animate-spin mb-4" />
                    <p className="text-muted-foreground">Generating variants...</p>
                </div>
            ) : variants.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed rounded-lg">
                    <h3 className="text-lg font-medium">No variants available</h3>
                    <p className="text-muted-foreground">
                        Add product options first to generate variants
                    </p>
                </div>
            ) : (
                <>
                    <div className="border rounded-md overflow-hidden">
                        <div className="max-h-[400px] overflow-auto">
                            <Table>
                                <TableHeader className="sticky top-0 bg-background z-10">
                                    <TableRow>
                                        {optionNames.map((option) => (
                                            <TableHead key={option} className="font-medium">
                                                {option}
                                            </TableHead>
                                        ))}
                                        <TableHead>SKU</TableHead>
                                        <TableHead>Buy Price</TableHead>
                                        <TableHead>Sell Price</TableHead>
                                        <TableHead>Stock</TableHead>
                                        <TableHead>Images</TableHead>
                                        <TableHead className="w-20">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {variants.map((variant, index) => (
                                        <TableRow key={index} className="group">
                                            {optionNames.map((option) => (
                                                <TableCell key={option} className="font-medium">
                                                    {variant.values[option]}
                                                </TableCell>
                                            ))}
                                            <TableCell>
                                                <Input
                                                    id={`variant-${index}-sku`}
                                                    value={variant.sku}
                                                    onChange={(e) =>
                                                        updateVariant(index, "sku", e.target.value)
                                                    }
                                                    onKeyDown={(e) =>
                                                        handleKeyDown(e, index, "sku")
                                                    }
                                                    className="h-8 bg-transparent"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Input
                                                    id={`variant-${index}-buyPrice`}
                                                    type="number"
                                                    value={variant.buyPrice || ""}
                                                    onChange={(e) =>
                                                        updateVariant(
                                                            index,
                                                            "buyPrice",
                                                            e.target.value
                                                        )
                                                    }
                                                    onKeyDown={(e) =>
                                                        handleKeyDown(e, index, "buyPrice")
                                                    }
                                                    min="0"
                                                    step="0.01"
                                                    className="h-8 bg-transparent"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Input
                                                    id={`variant-${index}-sellPrice`}
                                                    type="number"
                                                    value={variant.sellPrice || ""}
                                                    onChange={(e) =>
                                                        updateVariant(
                                                            index,
                                                            "sellPrice",
                                                            e.target.value
                                                        )
                                                    }
                                                    onKeyDown={(e) =>
                                                        handleKeyDown(e, index, "sellPrice")
                                                    }
                                                    min="0"
                                                    step="0.01"
                                                    className="h-8 bg-transparent"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Input
                                                    id={`variant-${index}-stock`}
                                                    type="number"
                                                    value={variant.stock || ""}
                                                    onChange={(e) =>
                                                        updateVariant(
                                                            index,
                                                            "stock",
                                                            e.target.value
                                                        )
                                                    }
                                                    onKeyDown={(e) =>
                                                        handleKeyDown(e, index, "stock")
                                                    }
                                                    min="0"
                                                    step="1"
                                                    className="h-8 bg-transparent"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Dialog>
                                                    <DialogTrigger asChild>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="h-8 gap-1"
                                                        >
                                                            <ImageIcon className="h-4 w-4" />
                                                            <span className="text-xs">
                                                                {getVariantImageCount(variant)}
                                                            </span>
                                                        </Button>
                                                    </DialogTrigger>
                                                    <DialogContent className="max-w-md">
                                                        <DialogHeader>
                                                            <DialogTitle>
                                                                Images for{" "}
                                                                {Object.values(variant.values).join(
                                                                    " / "
                                                                )}
                                                            </DialogTitle>
                                                        </DialogHeader>
                                                        <ImageUpload
                                                            images={variant.pendingImages || []}
                                                            onImagesChange={(images) =>
                                                                updateVariantImages(index, images)
                                                            }
                                                            maxImages={5}
                                                            label="Variant Images"
                                                            description="Add or remove images for this variant"
                                                        />
                                                    </DialogContent>
                                                </Dialog>
                                            </TableCell>
                                            <TableCell>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => removeVariant(index)}
                                                    className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                    title="Remove variant"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
