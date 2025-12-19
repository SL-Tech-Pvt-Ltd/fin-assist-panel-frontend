"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useRequirePermissions } from "@/hooks/use-permissions";
import { Card, CardContent } from "@/components/ui/card";
import { BasicDetailsForm } from "./basic-details-form";
import { OptionsForm } from "./option-form";
import { VariantsForm } from "./variants-form";
import { SummaryView } from "./summary-view";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Product } from "./types";
import { generateVariants, generateDefaultSKU } from "./utils";
import { Category } from "@/data/types";
import { useOrg } from "@/providers/org-provider";
import { api } from "@/utils/api";
import type { ImageFile } from "./image-upload";

interface Step {
    id: number;
    title: string;
}

interface StepIndicatorProps {
    steps: Step[];
    currentStep: number;
}

function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
    return (
        <div className="w-full">
            <div className="flex justify-between mb-2">
                {steps.map((step) => (
                    <div
                        key={step.id}
                        className={`flex-1 text-center ${
                            step.id === currentStep
                                ? "text-primary font-medium"
                                : step.id < currentStep
                                ? "text-primary/70"
                                : "text-muted-foreground"
                        }`}
                    >
                        <span className="hidden sm:inline">{step.title}</span>
                        <span className="sm:hidden">{step.id}</span>
                    </div>
                ))}
            </div>

            <div className="relative w-full h-2 bg-muted rounded-full overflow-hidden">
                <div
                    className="absolute top-0 left-0 h-full bg-primary transition-all duration-300"
                    style={{
                        width: `${((currentStep - 1) / (steps.length - 1)) * 100}%`,
                    }}
                />
                <div className="absolute top-0 left-0 w-full h-full flex justify-between items-center px-[1px]">
                    {steps.map((step) => (
                        <div
                            key={step.id}
                            className={`h-4 w-4 rounded-full border-2 border-background transition-all duration-200 ${
                                step.id <= currentStep ? "bg-primary" : "bg-muted-foreground/30"
                            }`}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}

export default function ProductForm() {
    useRequirePermissions("PRODUCT_CREATE");
    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isGeneratingVariants, setIsGeneratingVariants] = useState(false);
    const { toast } = useToast();
    const navigate = useNavigate();
    const formRef = useRef<HTMLDivElement>(null);

    const steps = [
        { id: 1, title: "Basic Details" },
        { id: 2, title: "Options" },
        { id: 3, title: "Variants" },
        { id: 4, title: "Summary" },
    ];
    const { orgId } = useOrg();

    const initialProduct: Product = {
        name: "",
        description: "",
        buyPrice: 0,
        sellPrice: 0,
        categoryId: "",
        code: "",
        stock: 0,
        sku: generateDefaultSKU(),
        options: [],
        variants: [],
    };
    const [categories, setCategories] = useState<Category[]>([]);
    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const data = await (await api.get<Category[]>(`/orgs/${orgId}/category`)).data;
                setCategories(data);
            } catch (error) {
                console.error("Failed to fetch categories:", error);
                toast({
                    title: "Error",
                    description: "Could not load categories.",
                    variant: "destructive",
                });
            }
        };
        fetchCategories();
    }, [orgId]);

    const addCategory = async (name: string, description: string) => {
        const newCategory = await api.post(`/orgs/${orgId}/category`, {
            name,
            description,
        });
        // set product.categoryId to the new category ID

        setCategories((prev) => [...prev, newCategory.data]);
        setProduct((prev) => ({
            ...prev,
            categoryId: newCategory.data.id,
        }));
    };
    const [product, setProduct] = useState<Product>(initialProduct);
    const [isSkuManuallyEdited, setIsSkuManuallyEdited] = useState(false);

    // Auto-generate SKU when product name or category changes
    useEffect(() => {
        if (product.name && !isSkuManuallyEdited) {
            const generatedSKU = generateDefaultSKU();
            setProduct((prev) => ({
                ...prev,
                sku: generatedSKU,
            }));
        }
    }, [product.name, product.categoryId, categories, isSkuManuallyEdited]);

    // Generate variants whenever options change, with debounce
    useEffect(() => {
        if (product.options && product.options.length > 0) {
            const hasValidOptions = product.options.some(
                (option) => option.name && option.values && option.values.length > 0
            );

            if (hasValidOptions) {
                setIsGeneratingVariants(true);
                const timer = setTimeout(() => {
                    const generatedVariants = generateVariants(
                        product.name,
                        product.sku,
                        product.options || [],
                        product.buyPrice,
                        product.sellPrice,
                        product.stock
                    );
                    setProduct((prev) => ({
                        ...prev,
                        variants: generatedVariants,
                    }));
                    setIsGeneratingVariants(false);
                }, 300);

                return () => clearTimeout(timer);
            }
        }
    }, [
        product.options,
        product.buyPrice,
        product.sellPrice,
        product.stock,
        product.name,
        product.sku,
    ]);
    const updateProduct = useCallback((data: Partial<Product>) => {
        // Check if SKU was manually edited
        if (data.sku !== undefined) {
            setIsSkuManuallyEdited(true);
        }

        setProduct((prev) => ({
            ...prev,
            ...data,
        }));
    }, []);

    const handleNext = useCallback(() => {
        if (step < 4) {
            setStep(step + 1);
            // Scroll to top of form
            formRef.current?.scrollIntoView({ behavior: "smooth" });
        } else {
            // Submit the form
            handleSubmit();
        }
    }, [step]);

    const handlePrev = useCallback(() => {
        if (step > 1) {
            setStep(step - 1);
            // Scroll to top of form
            formRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [step]);

    // Upload a single image and return the URL
    const uploadImage = async (image: ImageFile): Promise<string> => {
        if (image.isUploaded && image.url) {
            return image.url;
        }
        if (!image.file) {
            throw new Error("No file to upload");
        }

        const formData = new FormData();
        formData.append("file", image.file);

        const uploadResponse = await api.post("/upload/public", formData, {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        });

        return uploadResponse.data.data.url;
    };

    // Collect all unique images from product and variants
    const collectUniqueImages = (): ImageFile[] => {
        const uniqueImages: ImageFile[] = [];
        const seenPreviews = new Set<string>();

        // Add product images
        if (product.pendingImages) {
            for (const img of product.pendingImages) {
                if (!seenPreviews.has(img.preview)) {
                    seenPreviews.add(img.preview);
                    uniqueImages.push(img);
                }
            }
        }

        // Add variant images (deduplicated - same image won't be uploaded twice)
        if (product.variants) {
            for (const variant of product.variants) {
                if (variant.pendingImages) {
                    for (const img of variant.pendingImages) {
                        if (!seenPreviews.has(img.preview)) {
                            seenPreviews.add(img.preview);
                            uniqueImages.push(img);
                        }
                    }
                }
            }
        }

        return uniqueImages;
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);

        try {
            // Step 1: Collect and upload all unique images
            const uniqueImages = collectUniqueImages();
            const uploadedUrlMap = new Map<string, string>(); // preview -> uploaded URL

            if (uniqueImages.length > 0) {
                toast({
                    title: "Uploading images...",
                    description: `Uploading ${uniqueImages.length} image(s)`,
                });

                for (const image of uniqueImages) {
                    const url = await uploadImage(image);
                    uploadedUrlMap.set(image.preview, url);
                }
            }

            // Step 2: Build the product payload with uploaded URLs
            const productImageUrls = product.pendingImages
                ? product.pendingImages
                      .map((img) => uploadedUrlMap.get(img.preview)!)
                      .filter(Boolean)
                : [];

            const variantsWithUrls = product.variants?.map((variant) => {
                // Get variant's image URLs from the uploaded map
                const variantImageUrls = variant.pendingImages
                    ? variant.pendingImages
                          .map((img) => uploadedUrlMap.get(img.preview)!)
                          .filter(Boolean)
                    : [];

                // Remove pendingImages and useProductImages from the variant payload
                const { pendingImages, useProductImages, imageUrls, ...cleanVariant } = variant;

                // Build variant payload matching ProductVariantInput
                return {
                    name: cleanVariant.name,
                    description: cleanVariant.description,
                    sku: cleanVariant.sku,
                    buyPrice: cleanVariant.buyPrice,
                    sellPrice: cleanVariant.sellPrice,
                    stock: cleanVariant.stock,
                    values: cleanVariant.values,
                    isBase: cleanVariant.isBase,
                    imageUrls: variantImageUrls.length > 0 ? variantImageUrls : undefined,
                };
            });

            // Remove pendingImages from the product payload
            const { pendingImages, ...cleanProduct } = product;

            // Convert options array to object format
            const optionsObject =
                product.options?.reduce((acc, option) => {
                    if (option.name && option.values) {
                        acc[option.name] = option.values.map((v) => v.value);
                    }
                    return acc;
                }, {} as Record<string, string[]>) || {};

            const productPayload = {
                orgId,
                ...cleanProduct,
                options: optionsObject,
                imageUrls: productImageUrls,
                variants: variantsWithUrls,
            };

            // Step 3: Create the product
            const response = await api.post(`/orgs/${orgId}/products`, productPayload);

            // Navigate to success page with product details
            const searchParams = new URLSearchParams({
                productName: product.name,
                ...(response.data?.id && { productId: response.data.id }),
            });

            navigate(`/org/${orgId}/products/success?${searchParams.toString()}`);
        } catch (error) {
            toast({
                title: "Error",
                description: "There was an error creating your product. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto py-6 w-full" ref={formRef}>
            <h1 className="text-3xl font-bold mb-4">Create Product</h1>
            <StepIndicator steps={steps} currentStep={step} />

            <Card className="shadow-md border-t-4 border-t-primary mt-8">
                <CardContent className="p-0">
                    <div className="p-6">
                        {step === 1 && (
                            <BasicDetailsForm
                                product={product}
                                updateProduct={updateProduct}
                                onNext={handleNext}
                                categories={categories}
                                addCategory={addCategory}
                            />
                        )}

                        {step === 2 && (
                            <OptionsForm
                                options={product.options || []}
                                updateOptions={(options) => updateProduct({ options })}
                            />
                        )}

                        {step === 3 && (
                            <VariantsForm
                                variants={product.variants || []}
                                updateVariants={(variants) => updateProduct({ variants })}
                                isLoading={isGeneratingVariants}
                                options={product.options}
                                productName={product.name}
                                productSKU={product.sku}
                                buyPrice={product.buyPrice}
                                sellPrice={product.sellPrice}
                                stock={product.stock}
                                productImages={product.pendingImages || []}
                            />
                        )}

                        {step === 4 && <SummaryView product={product} />}
                    </div>

                    <div className="flex justify-between items-center p-6 bg-muted/30 border-t">
                        <Button
                            variant="outline"
                            onClick={handlePrev}
                            disabled={step === 1 || isSubmitting}
                            className="transition-all duration-200 hover:bg-muted"
                        >
                            <ChevronLeft className="mr-2 h-4 w-4" />
                            Previous
                        </Button>

                        {step !== 1 && (
                            <Button
                                onClick={handleNext}
                                disabled={isSubmitting}
                                className="transition-all duration-200 min-w-[120px]"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        {step === 4 ? "Creating..." : "Next..."}
                                    </>
                                ) : (
                                    <>
                                        {step === 4 ? "Create Product" : "Next"}
                                        {step !== 4 && <ChevronRight className="ml-2 h-4 w-4" />}
                                    </>
                                )}
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
