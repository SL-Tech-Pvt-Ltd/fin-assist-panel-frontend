"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { X, ShoppingCart, CheckCircle } from "lucide-react";
import type { CreateOrderProps, OrderFormState, OrderCalculations, FormStep } from "./types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useOrg } from "@/providers/org-provider";
import { EntitySelector } from "./entity-selector";
import { ProductDetails } from "./product-details";
import { CalculationSelector } from "./calculation-selector";
import { PaymentSelector } from "./payment-selector";
import { BalanceSummary } from "./balance-summary";
import {
    createInitialFormState,
    convertToPayload,
    calculateSubTotal,
    calculateChargeAmount,
    calculateVendorCharges,
    calculateGrandTotal,
    calculateTotalPaid,
    calculateRemainingAmount,
    validateProductQuantities,
    validateAccountBalances,
} from "./utils";

export default function CreateOrder({
    type,
    entities,
    products,
    accounts,
    addEntity,
    onSubmit,
    defaultEntity = null,
}: CreateOrderProps) {
    const { orgId } = useOrg();
    const { toast } = useToast();

    // State Management
    const [formState, setFormState] = useState<OrderFormState>(() =>
        createInitialFormState(type, orgId, defaultEntity)
    );
    const [currentStep, setCurrentStep] = useState<FormStep>("details");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    // Persist formState to localStorage
    useEffect(() => {
        if (orgId) {
            localStorage.setItem(`CART-${orgId}-${type}`, JSON.stringify(formState));
        }
    }, [formState, orgId, type]);

    // Update entity when defaultEntity changes
    useEffect(() => {
        if (defaultEntity && !formState.entity) {
            setFormState((prev) => ({ ...prev, entity: defaultEntity }));
        }
    }, [defaultEntity]);

    // Auto-set cash counter payment for SELL orders with default entity
    useEffect(() => {
        if (defaultEntity && type === "SELL" && defaultEntity.isDefault) {
            const cashCounterAccount = accounts.find((acc) => acc.type === "CASH_COUNTER");
            if (cashCounterAccount) {
                const grandTotal = calculateGrandTotal(
                    calculateSubTotal(formState.products),
                    formState.discount,
                    formState.tax,
                    formState.charges
                );
                setFormState((prev) => ({
                    ...prev,
                    payments: [
                        {
                            accountId: cashCounterAccount.id,
                            amount: grandTotal,
                            details: {},
                        },
                    ],
                }));
            }
        }
    }, [type, defaultEntity, accounts]);

    // Memoized Calculations
    const calculations = useMemo<OrderCalculations>(() => {
        const subTotal = calculateSubTotal(formState.products);
        const discountAmount = formState.discount;
        const taxAmount = formState.tax;
        const chargeAmount = calculateChargeAmount(subTotal, formState.discount, formState.charges);
        const vendorCharges = calculateVendorCharges(subTotal, formState.charges);
        const grandTotal = calculateGrandTotal(
            subTotal,
            formState.discount,
            formState.tax,
            formState.charges
        );
        const totalPaid = calculateTotalPaid(formState.payments);
        const remainingAmount = calculateRemainingAmount(grandTotal, totalPaid);

        return {
            subTotal,
            discountAmount,
            taxAmount,
            chargeAmount,
            vendorCharges,
            grandTotal,
            totalPaid,
            remainingAmount,
        };
    }, [
        formState.products,
        formState.discount,
        formState.tax,
        formState.charges,
        formState.payments,
    ]);

    // Helper Functions
    const getProductDetails = useCallback(
        (productId: string, variantId: string) => {
            const product = products.find((p) => p.id === productId);
            const variant = product?.variants?.find((v) => v.id === variantId);
            return {
                productName: product?.name || "Unknown Product",
                variantName: variant?.name || "Unknown Variant",
                unit: "Unit",
            };
        },
        [products]
    );

    const resetForm = useCallback(() => {
        const resetState: OrderFormState = {
            entity: null,
            products: [{ productId: "", variantId: "", rate: 0, quantity: 1, description: "" }],
            discount: 0,
            discountType: "fixed",
            discountPercentage: 0,
            tax: 0,
            taxType: "fixed",
            taxPercentage: 0,
            charges: [],
            payments: [],
            description: "",
            isPublic: false,
            orderDate: new Date(),
        };
        setFormState(resetState);
        setError(null);
        setCurrentStep("details");
    }, []);

    // Validation Functions
    const validateOrderDetails = useCallback((): string | null => {
        const validProducts = formState.products.filter(
            (p) => p.productId !== "" && p.variantId !== ""
        );

        if (validProducts.length === 0) {
            return "Please add at least one product.";
        }

        if (type === "SELL") {
            const stockValidation = validateProductQuantities(type, products, formState.products);
            if (!stockValidation.isValid) {
                return `Stock validation failed: ${stockValidation.errors.join(", ")}`;
            }
        }

        return null;
    }, [formState.products, type, products]);

    const validatePaymentDetails = useCallback((): string | null => {
        if (!formState.entity && calculations.remainingAmount > 0) {
            return "Select Entity for unpaid order.";
        }

        if (type === "BUY") {
            const balanceValidation = validateAccountBalances(formState.payments, accounts, type);
            if (!balanceValidation.isValid) {
                return balanceValidation.errors[0];
            }
        }

        return null;
    }, [formState.entity, formState.payments, calculations.remainingAmount, type, accounts]);

    // Event Handlers
    const handleContinueToPayment = useCallback(() => {
        const validationError = validateOrderDetails();
        if (validationError) {
            setError(validationError);
            return;
        }
        setCurrentStep("payment");
        setError(null);
    }, [validateOrderDetails]);

    const handleContinueToSummary = useCallback(() => {
        const validationError = validatePaymentDetails();
        if (validationError) {
            setError(validationError);
            return;
        }
        setCurrentStep("summary");
        setError(null);
    }, [validatePaymentDetails]);

    // Submission Handler
    const handleSubmit = useCallback(
        async (e?: React.FormEvent) => {
            e?.preventDefault();

            if (currentStep !== "summary") {
                return;
            }

            setLoading(true);
            setError(null);

            try {
                const payload = convertToPayload(formState, type, accounts);
                const createdOrder = await onSubmit(payload);

                // Handle vendor charges if needed
                if (createdOrder && calculations.vendorCharges > 0) {
                    // TODO: Handle vendor charges transaction
                }

                resetForm();
                toast({
                    title: "Order created successfully",
                    description: "Your order has been created.",
                });
            } catch (error) {
                console.error("Error creating order:", error);
                setError("Failed to create order. Please try again.");
                toast({
                    title: "Error creating order",
                    description: "There was an error creating your order.",
                    variant: "destructive",
                });
            } finally {
                setLoading(false);
            }
        },
        [
            currentStep,
            formState,
            type,
            accounts,
            onSubmit,
            calculations.vendorCharges,
            resetForm,
            toast,
        ]
    );

    // Render
    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
            <div className="">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                            <ShoppingCart className="w-7 h-7 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">
                                {type === "BUY" ? "Purchase" : "Sales"} Order
                            </h1>
                            <p className="text-gray-500 mt-1">
                                {currentStep === "details"
                                    ? "Add products and order details"
                                    : currentStep === "payment"
                                    ? "Configure payment and finalize"
                                    : "Review and confirm your order"}
                            </p>
                        </div>
                    </div>

                    {/* Step Indicator */}
                    <div className="flex items-center gap-2">
                        <div
                            className={`flex items-center justify-center w-10 h-10 rounded-full font-semibold transition-all ${
                                currentStep === "details"
                                    ? "bg-blue-500 text-white shadow-lg scale-110"
                                    : "bg-gray-300 text-gray-600"
                            }`}
                        >
                            1
                        </div>
                        <div className="w-12 h-1 bg-gray-300 rounded"></div>
                        <div
                            className={`flex items-center justify-center w-10 h-10 rounded-full font-semibold transition-all ${
                                currentStep === "payment"
                                    ? "bg-blue-500 text-white shadow-lg scale-110"
                                    : "bg-gray-300 text-gray-600"
                            }`}
                        >
                            2
                        </div>
                        <div className="w-12 h-1 bg-gray-300 rounded"></div>
                        <div
                            className={`flex items-center justify-center w-10 h-10 rounded-full font-semibold transition-all ${
                                currentStep === "summary"
                                    ? "bg-blue-500 text-white shadow-lg scale-110"
                                    : "bg-gray-300 text-gray-600"
                            }`}
                        >
                            3
                        </div>
                    </div>

                    {/* Public/Private Toggle for SELL */}
                    {type === "SELL" && (
                        <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm">
                            <Switch
                                id="public-switch"
                                checked={formState.isPublic}
                                onCheckedChange={(checked) =>
                                    setFormState((prev) => ({ ...prev, isPublic: checked }))
                                }
                            />
                            <label
                                htmlFor="public-switch"
                                className="text-sm font-medium cursor-pointer"
                            >
                                {formState.isPublic ? "Public Sale" : "Private Sale"}
                            </label>
                        </div>
                    )}
                </div>

                {/* Step 1: Order Details */}
                {currentStep === "details" && (
                    <form
                        className="space-y-6"
                        onSubmit={(e) => {
                            e.preventDefault();
                            handleContinueToPayment();
                        }}
                    >
                        <EntitySelector
                            entities={entities}
                            selectedEntity={formState.entity}
                            onSelectEntity={(entity) =>
                                setFormState((prev) => ({ ...prev, entity }))
                            }
                            onAddEntity={async (entity) => {
                                await addEntity(entity);
                            }}
                            type={type === "BUY" ? "vendor" : "merchant"}
                        />

                        <ProductDetails
                            type={type}
                            isPublic={formState.isPublic}
                            products={products}
                            addedProducts={formState.products}
                            onUpdateProducts={(products) =>
                                setFormState((prev) => ({ ...prev, products }))
                            }
                        />

                        <CalculationSelector
                            subTotal={calculations.subTotal}
                            discount={formState.discount}
                            discountType={formState.discountType}
                            discountPercentage={formState.discountPercentage}
                            tax={formState.tax}
                            taxType={formState.taxType}
                            taxPercentage={formState.taxPercentage}
                            charges={formState.charges}
                            setDiscount={(discount: number) =>
                                setFormState((prev) => ({ ...prev, discount }))
                            }
                            setDiscountType={(discountType: "fixed" | "percentage") =>
                                setFormState((prev) => ({ ...prev, discountType }))
                            }
                            setDiscountPercentage={(discountPercentage: number) =>
                                setFormState((prev) => ({ ...prev, discountPercentage }))
                            }
                            setTax={(tax: number) => setFormState((prev) => ({ ...prev, tax }))}
                            setTaxType={(taxType: "fixed" | "percentage") =>
                                setFormState((prev) => ({ ...prev, taxType }))
                            }
                            setTaxPercentage={(taxPercentage: number) =>
                                setFormState((prev) => ({ ...prev, taxPercentage }))
                            }
                            setCharges={(charges: typeof formState.charges) =>
                                setFormState((prev) => ({ ...prev, charges }))
                            }
                        />

                        {error && (
                            <div className="p-4 border-l-4 border-red-500 bg-red-50 text-red-700 rounded relative">
                                <div className="flex items-start gap-3">
                                    <X className="w-5 h-5 mt-0.5" />
                                    <div>
                                        <p className="font-semibold">Error</p>
                                        <p className="text-sm">{error}</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    className="absolute top-3 right-3 text-red-600 hover:text-red-800"
                                    onClick={() => setError(null)}
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        )}

                        <div className="flex items-center justify-between pt-4">
                            <Button type="button" variant="outline" onClick={resetForm} size="lg">
                                Clear Form
                            </Button>
                            <Button type="submit" size="lg" className="px-8">
                                Continue to Payment →
                            </Button>
                        </div>
                    </form>
                )}

                {/* Step 2: Payment */}
                {currentStep === "payment" && (
                    <form
                        className="space-y-6"
                        onSubmit={(e) => {
                            e.preventDefault();
                            handleContinueToSummary();
                        }}
                    >
                        <PaymentSelector
                            selectedPayments={formState.payments}
                            setSelectedPayments={(payments) =>
                                setFormState((prev) => ({ ...prev, payments }))
                            }
                            accounts={accounts}
                            grandTotal={calculations.grandTotal}
                            type={type}
                        />

                        {type === "BUY" && formState.payments.length > 0 && (
                            <BalanceSummary
                                payments={formState.payments}
                                accounts={accounts}
                                orderType={type}
                            />
                        )}

                        {/* Order Description */}
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700">
                                Order Description
                            </label>
                            <Textarea
                                placeholder="Enter order description, notes, or special instructions..."
                                value={formState.description}
                                onChange={(e) =>
                                    setFormState((prev) => ({
                                        ...prev,
                                        description: e.target.value,
                                    }))
                                }
                                rows={4}
                                className="w-full resize-none"
                            />
                        </div>

                        {/* Order Date */}
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700">
                                Order Date
                            </label>
                            <input
                                type="date"
                                value={formState.orderDate.toISOString().split("T")[0]}
                                onChange={(e) =>
                                    setFormState((prev) => ({
                                        ...prev,
                                        orderDate: new Date(e.target.value),
                                    }))
                                }
                                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        {/* Calculation Summary Card */}
                        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                            <h3 className="font-semibold text-gray-900 mb-4 text-lg">
                                Order Summary
                            </h3>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-600">Subtotal:</span>
                                    <span className="font-medium">
                                        ₹{calculations.subTotal.toFixed(2)}
                                    </span>
                                </div>
                                {formState.discount > 0 && (
                                    <div className="flex justify-between items-center text-sm text-green-600">
                                        <span>Discount:</span>
                                        <span className="font-medium">
                                            -₹{formState.discount.toFixed(2)}
                                        </span>
                                    </div>
                                )}
                                {formState.tax > 0 && (
                                    <div className="flex justify-between items-center text-sm text-blue-600">
                                        <span>Tax/VAT:</span>
                                        <span className="font-medium">
                                            +₹{formState.tax.toFixed(2)}
                                        </span>
                                    </div>
                                )}
                                {calculations.chargeAmount > 0 && (
                                    <div className="flex justify-between items-center text-sm text-orange-600">
                                        <span>Charges:</span>
                                        <span className="font-medium">
                                            +₹{calculations.chargeAmount.toFixed(2)}
                                        </span>
                                    </div>
                                )}
                                {calculations.vendorCharges > 0 && (
                                    <div className="flex justify-between items-center text-sm text-purple-600">
                                        <span>Vendor Charges:</span>
                                        <span className="font-medium">
                                            +₹{calculations.vendorCharges.toFixed(2)}
                                        </span>
                                    </div>
                                )}
                                <div className="flex justify-between items-center font-bold text-lg border-t pt-3">
                                    <span>Grand Total:</span>
                                    <span>₹{calculations.grandTotal.toFixed(2)}</span>
                                </div>
                                {calculations.totalPaid > 0 && (
                                    <>
                                        <div className="flex justify-between items-center text-sm text-blue-600">
                                            <span>Total Paid:</span>
                                            <span className="font-medium">
                                                ₹{calculations.totalPaid.toFixed(2)}
                                            </span>
                                        </div>
                                        {calculations.remainingAmount > 0 && (
                                            <div className="flex justify-between items-center text-sm text-red-600 font-semibold">
                                                <span>Remaining:</span>
                                                <span>
                                                    ₹{calculations.remainingAmount.toFixed(2)}
                                                </span>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>

                        {error && (
                            <div className="p-4 border-l-4 border-red-500 bg-red-50 text-red-700 rounded relative">
                                <div className="flex items-start gap-3">
                                    <X className="w-5 h-5 mt-0.5" />
                                    <div>
                                        <p className="font-semibold">Error</p>
                                        <p className="text-sm">{error}</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    className="absolute top-3 right-3 text-red-600 hover:text-red-800"
                                    onClick={() => setError(null)}
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        )}

                        <div className="flex items-center justify-between pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setCurrentStep("details")}
                                size="lg"
                            >
                                ← Back to Details
                            </Button>
                            <Button type="submit" size="lg" className="px-8">
                                Continue to Summary →
                            </Button>
                        </div>
                    </form>
                )}

                {/* Step 3: Summary */}
                {currentStep === "summary" && (
                    <div className="space-y-6">
                        {/* Bill-like Summary */}
                        <div className="bg-white rounded-xl border border-gray-200 shadow-lg p-8">
                            {/* Header */}
                            <div className="text-center border-b pb-6 mb-6">
                                <div className="flex items-center justify-center gap-3 mb-2">
                                    <CheckCircle className="w-8 h-8 text-green-500" />
                                    <h2 className="text-2xl font-bold text-gray-900">
                                        {type} ORDER SUMMARY
                                    </h2>
                                </div>
                                <p className="text-sm text-gray-500 mt-2">
                                    {formState.orderDate.toLocaleDateString("en-IN", {
                                        year: "numeric",
                                        month: "long",
                                        day: "numeric",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                    })}
                                </p>
                            </div>

                            {/* Entity Details */}
                            <div className="mb-6">
                                <h4 className="font-semibold text-gray-700 mb-3">
                                    {type === "BUY" ? "Vendor Details" : "Customer Details"}
                                </h4>
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <p className="font-medium text-gray-900">
                                        {formState.entity?.name || "N/A"}
                                    </p>
                                    {formState.entity?.phone && (
                                        <p className="text-sm text-gray-600 mt-1">
                                            Phone: {formState.entity.phone}
                                        </p>
                                    )}
                                    {formState.entity?.email && (
                                        <p className="text-sm text-gray-600">
                                            Email: {formState.entity.email}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Order Description */}
                            {formState.description && (
                                <div className="mb-6">
                                    <h4 className="font-semibold text-gray-700 mb-3">
                                        Order Description
                                    </h4>
                                    <div className="bg-gray-50 p-4 rounded-lg">
                                        <p className="text-sm text-gray-700 whitespace-pre-wrap">
                                            {formState.description}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Products Table */}
                            <div className="mb-6">
                                <h4 className="font-semibold text-gray-700 mb-3">Products</h4>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b-2 border-gray-300">
                                                <th className="text-left py-3 font-semibold text-gray-700">
                                                    Item
                                                </th>
                                                <th className="text-right py-3 font-semibold text-gray-700">
                                                    Qty
                                                </th>
                                                <th className="text-right py-3 font-semibold text-gray-700">
                                                    Rate
                                                </th>
                                                <th className="text-right py-3 font-semibold text-gray-700">
                                                    Amount
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {formState.products
                                                .filter(
                                                    (p) => p.productId !== "" && p.variantId !== ""
                                                )
                                                .map((product, index) => {
                                                    const details = getProductDetails(
                                                        product.productId,
                                                        product.variantId
                                                    );
                                                    const amount = product.rate * product.quantity;
                                                    return (
                                                        <tr
                                                            key={index}
                                                            className="border-b border-gray-100"
                                                        >
                                                            <td className="py-3">
                                                                <div>
                                                                    <p className="font-medium">
                                                                        {details.productName}
                                                                    </p>
                                                                    <p className="text-xs text-gray-500">
                                                                        {details.variantName}
                                                                    </p>
                                                                    {product.description && (
                                                                        <p className="text-xs text-gray-600 mt-1 italic">
                                                                            {product.description}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td className="text-right py-3">
                                                                {product.quantity} {details.unit}
                                                            </td>
                                                            <td className="text-right py-3">
                                                                ₹{product.rate.toFixed(2)}
                                                            </td>
                                                            <td className="text-right py-3 font-medium">
                                                                ₹{amount.toFixed(2)}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Calculation Summary */}
                            <div className="border-t pt-6">
                                <div className="space-y-3">
                                    <div className="flex justify-between text-gray-700">
                                        <span>Subtotal:</span>
                                        <span>₹{calculations.subTotal.toFixed(2)}</span>
                                    </div>
                                    {formState.discount > 0 && (
                                        <div className="flex justify-between text-green-600">
                                            <span>Discount:</span>
                                            <span>-₹{formState.discount.toFixed(2)}</span>
                                        </div>
                                    )}
                                    {formState.tax > 0 && (
                                        <div className="flex justify-between text-blue-600">
                                            <span>Tax/VAT:</span>
                                            <span>+₹{formState.tax.toFixed(2)}</span>
                                        </div>
                                    )}
                                    {calculations.chargeAmount > 0 && (
                                        <div className="flex justify-between text-orange-600">
                                            <span>Charges:</span>
                                            <span>+₹{calculations.chargeAmount.toFixed(2)}</span>
                                        </div>
                                    )}
                                    {calculations.vendorCharges > 0 && (
                                        <div className="flex justify-between text-purple-600">
                                            <span>Vendor Charges:</span>
                                            <span>+₹{calculations.vendorCharges.toFixed(2)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between font-bold text-xl border-t pt-3">
                                        <span>Grand Total:</span>
                                        <span>₹{calculations.grandTotal.toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Payment Details */}
                            {formState.payments.length > 0 && (
                                <div className="mt-6 border-t pt-6">
                                    <h4 className="font-semibold text-gray-700 mb-3">
                                        Payment Details
                                    </h4>
                                    <div className="space-y-2">
                                        {formState.payments.map((payment, index) => {
                                            const account = accounts.find(
                                                (acc) => acc.id === payment.accountId
                                            );
                                            return (
                                                <div
                                                    key={index}
                                                    className="flex justify-between bg-gray-50 p-3 rounded-lg"
                                                >
                                                    <span className="text-sm font-medium">
                                                        {account?.name || "Unknown Account"} (
                                                        {account?.type || "Unknown"})
                                                    </span>
                                                    <span className="font-semibold">
                                                        ₹{payment.amount.toFixed(2)}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                        <div className="flex justify-between font-semibold pt-3 border-t">
                                            <span>Total Paid:</span>
                                            <span className="text-blue-600">
                                                ₹{calculations.totalPaid.toFixed(2)}
                                            </span>
                                        </div>
                                        {calculations.remainingAmount > 0 && (
                                            <div className="flex justify-between font-semibold text-red-600">
                                                <span>Remaining Amount:</span>
                                                <span>
                                                    ₹{calculations.remainingAmount.toFixed(2)}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {error && (
                            <div className="p-4 border-l-4 border-red-500 bg-red-50 text-red-700 rounded relative">
                                <div className="flex items-start gap-3">
                                    <X className="w-5 h-5 mt-0.5" />
                                    <div>
                                        <p className="font-semibold">Error</p>
                                        <p className="text-sm">{error}</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    className="absolute top-3 right-3 text-red-600 hover:text-red-800"
                                    onClick={() => setError(null)}
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex items-center justify-between">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setCurrentStep("payment")}
                                size="lg"
                            >
                                ← Back to Payment
                            </Button>
                            <Button
                                onClick={handleSubmit}
                                size="lg"
                                className="px-8 bg-green-600 hover:bg-green-700"
                                disabled={loading}
                            >
                                {loading ? "Processing..." : `Confirm & Create ${type} Order`}
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
