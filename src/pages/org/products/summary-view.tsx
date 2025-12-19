"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import type { Product } from "./types";
import { formatCurrency } from "./utils";
import { CheckCircle2, ImageIcon } from "lucide-react";

interface SummaryViewProps {
    product: Product;
}

export function SummaryView({ product }: SummaryViewProps) {
    // Get all unique option names for table headers
    const optionNames =
        product.variants && product.variants.length > 0
            ? Object.keys(product.variants[0].values).filter((key) => key !== "undefined")
            : [];

    // Calculate total inventory value
    const totalInventoryValue = product.variants
        ? product.variants.reduce((total, variant) => total + variant.buyPrice * variant.stock, 0)
        : product.buyPrice * product.stock;

    // Get variant image count
    const getVariantImageCount = (
        variant: typeof product.variants extends (infer T)[] | undefined ? T : never
    ) => {
        return variant.pendingImages?.length || 0;
    };

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-semibold">Product Summary</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="bg-muted/20">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5 text-primary" />
                            Basic Details
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <dl className="space-y-4">
                            <div>
                                <dt className="text-sm font-medium text-muted-foreground">
                                    Product Name
                                </dt>
                                <dd className="mt-1 text-lg font-medium">{product.name}</dd>
                            </div>
                            <div>
                                <dt className="text-sm font-medium text-muted-foreground">
                                    Description
                                </dt>
                                <dd className="mt-1 text-sm">{product.description}</dd>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <dt className="text-sm font-medium text-muted-foreground">
                                        Base Price
                                    </dt>
                                    <dd className="mt-1 text-lg font-medium">
                                        {formatCurrency(product.buyPrice)}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-sm font-medium text-muted-foreground">
                                        Selling Price
                                    </dt>
                                    <dd className="mt-1 text-lg font-medium">
                                        {formatCurrency(product.sellPrice)}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-sm font-medium text-muted-foreground">
                                        Base SKU
                                    </dt>
                                    <dd className="mt-1 text-lg font-medium">
                                        {product.sku.toUpperCase()}
                                    </dd>
                                </div>
                            </div>
                        </dl>
                    </CardContent>
                </Card>

                <Card className="bg-muted/20">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5 text-primary" />
                            Inventory Summary
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <dl className="space-y-4">
                            <div>
                                <dt className="text-sm font-medium text-muted-foreground">
                                    Total Variants
                                </dt>
                                <dd className="mt-1 text-lg font-medium">
                                    {product.variants?.length || 0}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-sm font-medium text-muted-foreground">
                                    Total Inventory Value
                                </dt>
                                <dd className="mt-1 text-lg font-medium">
                                    {formatCurrency(totalInventoryValue)}
                                </dd>
                            </div>
                        </dl>
                    </CardContent>
                </Card>
            </div>

            {/* Product Images */}
            {product.pendingImages && product.pendingImages.length > 0 && (
                <Card className="bg-muted/20">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <ImageIcon className="h-5 w-5 text-primary" />
                            Product Images ({product.pendingImages.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex gap-3 flex-wrap">
                            {product.pendingImages.map((image) => (
                                <div
                                    key={image.id}
                                    className="h-20 w-20 rounded-lg border overflow-hidden"
                                >
                                    <img
                                        src={image.preview}
                                        alt="Product"
                                        className="h-full w-full object-cover"
                                    />
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {product.options && product.options.length > 0 && (
                <Card className="bg-muted/20">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5 text-primary" />
                            Product Options
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {product.options.map((option, index) => (
                                <div key={index} className="border-b pb-3 last:border-0 last:pb-0">
                                    <h4 className="font-medium">{option.name}</h4>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {option.values.map((value, valueIndex) => (
                                            <span
                                                key={valueIndex}
                                                className="px-2 py-1 bg-muted rounded text-sm"
                                            >
                                                {value.value}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {product.variants && product.variants.length > 0 && (
                <Card className="bg-muted/20">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5 text-primary" />
                            Product Variants ({product.variants.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="border rounded-md overflow-hidden">
                            <div className="max-h-[300px] overflow-auto">
                                <Table>
                                    <TableHeader className="sticky top-0 bg-background z-10">
                                        <TableRow>
                                            {optionNames.map((option) => (
                                                <TableHead key={option}>{option}</TableHead>
                                            ))}
                                            <TableHead>SKU</TableHead>
                                            <TableHead>Buy Price</TableHead>
                                            <TableHead>Sell Price</TableHead>
                                            <TableHead>Stock</TableHead>
                                            <TableHead>Images</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {product.variants.map((variant, index) => (
                                            <TableRow key={index}>
                                                {optionNames.map((option) => (
                                                    <TableCell key={option} className="font-medium">
                                                        {variant.values[option]}
                                                    </TableCell>
                                                ))}
                                                <TableCell className="font-mono text-xs">
                                                    {variant.sku}
                                                </TableCell>
                                                <TableCell>
                                                    {formatCurrency(variant.buyPrice)}
                                                </TableCell>
                                                <TableCell>
                                                    {formatCurrency(variant.sellPrice)}
                                                </TableCell>
                                                <TableCell>{variant.stock}</TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-1">
                                                        <ImageIcon className="h-4 w-4 text-muted-foreground" />
                                                        <span className="text-sm">
                                                            {getVariantImageCount(variant)}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
