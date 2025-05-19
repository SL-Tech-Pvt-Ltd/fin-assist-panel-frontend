import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { ProductOptions, ProductVariant } from "./types";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function generateSlug(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^\w\s-]/g, "") // Remove special characters
        .replace(/\s+/g, "-") // Replace spaces with hyphens
        .replace(/-+/g, "-") // Replace multiple hyphens with single hyphen
        .trim();
}

export function generateVariants(
    productName: string,
    options: ProductOptions[],
    basePrice: number,
    baseStock: number
): ProductVariant[] {
    // If no options, return empty array
    if (!options.length || options.every((option) => !option.values.length)) {
        return [];
    }

    // Get all valid options (with name and at least one value)
    const validOptions = options.filter((option) => option.name && option.values.length > 0);

    if (validOptions.length === 0) {
        return [];
    }

    // Generate all combinations of option values
    const generateCombinations = (
        optionIndex: number,
        currentCombination: { [key: string]: string },
        optionSlugs: { [key: string]: string }
    ): ProductVariant[] => {
        // If we've processed all options, return the current combination as a variant
        if (optionIndex >= validOptions.length) {
            // Generate variant name and SKU from combination
            const nameParts: string[] = [];
            const skuParts: string[] = [];

            Object.entries(optionSlugs).forEach(([optionSlug, valueSlug]) => {
                const option = validOptions.find((o) => o.slug === optionSlug);
                const value = option?.values.find((v) => v.slug === valueSlug);

                if (option && value) {
                    nameParts.push(`${option.name}: ${value.value}`);
                    skuParts.push(valueSlug);
                }
            });

            const variantName = nameParts.join(", ");
            const sku = skuParts.join("-");

            return [
                {
                    name: productName + "-" + variantName,
                    sku,
                    price: basePrice,
                    stock: baseStock,
                    options: optionSlugs,
                },
            ];
        }

        // Get the current option
        const currentOption = validOptions[optionIndex];
        const variants: ProductVariant[] = [];

        // For each value of the current option
        currentOption.values.forEach((value) => {
            // Add this value to the current combination
            const newCombination = { ...currentCombination };
            const newOptionSlugs = { ...optionSlugs };

            newOptionSlugs[currentOption.slug] = value.slug;
            newCombination[currentOption.name] = value.value;

            // Recursively generate combinations with the next option
            const newVariants = generateCombinations(
                optionIndex + 1,
                newCombination,
                newOptionSlugs
            );

            variants.push(...newVariants);
        });

        return variants;
    };

    return generateCombinations(0, {}, {});
}

// Add this function to format currency values
export function formatCurrency(value: number): string {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
    }).format(value);
}
