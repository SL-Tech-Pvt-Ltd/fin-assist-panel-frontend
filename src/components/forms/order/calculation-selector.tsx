"use client";

import { useMemo, useEffect, useRef } from "react";
import { Calculator, Plus, X, Tag, Receipt } from "lucide-react";
import type { OrderCharge } from "./types";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface CalculationSelectorProps {
    subTotal: number;
    discount: number;
    discountType: "fixed" | "percentage";
    discountPercentage: number;
    tax: number;
    taxType: "fixed" | "percentage";
    taxPercentage: number;
    charges: OrderCharge[];
    setDiscount: (value: number) => void;
    setDiscountType: (type: "fixed" | "percentage") => void;
    setDiscountPercentage: (value: number) => void;
    setTax: (value: number) => void;
    setTaxType: (type: "fixed" | "percentage") => void;
    setTaxPercentage: (value: number) => void;
    setCharges: (charges: OrderCharge[]) => void;
}

export function CalculationSelector({
    subTotal,
    discount,
    discountType,
    discountPercentage,
    tax,
    taxType,
    taxPercentage,
    charges,
    setDiscount,
    setDiscountType,
    setDiscountPercentage,
    setTax,
    setTaxType,
    setTaxPercentage,
    setCharges,
}: CalculationSelectorProps) {
    const prevSubTotalRef = useRef(subTotal);

    // Sync discount/tax when subtotal changes
    useEffect(() => {
        if (prevSubTotalRef.current !== subTotal && subTotal > 0) {
            if (discountType === "fixed" && discount > 0) {
                setDiscountPercentage((discount / subTotal) * 100);
            } else if (discountType === "percentage" && discountPercentage > 0) {
                setDiscount((subTotal * discountPercentage) / 100);
            }

            if (taxType === "fixed" && tax > 0) {
                setTaxPercentage((tax / subTotal) * 100);
            } else if (taxType === "percentage" && taxPercentage > 0) {
                setTax((subTotal * taxPercentage) / 100);
            }

            // Update charges
            if (charges.length > 0) {
                const updatedCharges = charges.map((charge) => {
                    if (charge.type === "percentage" && charge.percentage > 0) {
                        return { ...charge, amount: (subTotal * charge.percentage) / 100 };
                    } else if (charge.type === "fixed" && charge.amount > 0) {
                        return { ...charge, percentage: (charge.amount / subTotal) * 100 };
                    }
                    return charge;
                });
                setCharges(updatedCharges);
            }

            prevSubTotalRef.current = subTotal;
        }
    }, [
        subTotal,
        discount,
        discountType,
        discountPercentage,
        tax,
        taxType,
        taxPercentage,
        charges,
    ]);

    const grandTotal = useMemo(() => {
        const chargesTotal = charges
            .filter((charge) => !charge.isPaidByBusiness)
            .reduce((sum, c) => sum + c.amount, 0);
        return Math.max(subTotal - discount + tax + chargesTotal, 0);
    }, [subTotal, discount, tax, charges]);

    const handleAddCharge = () => {
        const newCharge: OrderCharge = {
            id: `charge-${Date.now()}`,
            name: "",
            amount: 0,
            type: "fixed",
            percentage: 0,
            isPaidByBusiness: false,
        };
        setCharges([...charges, newCharge]);
    };

    const handleChargeChange = (id: string, updatedFields: Partial<OrderCharge>) => {
        const updatedCharges = charges.map((charge) =>
            charge.id === id ? { ...charge, ...updatedFields } : charge
        );
        setCharges(updatedCharges);
    };

    const handleRemoveCharge = (id: string) => {
        const updatedCharges = charges.filter((charge) => charge.id !== id);
        setCharges(updatedCharges);
    };

    return (
        <div className="space-y-8">
            <div className="flex flex-col lg:flex-row gap-8">
                {/* Discount */}
                <Card className="flex-1 border border-gray-200 shadow-sm">
                    <CardContent className="p-6 space-y-4">
                        <div className="flex items-center gap-2 mb-2 border-b pb-2">
                            <Tag className="h-5 w-5 text-red-500" />
                            <Label className="text-lg font-bold">Discount</Label>
                        </div>
                        <div className="flex gap-3 mb-2">
                            <Button
                                type="button"
                                variant={discountType === "fixed" ? "default" : "outline"}
                                size="sm"
                                className="h-10 flex-1 text-base px-4"
                                onClick={() => {
                                    setDiscountType("fixed");
                                    if (subTotal > 0)
                                        setDiscountPercentage((discount / subTotal) * 100);
                                }}
                            >
                                Fixed (Rs)
                            </Button>
                            <Button
                                type="button"
                                variant={discountType === "percentage" ? "default" : "outline"}
                                size="sm"
                                className="h-10 flex-1 text-base px-4"
                                onClick={() => {
                                    setDiscountType("percentage");
                                    setDiscount((subTotal * discountPercentage) / 100);
                                }}
                            >
                                Percentage (%)
                            </Button>
                        </div>
                        <div className="flex items-center gap-3">
                            <Input
                                type="number"
                                min={0}
                                className="h-12 text-lg flex-1 border-gray-300"
                                value={discountType === "fixed" ? discount : discountPercentage}
                                onChange={(e) => {
                                    const val = parseFloat(e.target.value) || 0;
                                    if (discountType === "fixed") {
                                        setDiscount(val);
                                        if (subTotal > 0)
                                            setDiscountPercentage((val / subTotal) * 100);
                                    } else {
                                        setDiscountPercentage(val);
                                        setDiscount((subTotal * val) / 100);
                                    }
                                }}
                                placeholder={discountType === "fixed" ? "Amount" : "%"}
                            />
                            <span className="text-lg text-gray-500">Rs {discount.toFixed(2)}</span>
                        </div>
                    </CardContent>
                </Card>

                {/* Tax - Professional dropdown only */}
                <Card className="flex-1 border border-gray-200 shadow-sm">
                    <CardContent className="p-6 space-y-4">
                        <div className="flex items-center gap-2 mb-2 border-b pb-2">
                            <Receipt className="h-5 w-5 text-blue-500" />
                            <Label className="text-lg font-bold">Tax / VAT</Label>
                        </div>
                        <div className="flex gap-3 mb-2">
                            <select
                                className="h-12 px-4 text-lg border rounded w-full border-gray-300"
                                value={taxPercentage === 13 ? "13" : "0"}
                                onChange={(e) => {
                                    const val = e.target.value === "13" ? 13 : 0;
                                    setTaxType("percentage");
                                    setTaxPercentage(val);
                                    setTax((subTotal * val) / 100);
                                }}
                            >
                                <option value="13">13% VAT</option>
                                <option value="0">No Tax (0%)</option>
                            </select>
                        </div>
                        <div className="flex items-center gap-3">
                            <Input
                                type="number"
                                className="h-12 text-lg flex-1 bg-gray-100 border-gray-200"
                                value={tax.toFixed(2)}
                                readOnly
                                tabIndex={-1}
                            />
                            <span className="text-lg text-gray-500">Rs {tax.toFixed(2)}</span>
                        </div>
                    </CardContent>
                </Card>

                {/* Charges */}
                <Card className="flex-1 border border-gray-200 shadow-sm">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-2 border-b pb-2">
                            <div className="flex items-center gap-2">
                                <Calculator className="h-5 w-5 text-purple-500" />
                                <Label className="text-lg font-bold">Other Charges</Label>
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-10 px-4 text-base"
                                onClick={handleAddCharge}
                            >
                                <Plus className="h-4 w-4 mr-1" />
                                Add
                            </Button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-base">
                                <thead>
                                    <tr className="bg-gray-50">
                                        <th className="py-2 px-2 text-left font-semibold">Label</th>
                                        <th className="py-2 px-2 text-center font-semibold">
                                            Type
                                        </th>
                                        <th className="py-2 px-2 text-center font-semibold">
                                            Amount/%
                                        </th>
                                        <th className="py-2 px-2 text-center font-semibold">
                                            Paid By
                                        </th>
                                        <th className="py-2 px-2 text-center font-semibold"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {charges.length === 0 ? (
                                        <tr>
                                            <td
                                                colSpan={5}
                                                className="text-center py-4 text-gray-400"
                                            >
                                                No charges added
                                            </td>
                                        </tr>
                                    ) : (
                                        charges.map((charge) => (
                                            <tr key={charge.id} className="border-b">
                                                <td className="py-2 px-2">
                                                    <Input
                                                        placeholder="Label"
                                                        className="h-10 text-base w-full border-gray-300"
                                                        value={charge.name}
                                                        onChange={(e) =>
                                                            handleChargeChange(charge.id, {
                                                                name: e.target.value,
                                                            })
                                                        }
                                                    />
                                                </td>
                                                <td className="py-2 px-2 text-center">
                                                    <select
                                                        className="h-10 px-2 text-base border rounded border-gray-300"
                                                        value={charge.type}
                                                        onChange={(e) =>
                                                            handleChargeChange(charge.id, {
                                                                type: e.target.value as
                                                                    | "fixed"
                                                                    | "percentage",
                                                            })
                                                        }
                                                    >
                                                        <option value="fixed">Rs</option>
                                                        <option value="percentage">%</option>
                                                    </select>
                                                </td>
                                                <td className="py-2 px-2 text-center">
                                                    <Input
                                                        type="number"
                                                        className="h-10 text-base w-24 border-gray-300"
                                                        value={
                                                            charge.type === "fixed"
                                                                ? charge.amount
                                                                : charge.percentage
                                                        }
                                                        onChange={(e) => {
                                                            const val =
                                                                parseFloat(e.target.value) || 0;
                                                            if (charge.type === "fixed") {
                                                                handleChargeChange(charge.id, {
                                                                    amount: val,
                                                                });
                                                            } else {
                                                                handleChargeChange(charge.id, {
                                                                    percentage: val,
                                                                });
                                                            }
                                                        }}
                                                    />
                                                </td>
                                                <td className="py-2 px-2 text-center">
                                                    <select
                                                        className="h-10 px-2 text-base border rounded border-gray-300"
                                                        value={charge.isPaidByBusiness ? "B" : "E"}
                                                        onChange={(e) =>
                                                            handleChargeChange(charge.id, {
                                                                isPaidByBusiness:
                                                                    e.target.value === "B",
                                                            })
                                                        }
                                                    >
                                                        <option value="E">Entity</option>
                                                        <option value="B">Business</option>
                                                    </select>
                                                </td>
                                                <td className="py-2 px-2 text-center">
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-10 w-10 p-0 text-red-500 hover:bg-red-50"
                                                        onClick={() =>
                                                            handleRemoveCharge(charge.id)
                                                        }
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Summary Bar */}
            <Card className="border-2 border-blue-300 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-lg">
                <CardContent className="p-8">
                    <div className="grid grid-cols-5 gap-8 text-xl">
                        <div className="text-center">
                            <div className="text-gray-600 text-base mb-1">Subtotal</div>
                            <div className="font-semibold text-2xl">Rs {subTotal.toFixed(2)}</div>
                        </div>
                        <div className="text-center">
                            <div className="text-red-600 text-base mb-1">Discount</div>
                            <div className="font-semibold text-red-600 text-2xl">
                                -{discount.toFixed(2)}
                            </div>
                        </div>
                        <div className="text-center">
                            <div className="text-blue-600 text-base mb-1">Tax (VAT)</div>
                            <div className="font-semibold text-blue-600 text-2xl">
                                +{tax.toFixed(2)}
                            </div>
                        </div>
                        <div className="text-center">
                            <div className="text-purple-600 text-base mb-1">Charges</div>
                            <div className="font-semibold text-purple-600 text-2xl">
                                +
                                {charges
                                    .filter((c) => !c.isPaidByBusiness)
                                    .reduce((sum, c) => sum + c.amount, 0)
                                    .toFixed(2)}
                            </div>
                        </div>
                        <div className="text-center border-l-2 border-gray-400">
                            <div className="text-gray-900 text-base mb-1 font-bold">
                                Grand Total
                            </div>
                            <div className="font-bold text-3xl text-gray-900">
                                Rs {grandTotal.toFixed(2)}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
