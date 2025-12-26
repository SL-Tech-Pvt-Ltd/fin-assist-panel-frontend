"use client";

import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useRequirePermissions, usePermissions } from "@/hooks/use-permissions";
import {
    ArrowLeft,
    Edit,
    Trash2,
    // Archive,
    // Copy,
    // MoreHorizontal,
    AlertCircle,
    Package,
    Plus,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import {
    Dialog,
    DialogTrigger,
    DialogContent,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogClose,
} from "@/components/ui/dialog";
import { useOrg } from "@/providers/org-provider";
import { useParams } from "react-router-dom";
import { api } from "@/utils/api";
import { Product, ProductVariant } from "@/data/types";
import { RemoveModal } from "@/components/modals/RemoveModal";
import { useToast } from "@/hooks/use-toast";
import EditProductDialog from "@/components/modals/EditProductDialog";
import EditVariantDialog from "@/components/modals/EditVariantDialog";
import AddVariantDialog from "@/components/modals/AddVariantDialog";

// Custom Publish Modal Component
const PublishModal: React.FC<{
    isPublished: boolean;
    onToggle: () => Promise<void>;
    loading: boolean;
}> = ({ isPublished, onToggle, loading }) => {
    const [modalLoading, setModalLoading] = useState(false);
    const { toast } = useToast();

    const handleToggle = async () => {
        try {
            setModalLoading(true);
            await onToggle();
            toast({
                title: "Success",
                description: `Product ${isPublished ? "unpublished" : "published"} successfully.`,
            });
        } catch (error) {
            toast({
                title: "Error",
                description: `Failed to ${isPublished ? "unpublish" : "publish"} product.`,
                variant: "destructive",
            });
        } finally {
            setModalLoading(false);
        }
    };

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant={isPublished ? "outline" : "default"} disabled={loading}>
                    {loading
                        ? isPublished
                            ? "Unpublishing..."
                            : "Publishing..."
                        : isPublished
                        ? "Unpublish"
                        : "Publish"}
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogTitle>{isPublished ? "Unpublish Product" : "Publish Product"}</DialogTitle>
                <DialogDescription>
                    {isPublished
                        ? "Are you sure you want to unpublish this product? It will no longer be visible to customers."
                        : "Are you sure you want to publish this product? It will be visible to customers."}
                </DialogDescription>
                <DialogFooter className="flex justify-end gap-2">
                    <DialogClose asChild>
                        <Button variant="secondary" disabled={modalLoading}>
                            Cancel
                        </Button>
                    </DialogClose>
                    <Button
                        onClick={handleToggle}
                        variant={isPublished ? "outline" : "default"}
                        disabled={modalLoading}
                    >
                        {modalLoading
                            ? isPublished
                                ? "Unpublishing..."
                                : "Publishing..."
                            : isPublished
                            ? "Unpublish"
                            : "Publish"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

const SingleProductPage = () => {
    useRequirePermissions("PRODUCT_READ");
    const { hasPermission } = usePermissions();
    const { productId } = useParams<{ productId: string }>() as {
        productId: string;
    };

    const orgId = useOrg().orgId;
    const { toast } = useToast();

    const [product, setProduct] = useState<Product | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [publishLoading, setPublishLoading] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [editingVariant, setEditingVariant] = useState<ProductVariant | null>(null);
    const [isEditVariantDialogOpen, setIsEditVariantDialogOpen] = useState(false);
    const [isAddVariantDialogOpen, setIsAddVariantDialogOpen] = useState(false);

    useEffect(() => {
        const fetchProduct = async () => {
            try {
                setLoading(true);
                const response = await api.get(`/orgs/${orgId}/products/${productId}`);
                setProduct(response.data);
            } catch (error) {
                console.error("Error fetching product:", error);
                setError("Failed to load product data. Please try again.");
            } finally {
                setLoading(false);
            }
        };

        fetchProduct();
    }, [productId, orgId]);
    const navigate = useNavigate();

    const handleDeleteProduct = async () => {
        if (!product) return;
        try {
            await api.delete(`orgs/${orgId}/products/${product.id}`);
            // Redirect or show success message
            navigate(`/org/${orgId}/products`);
        } catch (error) {
            console.error("Error deleting product:", error);
            setError("Failed to delete product. Please try again.");
            throw new Error("Failed to delete product");
        }
    };

    const handleTogglePublish = async () => {
        if (!product) return;
        try {
            setPublishLoading(true);
            const response = await api.put(`/orgs/${orgId}/products/${product.id}`, {
                isPublished: !product.isPublished,
            });
            setProduct(response.data.data);
        } catch (error) {
            console.error("Error updating product:", error);
            setError("Failed to update product. Please try again.");
            throw new Error("Failed to update product");
        } finally {
            setPublishLoading(false);
        }
    };

    const handleProductUpdate = (updatedProduct: Product) => {
        setProduct(updatedProduct);
    };

    const handleEditVariant = (variant: ProductVariant) => {
        setEditingVariant(variant);
        setIsEditVariantDialogOpen(true);
    };

    const handleDeleteVariant = async (variantId: string) => {
        if (!product) return;

        try {
            await api.delete(`/orgs/${orgId}/products/${product.id}/variants/${variantId}`);

            // Update the product state to remove the deleted variant
            const updatedProduct = {
                ...product,
                variants: product.variants?.filter((v) => v.id !== variantId) || [],
            };
            setProduct(updatedProduct);

            toast({
                title: "Success",
                description: "Variant deleted successfully.",
            });
        } catch (error) {
            console.error("Error deleting variant:", error);
            toast({
                title: "Error",
                description: "Failed to delete variant. Please try again.",
                variant: "destructive",
            });
        }
    };

    const handleVariantUpdate = async (updatedVariant: ProductVariant) => {
        if (!product) return;

        // Update the product state with the updated variant
        const updatedProduct = {
            ...product,
            variants:
                product.variants?.map((v) =>
                    v.id === updatedVariant.id
                        ? {
                              ...updatedVariant,
                              items: v.items, // Preserve the items array
                          }
                        : v
                ) || [],
        };
        setProduct(updatedProduct);
        setIsEditVariantDialogOpen(false);
        setEditingVariant(null);
    };

    const handleVariantAdd = async (newVariant: ProductVariant) => {
        if (!product) return;

        // Add the new variant to the product state
        const updatedProduct = {
            ...product,
            variants: [...(product.variants || []), newVariant],
        };
        setProduct(updatedProduct);
        setIsAddVariantDialogOpen(false);
    };

    if (loading) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="flex items-center mb-6">
                    <Skeleton className="h-10 w-24" />
                </div>
                <div className="">
                    <div className="space-y-4">
                        <Skeleton className="h-10 w-3/4" />
                        <Skeleton className="h-6 w-1/4" />
                        <Skeleton className="h-6 w-1/3" />
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-2/3" />
                        </div>
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="container mx-auto px-4 py-8">
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
                <div className="mt-4">
                    <Button variant="outline" onClick={() => window.location.reload()}>
                        Try Again
                    </Button>
                </div>
            </div>
        );
    }

    if (!product) {
        return (
            <div className="container mx-auto px-4 py-8">
                <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>Product not found.</AlertDescription>
                </Alert>
                <div className="mt-4">
                    <Link to="/products">
                        <Button variant="outline">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Products
                        </Button>
                    </Link>
                </div>
            </div>
        );
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    };

    const formatCurrency = (amount: number) => {
        return `Rs ${amount.toLocaleString("en-IN", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        })}`;
    };

    return (
        <div className="container mx-auto px-4 py-8">
            {/* Header with back button and actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                <div className="flex items-center">
                    <Link to={`/org/${orgId}/products`}>
                        <Button variant="outline" size="sm" className="mr-4">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Products
                        </Button>
                    </Link>
                    <h1 className="text-2xl font-bold">Product Details</h1>
                </div>

                <div className="flex items-center space-x-2">
                    {hasPermission("PRODUCT_UPDATE") && (
                        <>
                            <Button
                                variant="outline"
                                onClick={() => setIsEditDialogOpen(true)}
                                disabled={loading}
                            >
                                <Edit className="mr-2 h-4 w-4" />
                                Edit Product
                            </Button>
                            <PublishModal
                                isPublished={product.isPublished || false}
                                onToggle={handleTogglePublish}
                                loading={publishLoading}
                            />
                        </>
                    )}
                    {hasPermission("PRODUCT_UPDATE") && (
                        <RemoveModal
                            title="Delete Product"
                            text="Delete Product"
                            description="Are you sure you want to delete this product? This action cannot be undone."
                            onRemove={handleDeleteProduct}
                        />
                    )}
                </div>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
                {/* Product Details */}
                <div className="md:col-span-3">
                    <Card>
                        <div className="p-6">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h2 className="text-2xl font-bold">{product.name}</h2>
                                    {product.category && (
                                        <Badge variant="outline" className="mt-1">
                                            {product.category.name}
                                        </Badge>
                                    )}
                                </div>
                            </div>

                            <Separator className="my-4" />

                            {/* Product Information */}
                            <div className="grid grid-cols-2 gap-y-4 text-sm mb-6">
                                <div className="font-medium">SKU</div>
                                <div>{product.sku}</div>

                                <div className="font-medium">Status</div>
                                <div>
                                    <Badge variant={product.isPublished ? "default" : "secondary"}>
                                        {product.isPublished ? "Published" : "Draft"}
                                    </Badge>
                                </div>

                                <div className="font-medium">Category</div>
                                <div>{product.category?.name || "Uncategorized"}</div>

                                <div className="font-medium">Created</div>
                                <div>{formatDate(product.createdAt)}</div>

                                <div className="font-medium">Last Updated</div>
                                <div>{formatDate(product.updatedAt)}</div>
                            </div>

                            {product.description && (
                                <div className="mb-6">
                                    <h3 className="text-sm font-medium mb-2">Description</h3>
                                    <p className="text-sm text-muted-foreground">
                                        {product.description}
                                    </p>
                                </div>
                            )}

                            {/* Product Images */}
                            <div className="mb-6">
                                <h3 className="text-sm font-medium mb-2">Product Images</h3>
                                {product.imageUrls && product.imageUrls.length > 0 ? (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                        {product.imageUrls.map((url, index) => (
                                            <div
                                                key={index}
                                                className="aspect-square rounded-lg border overflow-hidden bg-muted hover:shadow-md transition-shadow cursor-pointer group"
                                                onClick={() => window.open(url, "_blank")}
                                            >
                                                <img
                                                    src={url}
                                                    alt={`${product.name} - Image ${index + 1}`}
                                                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-200"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="aspect-square max-w-[200px] rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/30 flex flex-col items-center justify-center text-muted-foreground">
                                        <Package className="h-10 w-10 mb-2 opacity-50" />
                                        <span className="text-sm">No images</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </Card>
                    <Card>
                        <div className="p-6">
                            {product.variants && product.variants.length > 0 ? (
                                <div className="space-y-6">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <h3 className="text-lg font-medium">
                                                Product Variants & Transaction Ledger
                                            </h3>
                                            <div className="text-sm text-muted-foreground">
                                                Complete variant details with transaction history
                                            </div>
                                        </div>
                                        {/* Only show Add Variant button if product has options */}
                                        {(product as any)?.options &&
                                            (product as any).options.length > 0 && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setIsAddVariantDialogOpen(true)}
                                                    className="gap-2"
                                                >
                                                    <Plus className="h-4 w-4" />
                                                    Add Variant
                                                </Button>
                                            )}
                                    </div>

                                    {product.variants.map((variant) => {
                                        // Calculate running totals
                                        const sortedItems =
                                            variant.items?.sort(
                                                (a, b) =>
                                                    new Date(a.createdAt).getTime() -
                                                    new Date(b.createdAt).getTime()
                                            ) || [];

                                        // Calculate total bought and sold
                                        const totalBought =
                                            variant.stock_fifo_queue?.reduce(
                                                (sum, entry) => sum + entry.originalStock,
                                                0
                                            ) || 0;

                                        const totalSold =
                                            variant.stock_fifo_queue?.reduce(
                                                (sum, entry) =>
                                                    sum +
                                                    (entry.originalStock - entry.availableStock),
                                                0
                                            ) || 0;

                                        const totalStock =
                                            variant.stock_fifo_queue?.reduce(
                                                (sum, entry) => sum + entry.availableStock,
                                                0
                                            ) || 0;
                                        const inventoryValue =
                                            variant.stock_fifo_queue?.reduce(
                                                (sum, entry) =>
                                                    sum + entry.availableStock * entry.buyPrice,
                                                0
                                            ) || 0;

                                        const totalEstimatedValue =
                                            variant.stock_fifo_queue?.reduce(
                                                (sum, entry) =>
                                                    sum +
                                                    entry.availableStock * entry.estimatedPrice,
                                                0
                                            ) || 0;
                                        const isLowStock = totalStock <= 5;

                                        return (
                                            <div key={variant.id} className="border rounded-lg">
                                                {/* Variant Header with Basic Info */}
                                                <div className="bg-muted/50 px-4 py-3 border-b">
                                                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3">
                                                        <div className="flex gap-4 items-start">
                                                            {/* Variant Images */}
                                                            {variant.imageUrls &&
                                                                variant.imageUrls.length > 0 && (
                                                                    <div className="flex gap-2 flex-shrink-0">
                                                                        {variant.imageUrls
                                                                            .slice(0, 3)
                                                                            .map(
                                                                                (url, imgIndex) => (
                                                                                    <div
                                                                                        key={
                                                                                            imgIndex
                                                                                        }
                                                                                        className="h-16 w-16 rounded-md border overflow-hidden bg-background hover:shadow-md transition-shadow cursor-pointer group"
                                                                                        onClick={() =>
                                                                                            window.open(
                                                                                                url,
                                                                                                "_blank"
                                                                                            )
                                                                                        }
                                                                                    >
                                                                                        <img
                                                                                            src={
                                                                                                url
                                                                                            }
                                                                                            alt={`${
                                                                                                variant.name
                                                                                            } - Image ${
                                                                                                imgIndex +
                                                                                                1
                                                                                            }`}
                                                                                            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-200"
                                                                                        />
                                                                                    </div>
                                                                                )
                                                                            )}
                                                                        {variant.imageUrls.length >
                                                                            3 && (
                                                                            <div className="h-16 w-16 rounded-md border bg-muted flex items-center justify-center text-sm text-muted-foreground cursor-pointer hover:bg-muted/80">
                                                                                +
                                                                                {variant.imageUrls
                                                                                    .length - 3}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            <div className="flex-1">
                                                                <h4 className="font-medium text-lg">
                                                                    {variant.name}
                                                                </h4>
                                                                <div className="flex flex-wrap items-center gap-4 mt-1">
                                                                    <p className="text-sm text-muted-foreground">
                                                                        SKU: {variant.sku}
                                                                    </p>
                                                                    <p className="text-sm text-muted-foreground">
                                                                        Code: {variant.code}
                                                                    </p>
                                                                    <Badge
                                                                        variant={
                                                                            isLowStock
                                                                                ? "destructive"
                                                                                : "secondary"
                                                                        }
                                                                    >
                                                                        {isLowStock
                                                                            ? "Low Stock"
                                                                            : "In Stock"}
                                                                    </Badge>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                                                            <div className="flex items-center gap-2">
                                                                {hasPermission(
                                                                    "PRODUCT_UPDATE"
                                                                ) && (
                                                                    <>
                                                                        <Button
                                                                            variant="outline"
                                                                            size="sm"
                                                                            onClick={() =>
                                                                                handleEditVariant(
                                                                                    variant
                                                                                )
                                                                            }
                                                                        >
                                                                            <Edit className="h-4 w-4 mr-1" />
                                                                            Edit
                                                                        </Button>
                                                                        <Dialog>
                                                                            <DialogTrigger asChild>
                                                                                <Button
                                                                                    variant="outline"
                                                                                    size="sm"
                                                                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                                                >
                                                                                    <Trash2 className="h-4 w-4 mr-1" />
                                                                                    Delete
                                                                                </Button>
                                                                            </DialogTrigger>
                                                                            <DialogContent>
                                                                                <DialogTitle>
                                                                                    Delete Variant
                                                                                </DialogTitle>
                                                                                <DialogDescription>
                                                                                    Are you sure you
                                                                                    want to delete
                                                                                    the variant "
                                                                                    {variant.name}
                                                                                    "? This action
                                                                                    cannot be
                                                                                    undone.
                                                                                </DialogDescription>
                                                                                <DialogFooter className="flex justify-end gap-2">
                                                                                    <DialogClose
                                                                                        asChild
                                                                                    >
                                                                                        <Button variant="secondary">
                                                                                            Cancel
                                                                                        </Button>
                                                                                    </DialogClose>
                                                                                    <DialogClose
                                                                                        asChild
                                                                                    >
                                                                                        <Button
                                                                                            variant="destructive"
                                                                                            onClick={() =>
                                                                                                handleDeleteVariant(
                                                                                                    variant.id
                                                                                                )
                                                                                            }
                                                                                        >
                                                                                            <Trash2 className="h-4 w-4 mr-1" />
                                                                                            Delete
                                                                                        </Button>
                                                                                    </DialogClose>
                                                                                </DialogFooter>
                                                                            </DialogContent>
                                                                        </Dialog>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Variant Details Section */}
                                                <div className="p-4 border-b bg-background">
                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                                        <div className="bg-blue-50 p-3 rounded-md border border-blue-200">
                                                            <div className="font-medium text-blue-800">
                                                                Latest Buy Price
                                                            </div>
                                                            <div className="text-lg font-bold text-blue-900">
                                                                {formatCurrency(variant.buyPrice)}
                                                            </div>
                                                        </div>

                                                        <div className="bg-purple-50 p-3 rounded-md border border-purple-200">
                                                            <div className="font-medium text-purple-800">
                                                                Selling Price
                                                            </div>
                                                            <div className="text-lg font-bold text-purple-900">
                                                                {variant.price || 0}
                                                            </div>
                                                            {/* <div className="text-xs text-purple-600">
                                                                Transactions
                                                            </div> */}
                                                        </div>
                                                        <div className="bg-amber-50 p-3 rounded-md border border-amber-200">
                                                            <div className="font-medium text-amber-800">
                                                                Last Activity
                                                            </div>
                                                            <div className="text-sm font-bold text-amber-900">
                                                                {variant.items &&
                                                                variant.items.length > 0
                                                                    ? formatDate(
                                                                          variant.items[
                                                                              variant.items.length -
                                                                                  1
                                                                          ].createdAt
                                                                      )
                                                                    : "No activity"}
                                                            </div>
                                                        </div>
                                                        <div className="bg-emerald-50 p-3 rounded-md border border-emerald-200">
                                                            <div className="font-medium text-emerald-800">
                                                                Total Adjusted Value
                                                            </div>
                                                            <div className="text-lg font-bold text-emerald-900">
                                                                {formatCurrency(
                                                                    totalEstimatedValue
                                                                )}
                                                            </div>
                                                            <div className="text-xs text-emerald-600">
                                                                As of Today
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Transaction Summary Stats */}
                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                        <div className="bg-green-50 p-3 rounded-md border border-green-200">
                                                            <div className="font-medium text-green-800">
                                                                Total Bought
                                                            </div>
                                                            <div className="text-lg font-bold text-green-900">
                                                                {totalBought}
                                                            </div>
                                                        </div>
                                                        <div className="bg-red-50 p-3 rounded-md border border-red-200">
                                                            <div className="font-medium text-red-800">
                                                                Total Sold
                                                            </div>
                                                            <div className="text-lg font-bold text-red-900">
                                                                {totalSold}
                                                            </div>
                                                        </div>
                                                        <div className="bg-blue-50 p-3 rounded-md border border-blue-200">
                                                            <div className="font-medium text-blue-800">
                                                                Available Stock
                                                            </div>
                                                            <div className="text-lg font-bold text-blue-900">
                                                                {totalStock}
                                                            </div>
                                                        </div>
                                                        <div className="bg-gray-50 p-3 rounded-md border border-gray-200">
                                                            <div className="font-medium text-gray-800">
                                                                Inventory Value
                                                            </div>
                                                            <div className="text-lg font-bold text-gray-900">
                                                                {formatCurrency(inventoryValue)}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Transaction Ledger */}
                                                <div className="p-4">
                                                    <h5 className="font-medium mb-3">
                                                        Transaction History
                                                    </h5>
                                                    {sortedItems.length > 0 ? (
                                                        <div className="overflow-x-auto">
                                                            <Table>
                                                                <TableHeader>
                                                                    <TableRow>
                                                                        <TableHead>Date</TableHead>
                                                                        <TableHead>
                                                                            Order #
                                                                        </TableHead>
                                                                        <TableHead>
                                                                            Entity
                                                                        </TableHead>
                                                                        <TableHead>Type</TableHead>
                                                                        <TableHead>
                                                                            Quantity
                                                                        </TableHead>
                                                                        <TableHead>Rate</TableHead>
                                                                        <TableHead>
                                                                            Amount
                                                                        </TableHead>
                                                                        <TableHead>
                                                                            Running Stock
                                                                        </TableHead>
                                                                        <TableHead>
                                                                            Status
                                                                        </TableHead>
                                                                    </TableRow>
                                                                </TableHeader>
                                                                <TableBody>
                                                                    {sortedItems.map(
                                                                        (item, index) => {
                                                                            // Calculate running stock up to this point
                                                                            const runningStock =
                                                                                sortedItems
                                                                                    .slice(
                                                                                        0,
                                                                                        index + 1
                                                                                    )
                                                                                    .reduce(
                                                                                        (
                                                                                            stock,
                                                                                            currentItem
                                                                                        ) => {
                                                                                            if (
                                                                                                currentItem
                                                                                                    .order
                                                                                                    ?.type ===
                                                                                                "BUY"
                                                                                            ) {
                                                                                                return (
                                                                                                    stock +
                                                                                                    currentItem.quantity
                                                                                                );
                                                                                            } else if (
                                                                                                currentItem
                                                                                                    .order
                                                                                                    ?.type ===
                                                                                                "SELL"
                                                                                            ) {
                                                                                                return (
                                                                                                    stock -
                                                                                                    currentItem.quantity
                                                                                                );
                                                                                            }
                                                                                            return stock;
                                                                                        },
                                                                                        0
                                                                                    );

                                                                            const totalAmount =
                                                                                item.quantity *
                                                                                item.price;

                                                                            return (
                                                                                <TableRow
                                                                                    key={item.id}
                                                                                >
                                                                                    <TableCell className="text-sm">
                                                                                        {formatDate(
                                                                                            item.createdAt
                                                                                        )}
                                                                                    </TableCell>
                                                                                    <TableCell className="font-mono text-xs">
                                                                                        <Link
                                                                                            to={`/org/${product.organizationId}/orders/${item.orderId}`}
                                                                                            className="hover:underline"
                                                                                        >
                                                                                            {item
                                                                                                .order
                                                                                                ?.orderNumber ||
                                                                                                "N/A"}
                                                                                        </Link>
                                                                                    </TableCell>
                                                                                    <TableCell className="text-sm">
                                                                                        <Link
                                                                                            to={`/org/${product.organizationId}/entity/${item.order?.entityId}`}
                                                                                            className="hover:underline"
                                                                                        >
                                                                                            {item
                                                                                                .order
                                                                                                ?.entity
                                                                                                ?.name ||
                                                                                                "N/A"}
                                                                                        </Link>
                                                                                    </TableCell>
                                                                                    <TableCell>
                                                                                        <Badge
                                                                                            variant={
                                                                                                item
                                                                                                    .order
                                                                                                    ?.type ===
                                                                                                "BUY"
                                                                                                    ? "secondary"
                                                                                                    : item
                                                                                                          .order
                                                                                                          ?.type ===
                                                                                                      "SELL"
                                                                                                    ? "default"
                                                                                                    : "outline"
                                                                                            }
                                                                                            className={
                                                                                                item
                                                                                                    .order
                                                                                                    ?.type ===
                                                                                                "BUY"
                                                                                                    ? "bg-green-100 text-green-800 border-green-300"
                                                                                                    : item
                                                                                                          .order
                                                                                                          ?.type ===
                                                                                                      "SELL"
                                                                                                    ? "bg-red-100 text-red-800 border-red-300"
                                                                                                    : ""
                                                                                            }
                                                                                        >
                                                                                            {item
                                                                                                .order
                                                                                                ?.type ||
                                                                                                "MISC"}
                                                                                        </Badge>
                                                                                    </TableCell>
                                                                                    <TableCell className="font-medium">
                                                                                        <span
                                                                                            className={
                                                                                                item
                                                                                                    .order
                                                                                                    ?.type ===
                                                                                                "BUY"
                                                                                                    ? "text-green-600"
                                                                                                    : item
                                                                                                          .order
                                                                                                          ?.type ===
                                                                                                      "SELL"
                                                                                                    ? "text-red-600"
                                                                                                    : ""
                                                                                            }
                                                                                        >
                                                                                            {item
                                                                                                .order
                                                                                                ?.type ===
                                                                                            "BUY"
                                                                                                ? "+"
                                                                                                : "-"}
                                                                                            {
                                                                                                item.quantity
                                                                                            }
                                                                                        </span>
                                                                                    </TableCell>
                                                                                    <TableCell className="text-sm">
                                                                                        {formatCurrency(
                                                                                            item.price
                                                                                        )}
                                                                                    </TableCell>
                                                                                    <TableCell className="font-medium text-sm">
                                                                                        {formatCurrency(
                                                                                            totalAmount
                                                                                        )}
                                                                                    </TableCell>
                                                                                    <TableCell>
                                                                                        <Badge
                                                                                            variant="outline"
                                                                                            className="font-mono"
                                                                                        >
                                                                                            {
                                                                                                runningStock
                                                                                            }
                                                                                        </Badge>
                                                                                    </TableCell>
                                                                                    <TableCell>
                                                                                        <Badge
                                                                                            variant={
                                                                                                item
                                                                                                    .order
                                                                                                    ?.paymentStatus ===
                                                                                                "PAID"
                                                                                                    ? "default"
                                                                                                    : item
                                                                                                          .order
                                                                                                          ?.paymentStatus ===
                                                                                                      "PENDING"
                                                                                                    ? "secondary"
                                                                                                    : "destructive"
                                                                                            }
                                                                                        >
                                                                                            {item
                                                                                                .order
                                                                                                ?.paymentStatus ||
                                                                                                "N/A"}
                                                                                        </Badge>
                                                                                    </TableCell>
                                                                                </TableRow>
                                                                            );
                                                                        }
                                                                    )}
                                                                </TableBody>
                                                            </Table>
                                                        </div>
                                                    ) : (
                                                        <div className="text-center py-4 text-muted-foreground">
                                                            <Package className="mx-auto h-8 w-8 mb-2" />
                                                            <p>
                                                                No transactions found for this
                                                                variant
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="text-center py-6">
                                    <Package className="mx-auto h-12 w-12 text-muted-foreground" />
                                    <h3 className="mt-4 text-lg font-medium">No Variants</h3>
                                    <p className="mt-2 text-sm text-muted-foreground">
                                        This product doesn't have any variants.
                                    </p>
                                </div>
                            )}
                        </div>
                    </Card>
                </div>
            </div>

            {/* Edit Product Dialog */}
            <EditProductDialog
                product={product}
                orgId={orgId}
                isOpen={isEditDialogOpen}
                onClose={() => setIsEditDialogOpen(false)}
                onUpdate={handleProductUpdate}
            />

            {/* Edit Variant Dialog */}
            <EditVariantDialog
                variant={editingVariant}
                productId={productId}
                orgId={orgId}
                isOpen={isEditVariantDialogOpen}
                onClose={() => {
                    setIsEditVariantDialogOpen(false);
                    setEditingVariant(null);
                }}
                onUpdate={handleVariantUpdate}
            />

            {/* Add Variant Dialog */}
            <AddVariantDialog
                product={product}
                orgId={orgId}
                isOpen={isAddVariantDialogOpen}
                onClose={() => setIsAddVariantDialogOpen(false)}
                onUpdate={handleVariantAdd}
            />
        </div>
    );
};

export default SingleProductPage;
