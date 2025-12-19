"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import type { Product } from "./types";
import { Category } from "@/data/types";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import AddCategory from "@/components/modals/AddCategory";
import { ImageUpload, type ImageFile } from "./image-upload";

// Define the validation schema
const formSchema = z.object({
    name: z.string().min(1, "Product name is required"),
    description: z.string().optional(),
    buyPrice: z.coerce.number(),
    sellPrice: z.coerce.number(),
    stock: z.coerce.number().min(0, "Stock cannot be negative"),
    sku: z.string().min(1, "SKU is required").max(20, "SKU must be 20 characters or less"),
    categoryId: z.string().min(1, "Category selection is required"),
});

interface BasicDetailsFormProps {
    product: Product;
    categories: Category[];
    addCategory: (name: string, description: string) => Promise<void>;
    updateProduct: (data: Partial<Product>) => void;
    onNext: () => void;
}

export function BasicDetailsForm({
    product,
    updateProduct,
    onNext,
    addCategory,
    categories,
}: BasicDetailsFormProps) {
    // Initialize form with react-hook-form
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: product.name,
            description: product.description,
            buyPrice: product.buyPrice,
            sellPrice: product.sellPrice,
            stock: product.stock,
            sku: product.sku,
            categoryId: product.categoryId,
        },
    });

    // Watch all form fields and update product when any field changes
    useEffect(() => {
        // Use formState.isDirty to check if form has been touched
        const { isDirty } = form.formState;

        // Only subscribe to watch if the form has been interacted with
        if (isDirty) {
            const subscription = form.watch(() => {
                const formValues = form.getValues();
                // Only update if values are different from the current product state
                if (
                    formValues.name !== product.name ||
                    formValues.description !== product.description ||
                    formValues.buyPrice !== product.buyPrice ||
                    formValues.sellPrice !== product.sellPrice ||
                    formValues.stock !== product.stock ||
                    formValues.sku !== product.sku ||
                    formValues.categoryId !== product.categoryId
                ) {
                    updateProduct(formValues as Partial<Product>);
                }
            });

            return () => subscription.unsubscribe();
        }
    }, [form, form.formState.isDirty, updateProduct, product]);
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(product.categoryId); // Update form values when product changes
    useEffect(() => {
        // Only reset the form if the values are different to avoid infinite loops
        if (
            product.name !== form.getValues("name") ||
            product.description !== form.getValues("description") ||
            product.buyPrice !== form.getValues("buyPrice") ||
            product.sellPrice !== form.getValues("sellPrice") ||
            product.stock !== form.getValues("stock") ||
            product.sku !== form.getValues("sku") ||
            product.categoryId !== selectedCategoryId
        ) {
            form.reset({
                name: product.name,
                description: product.description,
                buyPrice: product.buyPrice,
                sellPrice: product.sellPrice,
                stock: product.stock,
                sku: product.sku,
                categoryId: product.categoryId || "",
            });
        }
    }, [product, form]);

    // useEffect(() => {
    //     let buffer = "";

    //     const handleKeyDown = (e: KeyboardEvent) => {
    //         // Allow only visible characters and Enter
    //         if (e.key.length === 1) {
    //             buffer += e.key;
    //         } else if (e.key === "Enter") {
    //             if (buffer.length >= 8) {
    //                 form.setValue("code", buffer); // Set barcode in form field
    //             }
    //             buffer = "";
    //         }
    //     };

    //     window.addEventListener("keydown", handleKeyDown);
    //     return () => {
    //         window.removeEventListener("keydown", handleKeyDown);
    //     };
    // }, [form]);

    // Handle form submission
    function onSubmit(values: z.infer<typeof formSchema>) {
        updateProduct({ ...values });
        onNext();
    }

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-semibold">Basic Details</h2>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>
                                    Product Name <span className="text-destructive">*</span>
                                </FormLabel>
                                <FormControl>
                                    <Input placeholder="Enter product name" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="categoryId"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>
                                    Category <span className="text-destructive">*</span>
                                </FormLabel>
                                <div className="flex items-center justify-between">
                                    <FormControl>
                                        <Select
                                            onValueChange={(value) => {
                                                setSelectedCategoryId(value);
                                                field.onChange(value);
                                            }}
                                            value={field.value || undefined}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select category" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {categories.map((category) => (
                                                    <SelectItem
                                                        key={category.id}
                                                        value={category.id}
                                                    >
                                                        {category.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </FormControl>
                                    <AddCategory onAddCategory={addCategory} />
                                </div>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="sku"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>
                                    SKU <span className="text-destructive">*</span>
                                </FormLabel>
                                <FormControl>
                                    <Input
                                        placeholder="Auto-generated SKU"
                                        {...field}
                                        className="uppercase"
                                    />
                                </FormControl>
                                <FormMessage />
                                <p className="text-sm text-muted-foreground">
                                    SKU is auto-generated but can be edited
                                </p>
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Description </FormLabel>
                                <FormControl>
                                    <Textarea
                                        placeholder="Enter product description"
                                        rows={4}
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="buyPrice"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>
                                        Cost Price <span className="text-destructive">*</span>
                                    </FormLabel>
                                    <FormControl>
                                        <Input type="number" placeholder="0.00" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="sellPrice"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>
                                        Selling Price <span className="text-destructive">*</span>
                                    </FormLabel>
                                    <FormControl>
                                        <Input type="number" placeholder="0.00" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="stock"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>
                                        Base Stock <span className="text-destructive">*</span>
                                    </FormLabel>
                                    <FormControl>
                                        <Input type="number" placeholder="0" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    {/* Image Upload Section */}
                    <div className="pt-4 border-t">
                        <ImageUpload
                            images={product.pendingImages || []}
                            onImagesChange={(images: ImageFile[]) =>
                                updateProduct({ pendingImages: images })
                            }
                            maxImages={5}
                            label="Product Images"
                            description="Upload up to 5 images (JPG, PNG, WebP). Max 1MB each. These will be the default images for all variants."
                        />
                    </div>

                    <Button type="submit" className="w-full">
                        Next
                        <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                </form>
            </Form>
        </div>
    );
}
