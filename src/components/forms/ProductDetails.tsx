"use client";

import React, { useMemo, useCallback } from "react";
import { Minus, Plus, X, Search, ChevronDown } from "lucide-react";
import { Command } from "cmdk";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { OrderItem, Product } from "@/data/types";
// import CreateProductModal from "@/pages/admin/products/Create_product_modal";
import { Link } from "react-router-dom";
import { useOrg } from "@/providers/org-provider";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "../ui/tooltip";

interface SelectedProduct {
    productId: string;
    variantId: string;
    quantity: number;
    rate: number;
}

interface ProductDetailsProps {
    type: "BUY" | "SELL";
    products: Product[];
    addedProducts: SelectedProduct[];
    onUpdateProducts: (products: SelectedProduct[]) => void;
}

export function ProductDetails({
    type,
    products,
    addedProducts,
    onUpdateProducts,
}: ProductDetailsProps) {
    const { orgId } = useOrg();
    const updateProductAtIndex = useCallback(
        (index: number, updates: Partial<SelectedProduct>) => {
            const updated = addedProducts.map((item, i) =>
                i === index ? { ...item, ...updates } : item
            );
            onUpdateProducts(updated);
        },
        [addedProducts, onUpdateProducts]
    );

    const handleAddEmptySlot = () => {
        onUpdateProducts([
            ...addedProducts,
            { productId: "", variantId: "", quantity: 1, rate: 0 },
        ]);
    };

    const handleRemoveProduct = (index: number) => {
        if (addedProducts.length === 1) {
            onUpdateProducts([
                { productId: "", variantId: "", quantity: 1, rate: 0 },
            ]);
        } else {
            onUpdateProducts(addedProducts.filter((_, i) => i !== index));
        }
    };

    const getProductDetails = (id: string) => products.find((p) => p.id === id);
    const getVariantDetails = (id: string) =>
        products.flatMap((p) => p.variants)?.find((v) => v && v.id === id);

    const totalAmount = useMemo(() => {
        return addedProducts.reduce(
            (total, item) => total + item.quantity * item.rate,
            0
        );
    }, [addedProducts]);

    return (
        <Card className="w-full border-0 shadow-none bg-gray-100">
            <CardHeader className="bg-gradient-to-r from-slate-100 to-slate-200 rounded-t-xl">
                <CardTitle className="text-xl font-semibold flex items-center gap-2">
                    Item Details
                </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-12 gap-4 font-medium text-sm text-muted-foreground bg-slate-50 p-3 rounded-md">
                    <div className="col-span-1">#</div>
                    <div className="col-span-2">Product</div>
                    <div className="col-span-3">Variant</div>
                    <div className="col-span-2">Quantity</div>
                    <div className="col-span-2">Rate (Rs)</div>
                    <div className="col-span-1">Amount</div>
                    <div className="col-span-1" />
                </div>

                <ScrollArea className="pr-4">
                    <div className="space-y-3">
                        {addedProducts.map((item, index) => {
                            const product = getProductDetails(item.productId);
                            const amount = item.quantity * item.rate;
                            const variant = getVariantDetails(item.variantId);

                            const buyOrders: OrderItem[] =
                                variant?.items?.filter((item) => {
                                    return item.order?.type === "BUY";
                                }) || [];
                            let availableStock = variant?.stock || 0;
                            const applicableOrders: OrderItem[] =
                                buyOrders
                                    ?.sort((a, b) => {
                                        const aDate = new Date(
                                            a.createdAt || 0
                                        );
                                        const bDate = new Date(
                                            b.createdAt || 0
                                        );
                                        return (
                                            bDate.getTime() - aDate.getTime()
                                        );
                                    })
                                    .map((item) => {
                                        if (availableStock > 0) {
                                            if (
                                                availableStock < item.quantity
                                            ) {
                                                item.quantity -= availableStock;
                                                availableStock = 0;
                                            } else {
                                                availableStock -= item.quantity;
                                            }
                                            return item;
                                        }
                                        return null;
                                    })
                                    .filter((item) => item !== null) || [];

                            let newStock = item.quantity;

                            const selectedOrders = applicableOrders
                                .sort((a, b) => {
                                    const aDate = new Date(a.createdAt || 0);
                                    const bDate = new Date(b.createdAt || 0);
                                    return aDate.getTime() - bDate.getTime();
                                })
                                .filter((order) => {
                                    if (newStock > 0) {
                                        if (newStock < order.quantity) {
                                            order.quantity -= newStock;
                                            newStock = 0;
                                        } else {
                                            newStock -= order.quantity;
                                        }
                                        return true;
                                    }
                                    return false;
                                });

                            return (
                                <div
                                    key={index}
                                    className="grid grid-cols-12 gap-4 items-center bg-white p-3 rounded-lg border"
                                >
                                    <div className="col-span-1 font-medium">
                                        {index + 1}
                                    </div>

                                    {/* Product */}
                                    <div className="col-span-2">
                                        <SelectPopover
                                            items={products.map((p) => ({
                                                id: p.id,
                                                label: p.name,
                                            }))}
                                            selectedId={item.productId || ""}
                                            onSelect={(id) => {
                                                const selectedProduct =
                                                    products.find(
                                                        (p) => p.id === id
                                                    );
                                                const firstVariant =
                                                    selectedProduct
                                                        ?.variants?.[0];
                                                updateProductAtIndex(index, {
                                                    productId: id,
                                                    variantId:
                                                        firstVariant?.id || "",
                                                    rate:
                                                        firstVariant?.estimatedPrice ||
                                                        0,
                                                });
                                            }}
                                            placeholder="Select product"
                                        />
                                    </div>

                                    {/* Variant */}
                                    <div className="col-span-3">
                                        {product ? (
                                            <SelectPopover
                                                items={(
                                                    product.variants ?? []
                                                ).map((v) => ({
                                                    id: v.id,
                                                    label: `${
                                                        v.name
                                                    } - $${v.estimatedPrice.toFixed(
                                                        2
                                                    )}`,
                                                }))}
                                                selectedId={
                                                    item.variantId || ""
                                                }
                                                onSelect={(variantId) => {
                                                    const variant =
                                                        product.variants?.find(
                                                            (v) =>
                                                                v.id ===
                                                                variantId
                                                        );
                                                    if (variant) {
                                                        updateProductAtIndex(
                                                            index,
                                                            {
                                                                variantId:
                                                                    variant.id,
                                                                rate: variant.estimatedPrice,
                                                            }
                                                        );
                                                    }
                                                }}
                                                placeholder="Select variant"
                                            />
                                        ) : (
                                            <span className="text-muted-foreground">
                                                Select product first
                                            </span>
                                        )}
                                    </div>

                                    {/* Quantity */}
                                    <div className="col-span-2 flex items-center justify-center gap-1">
                                        <Button
                                            size="icon"
                                            type="button"
                                            variant="outline"
                                            onClick={() =>
                                                updateProductAtIndex(index, {
                                                    quantity: Math.max(
                                                        1,
                                                        item.quantity - 1
                                                    ),
                                                })
                                            }
                                            disabled={!item.variantId}
                                            className="h-8 w-8"
                                        >
                                            <Minus className="h-3 w-3" />
                                        </Button>
                                        <Input
                                            type="number"
                                            value={item.quantity}
                                            onChange={(e) =>
                                                updateProductAtIndex(index, {
                                                    quantity: parseInt(
                                                        e.target.value
                                                    ),
                                                })
                                            }
                                            onBlur={(e) =>
                                                updateProductAtIndex(index, {
                                                    quantity: Math.max(
                                                        1,
                                                        parseInt(
                                                            e.target.value
                                                        ) || 1
                                                    ),
                                                })
                                            }
                                            className="w-28 h-8 text-center"
                                        />
                                        <Button
                                            size="icon"
                                            type="button"
                                            variant="outline"
                                            onClick={() =>
                                                updateProductAtIndex(index, {
                                                    quantity: item.quantity + 1,
                                                })
                                            }
                                            disabled={!item.variantId}
                                            className="h-8 w-8"
                                        >
                                            <Plus className="h-3 w-3" />
                                        </Button>
                                    </div>

                                    {/* Rate */}
                                    <div className="col-span-2">
                                        <Input
                                            type="number"
                                            value={item.rate}
                                            onChange={(e) =>
                                                updateProductAtIndex(index, {
                                                    rate:
                                                        parseFloat(
                                                            e.target.value
                                                        ) || 0,
                                                })
                                            }
                                            className="text-right h-9"
                                            disabled={!item.variantId}
                                        />
                                    </div>

                                    {/* Amount */}
                                    <div className="col-span-1 text-right font-semibold whitespace-nowrap">
                                        Rs {amount.toFixed(2)}
                                    </div>

                                    {/* Remove */}
                                    <div className="col-span-1 flex gap-4 justify-center">
                                        <Button
                                            size="icon"
                                            type="button"
                                            variant="ghost"
                                            onClick={() =>
                                                handleRemoveProduct(index)
                                            }
                                            className="h-8 w-8 text-slate-500 hover:text-red-500"
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                        {type === "SELL" && (
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger>
                                                        i
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <div className="p-2 space-y-2">
                                                            <h4 className="font-semibold mb-1">
                                                                Your Purchase
                                                            </h4>
                                                            {selectedOrders.length >
                                                            0 ? (
                                                                selectedOrders.map(
                                                                    (
                                                                        orderItem,
                                                                        i
                                                                    ) => (
                                                                        <div
                                                                            key={
                                                                                i
                                                                            }
                                                                            className="text-xs border-b pb-1 last:border-0"
                                                                        >
                                                                            <div className="flex gap-2 justify-between">
                                                                                <span>
                                                                                    Qty:{" "}
                                                                                    {
                                                                                        orderItem.quantity
                                                                                    }
                                                                                </span>
                                                                                <span>
                                                                                    Rate:
                                                                                    ₹
                                                                                    {
                                                                                        orderItem.price
                                                                                    }
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                    )
                                                                )
                                                            ) : (
                                                                <div className="text-sm text-gray-500">
                                                                    No purchase
                                                                    orders found
                                                                </div>
                                                            )}
                                                        </div>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        )}
                                    </div>
                                    {/* a tool tip to show the all the selected order */}
                                </div>
                            );
                        })}
                    </div>
                </ScrollArea>

                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            onClick={handleAddEmptySlot}
                            className="bg-emerald-600 text-white hover:bg-emerald-700"
                            size="sm"
                        >
                            <Plus className="h-4 w-4 mr-2" /> Add New Purchases
                        </Button>
                        {/* <CreateProductModal /> */}
                        <Link
                            to={`/org/${orgId}/products/create`}
                            className="text-sm text-blue-600 hover:underline border border-blue-600 px-2 py-1 rounded hover:bg-blue-50 flex items-center gap-1"
                        >
                            Create New Product
                        </Link>
                    </div>
                    <div className="text-lg font-semibold text-slate-700">
                        Total: Rs {totalAmount.toFixed(2)}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

interface SelectPopoverProps {
    items: { id: string; label: string }[];
    selectedId: string;
    onSelect: (id: string) => void;
    placeholder?: string;
}

const SelectPopover: React.FC<SelectPopoverProps> = ({
    items,
    selectedId,
    onSelect,
    placeholder,
}) => {
    const [open, setOpen] = React.useState(false);
    const [search, setSearch] = React.useState("");
    const selectedItem = items.find((item) => item.id === selectedId);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between truncate"
                >
                    {selectedItem && selectedId
                        ? selectedItem.label
                        : placeholder || "Select..."}
                    <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0">
                <Command>
                    <div className="flex items-center px-3 border-b">
                        <Search className="mr-2 h-4 w-4 opacity-50" />
                        <Input
                            placeholder="Search..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="border-none focus:ring-0"
                        />
                    </div>
                    <Command.List className="max-h-[300px] overflow-y-auto py-1">
                        <Command.Empty className="py-6 text-center text-sm">
                            No results.
                        </Command.Empty>
                        {items
                            .filter((item) =>
                                item.label
                                    .toLowerCase()
                                    .includes(search.toLowerCase())
                            )
                            .map((item) => (
                                <Command.Item
                                    key={item.id}
                                    value={item.id}
                                    onSelect={() => {
                                        onSelect(item.id);
                                        setOpen(false);
                                        setSearch("");
                                    }}
                                    className={`px-4 py-2 cursor-pointer hover:bg-slate-100 ${
                                        item.id === selectedId
                                            ? "bg-slate-200"
                                            : ""
                                    }`}
                                >
                                    {item.label}
                                </Command.Item>
                            ))}
                    </Command.List>
                </Command>
            </PopoverContent>
        </Popover>
    );
};
