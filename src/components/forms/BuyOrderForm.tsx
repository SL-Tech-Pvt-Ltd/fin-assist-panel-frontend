"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Entity, Product, Account, Order } from "@/data/types";
import { ProductDetails, validateProductQuantities } from "./ProductDetails";
import { useToast } from "@/hooks/use-toast";
import EntitySelector from "../modules/entity-selector";
import PaymentSelector from "../modules/payment-selector";
import CalculationSelector from "../modules/calculation-selector";
import { X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader } from "../ui/dialog";
import { api } from "@/utils/api";
import { useOrg } from "@/providers/org-provider";
import { Switch } from "../ui/switch";
import { validateAccountBalances } from "@/utils/validation";
import { BalanceSummary } from "../modules/balance-summary";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Final payload structure for order creation API
 */
interface CreateOrderPayload {
    type: "BUY" | "SELL";
    description?: string;
    entityId?: string;
    products: Array<{
        variantId: string;
        quantity: number;
        rate: number;
        description?: string;
    }>;
    payments: Array<{
        accountId: string;
        amount: number;
        date?: string;
        details?: Record<string, any>;
    }>;
    discount?: number;
    tax?: number;
    charges?: Array<{
        name: string;
        amount: number;
        isPaidByBusiness?: boolean;
    }>;
    orderDate?: string;
    posRegisterId?: string;
}

/**
 * Local state product with additional UI metadata
 */
interface LocalOrderProduct {
    productId: string; // For UI selection
    variantId: string;
    rate: number;
    quantity: number;
    description: string;
}

/**
 * Local state charge with additional UI metadata
 */
interface LocalOrderCharge {
    id: string; // For React keys
    name: string;
    amount: number;
    type: "fixed" | "percentage";
    percentage: number;
    isPaidByBusiness: boolean; // true = business pays (not beared by entity)
    isVat?: boolean;
}

/**
 * Local state payment with additional UI metadata
 */
interface LocalOrderPayment {
    accountId: string;
    amount: number;
    details: Record<string, any>;
}

/**
 * Organized local form state structure
 */
interface OrderFormState {
    // Step 1: Order Details
    entity: Entity | null;
    products: LocalOrderProduct[];
    discount: number;
    charges: LocalOrderCharge[];
    description: string;
    orderDate: Date;

    // Step 2: Payment Details
    payments: LocalOrderPayment[];

    // Additional metadata
    tax: number;
    isPublic: boolean;
}

/**
 * UI workflow step
 */
type FormStep = "details" | "payment" | "summary";

/**
 * Calculation results for memoization
 */
interface OrderCalculations {
    subTotal: number;
    chargeAmount: number; // Charges paid by entity
    vendorCharges: number; // Charges paid by business
    grandTotal: number;
    totalPaid: number;
    remainingAmount: number;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Calculate subtotal from products
 */
const calculateSubTotal = (products: LocalOrderProduct[]): number => {
    return products.reduce((sum, product) => {
        const amount = product.rate * product.quantity;
        return sum + (isNaN(amount) ? 0 : amount);
    }, 0);
};

/**
 * Calculate charges paid by entity
 */
const calculateChargeAmount = (
    subTotal: number,
    discount: number,
    charges: LocalOrderCharge[]
): number => {
    const baseAmount = subTotal - discount;
    return charges
        .filter((charge) => !charge.isPaidByBusiness)
        .reduce((sum, charge) => {
            const chargeAmount =
                charge.type === "percentage"
                    ? (baseAmount * charge.percentage) / 100
                    : charge.amount;
            return sum + (isNaN(chargeAmount) ? 0 : chargeAmount);
        }, 0);
};

/**
 * Calculate charges paid by business (vendor charges)
 */
const calculateVendorCharges = (subTotal: number, charges: LocalOrderCharge[]): number => {
    return charges
        .filter((charge) => charge.isPaidByBusiness)
        .reduce((sum, charge) => {
            const chargeAmount =
                charge.type === "percentage" ? (subTotal * charge.percentage) / 100 : charge.amount;
            return sum + (isNaN(chargeAmount) ? 0 : chargeAmount);
        }, 0);
};

/**
 * Calculate grand total
 */
const calculateGrandTotal = (
    subTotal: number,
    discount: number,
    charges: LocalOrderCharge[]
): number => {
    const chargeAmount = calculateChargeAmount(subTotal, discount, charges);
    const total = subTotal - discount + chargeAmount;
    return Math.max(total, 0);
};

/**
 * Calculate total paid amount
 */
const calculateTotalPaid = (payments: LocalOrderPayment[]): number => {
    return payments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
};

/**
 * Calculate remaining amount to be paid
 */
const calculateRemainingAmount = (grandTotal: number, totalPaid: number): number => {
    return Math.max(grandTotal - totalPaid, 0);
};

/**
 * Create initial form state with localStorage persistence
 */
const createInitialFormState = (
    type: string,
    orgId: string,
    defaultEntity: Entity | null
): OrderFormState => {
    const savedState = localStorage.getItem(`CART-${orgId}-${type}`);

    if (savedState) {
        try {
            const parsed = JSON.parse(savedState);
            return {
                entity: defaultEntity || parsed.entity || null,
                products: parsed.products || [
                    { productId: "", variantId: "", rate: 0, quantity: 1, description: "" },
                ],
                description: parsed.description || "",
                discount: parsed.discount || 0,
                charges: parsed.charges || [],
                payments: parsed.payments || [],
                tax: parsed.tax || 0,
                isPublic: parsed.isPublic || false,
                orderDate: parsed.orderDate ? new Date(parsed.orderDate) : new Date(),
            };
        } catch (error) {
            console.error("Failed to parse saved state:", error);
        }
    }

    return {
        entity: defaultEntity,
        description: "",
        products: [{ productId: "", variantId: "", rate: 0, quantity: 1, description: "" }],
        discount: 0,
        charges: [],
        payments: [],
        tax: 0,
        isPublic: false,
        orderDate: new Date(),
    };
};

/**
 * Convert local state to API payload
 */
const convertToPayload = (
    formState: OrderFormState,
    type: "BUY" | "SELL",
    accounts: Account[]
): CreateOrderPayload => {
    // Filter valid products
    const validProducts = formState.products.filter(
        (p) => p.productId !== "" && p.variantId !== ""
    );

    // Determine final payments
    const finalPayments =
        formState.entity?.isDefault &&
        type === "SELL" &&
        accounts.find((acc) => acc.type === "CASH_COUNTER")
            ? [
                  {
                      accountId: accounts.find((acc) => acc.type === "CASH_COUNTER")?.id || "",
                      amount: calculateGrandTotal(
                          calculateSubTotal(validProducts),
                          formState.discount,
                          formState.charges
                      ),
                      details: {},
                  },
              ]
            : formState.payments;

    // Convert charges - only include those paid by entity
    const entityCharges = formState.charges
        .filter((charge) => !charge.isPaidByBusiness && charge.amount > 0)
        .map((charge) => ({
            name: charge.name,
            amount: charge.amount,
            isPaidByBusiness: false,
        }));

    return {
        type,
        entityId: formState.entity?.id,
        description: formState.description || undefined,
        products: validProducts.map((p) => ({
            variantId: p.variantId,
            quantity: p.quantity,
            rate: p.rate,
            description: p.description || undefined,
        })),
        payments: finalPayments.map((p) => ({
            accountId: p.accountId,
            amount: p.amount,
            details: p.details,
        })),
        discount: formState.discount || undefined,
        tax: formState.tax || undefined,
        charges: entityCharges.length > 0 ? entityCharges : undefined,
        orderDate: formState.orderDate.toISOString(),
    };
};

/**
 * Adapter: Convert legacy charge format to local format
 */
const convertLegacyChargesToLocal = (
    legacyCharges: Array<{
        id: string;
        amount: number;
        label: string;
        type: "fixed" | "percentage";
        percentage: number;
        isVat?: boolean;
        bearedByEntity: boolean;
    }>
): LocalOrderCharge[] => {
    return legacyCharges.map((charge) => ({
        id: charge.id,
        name: charge.label,
        amount: charge.amount,
        type: charge.type,
        percentage: charge.percentage,
        isPaidByBusiness: !charge.bearedByEntity, // Inverted logic
        isVat: charge.isVat,
    }));
};

/**
 * Adapter: Convert local charge format to legacy format
 */
const convertLocalChargesToLegacy = (
    localCharges: LocalOrderCharge[]
): Array<{
    id: string;
    amount: number;
    label: string;
    type: "fixed" | "percentage";
    percentage: number;
    isVat?: boolean;
    bearedByEntity: boolean;
}> => {
    return localCharges.map((charge) => ({
        id: charge.id,
        label: charge.name,
        amount: charge.amount,
        type: charge.type,
        percentage: charge.percentage,
        isVat: charge.isVat,
        bearedByEntity: !charge.isPaidByBusiness, // Inverted logic
    }));
};

// ============================================================================
// COMPONENT PROPS
// ============================================================================

interface BuyProductFormProps {
    type: "BUY" | "SELL";
    entities: Entity[];
    products: Product[];
    accounts: Account[];
    addEntity: (entity: Partial<Entity>) => Promise<Entity | null>;
    onSubmit: (data: CreateOrderPayload) => Promise<Order> | void;
    defaultEntity?: Entity | null;
}

// ============================================================================
// ACCOUNT SELECTION DIALOG COMPONENT
// ============================================================================

const AccountSelectionDialog = ({
    accounts,
    onSelect,
    onClose,
    vendorCharges,
}: {
    accounts: Account[];
    onSelect: (account: Account) => void;
    onClose: () => void;
    vendorCharges: number;
}) => {
    return (
        <Dialog open={true} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <h2 className="text-xl font-semibold">Select an Account</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        Choose an account to process vendor charges of Rs {vendorCharges.toFixed(2)}
                    </p>
                </DialogHeader>
                <div className="mt-4 max-h-[300px] overflow-y-auto">
                    <ul className="space-y-2">
                        {accounts.map((account) => {
                            const hasInsufficientBalance = account.balance < vendorCharges;
                            return (
                                <li
                                    key={account.id}
                                    onClick={() => !hasInsufficientBalance && onSelect(account)}
                                    className={`flex items-center p-3 rounded-md border transition-colors ${
                                        hasInsufficientBalance
                                            ? "border-red-200 bg-red-50 hover:bg-red-100 cursor-not-allowed"
                                            : "border-gray-200 hover:bg-gray-50 cursor-pointer"
                                    }`}
                                >
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-medium">{account.name}</h3>
                                            {hasInsufficientBalance && (
                                                <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">
                                                    Insufficient
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm text-muted-foreground">
                                                {account.type}
                                            </p>
                                            <p
                                                className={`text-sm ${
                                                    hasInsufficientBalance
                                                        ? "text-red-600"
                                                        : "text-green-600"
                                                }`}
                                            >
                                                Balance: Rs {account.balance.toFixed(2)}
                                            </p>
                                        </div>
                                    </div>
                                    <Button
                                        variant={hasInsufficientBalance ? "destructive" : "ghost"}
                                        size="sm"
                                        className="ml-2"
                                        disabled={hasInsufficientBalance}
                                    >
                                        {hasInsufficientBalance ? "Cannot Select" : "Select"}
                                    </Button>
                                </li>
                            );
                        })}
                    </ul>
                </div>
                <div className="mt-4 flex justify-end">
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function BuyProductForm({
    type,
    entities,
    products,
    accounts,
    addEntity,
    onSubmit,
    defaultEntity = null,
}: BuyProductFormProps) {
    // ========================================================================
    // HOOKS & CONTEXT
    // ========================================================================
    const { orgId } = useOrg();
    const { toast } = useToast();

    // ========================================================================
    // STATE MANAGEMENT
    // ========================================================================

    // Main form state with localStorage persistence
    const [formState, setFormState] = useState<OrderFormState>(() =>
        createInitialFormState(type, orgId, defaultEntity)
    );

    // UI state
    const [currentStep, setCurrentStep] = useState<FormStep>("details");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    // Vendor charges handling (for BUY orders)
    const [isAccountSelectionActive, setIsAccountSelectionActive] = useState(false);
    const [selectedVendorAccount, setSelectedVendorAccount] = useState<Account | null>(null);

    // ========================================================================
    // EFFECTS
    // ========================================================================

    // Persist formState to localStorage
    useEffect(() => {
        if (orgId) {
            localStorage.setItem(`CART-${orgId}-${type}`, JSON.stringify(formState));
        }
    }, [formState, orgId, type]);

    // Update entity when defaultEntity changes (only if no entity selected)
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

    // ========================================================================
    // MEMOIZED CALCULATIONS
    // ========================================================================

    const calculations = useMemo<OrderCalculations>(() => {
        const subTotal = calculateSubTotal(formState.products);
        const chargeAmount = calculateChargeAmount(subTotal, formState.discount, formState.charges);
        const vendorCharges = calculateVendorCharges(subTotal, formState.charges);
        const grandTotal = calculateGrandTotal(subTotal, formState.discount, formState.charges);
        const totalPaid = calculateTotalPaid(formState.payments);
        const remainingAmount = calculateRemainingAmount(grandTotal, totalPaid);

        return {
            subTotal,
            chargeAmount,
            vendorCharges,
            grandTotal,
            totalPaid,
            remainingAmount,
        };
    }, [formState.products, formState.discount, formState.charges, formState.payments]);

    // ========================================================================
    // HELPER FUNCTIONS
    // ========================================================================

    /**
     * Get product and variant details for display
     */
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

    /**
     * Reset form to initial state
     */
    const resetForm = useCallback(() => {
        const resetState: OrderFormState = {
            entity: null,
            products: [{ productId: "", variantId: "", rate: 0, quantity: 1, description: "" }],
            discount: 0,
            charges: [],
            payments: [],
            description: "",
            tax: 0,
            isPublic: false,
            orderDate: new Date(),
        };
        setFormState(resetState);
        setError(null);
        setCurrentStep("details");
        setSelectedVendorAccount(null);
    }, []);

    // ========================================================================
    // VALIDATION FUNCTIONS
    // ========================================================================

    /**
     * Validate order details step
     */
    const validateOrderDetails = useCallback((): string | null => {
        const validProducts = formState.products.filter(
            (p) => p.productId !== "" && p.variantId !== ""
        );

        if (validProducts.length === 0) {
            return "Please add at least one product.";
        }

        // Stock validation for sell orders
        if (type === "SELL") {
            const stockValidation = validateProductQuantities(type, products, formState.products);
            if (!stockValidation.isValid) {
                return `Stock validation failed: ${stockValidation.errors.join(", ")}`;
            }
        }

        return null;
    }, [formState.products, type, products]);

    /**
     * Validate payment details step
     */
    const validatePaymentDetails = useCallback((): string | null => {
        // Require entity for unpaid orders
        if (!formState.entity && calculations.remainingAmount > 0) {
            return "Select Entity for unpaid order.";
        }

        // Validate account balances for BUY orders
        if (type === "BUY") {
            const balanceValidation = validateAccountBalances(formState.payments, accounts, type);
            if (!balanceValidation.isValid) {
                return balanceValidation.errors[0];
            }
        }

        return null;
    }, [formState.entity, formState.payments, calculations.remainingAmount, type, accounts]);

    /**
     * Validate final submission
     */
    const validateSubmission = useCallback((): string | null => {
        // Validate vendor charges account for BUY orders
        if (type === "BUY" && calculations.vendorCharges > 0) {
            if (!selectedVendorAccount) {
                return "Please select an account for vendor charges.";
            }
            if (selectedVendorAccount.balance < calculations.vendorCharges) {
                return (
                    `Insufficient balance in ${selectedVendorAccount.name} for vendor charges. ` +
                    `Available: Rs ${selectedVendorAccount.balance.toFixed(2)}, ` +
                    `Required: Rs ${calculations.vendorCharges.toFixed(2)}`
                );
            }
        }

        return null;
    }, [type, calculations.vendorCharges, selectedVendorAccount]);

    // ========================================================================
    // EVENT HANDLERS
    // ========================================================================

    const handleEntitySelect = useCallback((entity: Entity | null) => {
        setFormState((prev) => ({ ...prev, entity }));
        setError(null);
    }, []);

    const handleProductsUpdate = useCallback((products: LocalOrderProduct[]) => {
        setFormState((prev) => ({ ...prev, products }));
        setError(null);
    }, []);

    const handleDiscountUpdate = useCallback((discount: number) => {
        setFormState((prev) => ({ ...prev, discount: isNaN(discount) ? 0 : discount }));
        setError(null);
    }, []);

    const handleChargesUpdate = useCallback((charges: LocalOrderCharge[]) => {
        setFormState((prev) => ({ ...prev, charges }));
        setError(null);
    }, []);

    /**
     * Adapter handler for legacy charge format from CalculationSelector
     */
    const handleLegacyChargesUpdate = useCallback(
        (
            legacyCharges: Array<{
                id: string;
                amount: number;
                label: string;
                type: "fixed" | "percentage";
                percentage: number;
                isVat?: boolean;
                bearedByEntity: boolean;
            }>
        ) => {
            const localCharges = convertLegacyChargesToLocal(legacyCharges);
            handleChargesUpdate(localCharges);
        },
        [handleChargesUpdate]
    );

    const handlePaymentsUpdate = useCallback((payments: LocalOrderPayment[]) => {
        setFormState((prev) => ({ ...prev, payments }));
        setError(null);
    }, []);

    const handleDescriptionUpdate = useCallback((description: string) => {
        setFormState((prev) => ({ ...prev, description }));
    }, []);

    const handleOrderDateUpdate = useCallback((date: Date) => {
        setFormState((prev) => ({ ...prev, orderDate: date }));
    }, []);

    const handleIsPublicToggle = useCallback((isPublic: boolean) => {
        setFormState((prev) => ({ ...prev, isPublic }));
    }, []);

    const handleAddEntity = useCallback(
        async (entity: Partial<Entity>) => {
            try {
                const newEntity = await addEntity(entity);
                if (newEntity) {
                    setFormState((prev) => ({ ...prev, entity: newEntity }));
                    toast({
                        title: "Entity added successfully",
                        description: "The entity has been added and selected.",
                    });
                }
            } catch (error) {
                console.error("Error adding entity:", error);
                toast({
                    title: "Error adding entity",
                    description: "There was an error adding the entity.",
                    variant: "destructive",
                });
            }
        },
        [addEntity, toast]
    );

    // ========================================================================
    // STEP NAVIGATION HANDLERS
    // ========================================================================

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

    const handleBackToDetails = useCallback(() => {
        setCurrentStep("details");
        setError(null);
    }, []);

    const handleBackToPayment = useCallback(() => {
        setCurrentStep("payment");
        setError(null);
    }, []);

    // ========================================================================
    // SUBMISSION HANDLER
    // ========================================================================

    const handleSubmit = useCallback(
        async (e?: React.FormEvent) => {
            e?.preventDefault();

            // If not on summary step, navigate forward
            if (currentStep !== "summary") {
                return;
            }

            // Check if vendor charges account selection is needed
            if (type === "BUY" && calculations.vendorCharges > 0 && !selectedVendorAccount) {
                setIsAccountSelectionActive(true);
                return;
            }

            // Final validation
            const validationError = validateSubmission();
            if (validationError) {
                setError(validationError);
                return;
            }

            setLoading(true);
            setError(null);

            try {
                // Convert form state to API payload
                const payload = convertToPayload(formState, type, accounts);

                // Submit order
                const createdOrder = await onSubmit(payload);

                // Create vendor charges transaction if needed
                if (createdOrder && selectedVendorAccount && calculations.vendorCharges > 0) {
                    await api.post(
                        `/orgs/${orgId}/accounts/${selectedVendorAccount.id}/transactions`,
                        {
                            amount: calculations.vendorCharges,
                            type: "BUY",
                            description: `Vendor Charges-NBC from order - ${createdOrder.id}`,
                            orderId: createdOrder.id,
                        }
                    );
                }

                // Success - reset form
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
            type,
            calculations.vendorCharges,
            selectedVendorAccount,
            validateSubmission,
            formState,
            accounts,
            onSubmit,
            orgId,
            resetForm,
            toast,
        ]
    );

    const handleVendorAccountSelect = useCallback(
        (account: Account) => {
            setSelectedVendorAccount(account);
            setIsAccountSelectionActive(false);
            // Trigger submission after account selection
            handleSubmit({ preventDefault: () => {} } as React.FormEvent);
        },
        [handleSubmit]
    );

    // ========================================================================
    // RENDER
    // ========================================================================

    return (
        <div className="p-6 bg-white">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-4">
                    <h2 className="text-2xl font-semibold">{type} Product</h2>

                    {/* Step Indicator */}
                    <div className="flex items-center space-x-2">
                        <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                                currentStep === "details"
                                    ? "bg-blue-500 text-white"
                                    : "bg-gray-300 text-gray-600"
                            }`}
                        >
                            1
                        </div>
                        <div className="w-8 h-1 bg-gray-300"></div>
                        <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                                currentStep === "payment"
                                    ? "bg-blue-500 text-white"
                                    : "bg-gray-300 text-gray-600"
                            }`}
                        >
                            2
                        </div>
                        <div className="w-8 h-1 bg-gray-300"></div>
                        <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                                currentStep === "summary"
                                    ? "bg-blue-500 text-white"
                                    : "bg-gray-300 text-gray-600"
                            }`}
                        >
                            3
                        </div>
                    </div>
                </div>

                {/* Public/Private Toggle for SELL orders */}
                {type === "SELL" && (
                    <div className="flex items-center space-x-2">
                        <Switch
                            id="public-switch"
                            checked={formState.isPublic}
                            onCheckedChange={handleIsPublicToggle}
                        />
                        <label htmlFor="public-switch" className="text-sm">
                            {formState.isPublic ? "Public Sale" : "Private Sale"}
                        </label>
                    </div>
                )}
            </div>

            {/* Step Description */}
            <p className="text-muted-foreground mb-8">
                {currentStep === "details"
                    ? `Add product to ${type.toLowerCase()} and select ${
                          type === "BUY" ? "vendor" : "customer"
                      }.`
                    : currentStep === "payment"
                    ? `Complete payment details for your ${type.toLowerCase()} order.`
                    : `Review and confirm your ${type.toLowerCase()} order details.`}
            </p>

            {/* Step 1: Order Details */}
            {currentStep === "details" && (
                <form
                    className="space-y-4"
                    onSubmit={(e) => {
                        e.preventDefault();
                        handleContinueToPayment();
                    }}
                >
                    <EntitySelector
                        entities={entities}
                        onAddEntity={handleAddEntity}
                        selectedEntity={formState.entity}
                        onSelectEntity={handleEntitySelect}
                        type={type === "BUY" ? "vendor" : "merchant"}
                    />

                    <ProductDetails
                        type={type}
                        isPublic={formState.isPublic}
                        products={products}
                        onUpdateProducts={handleProductsUpdate}
                        addedProducts={formState.products}
                    />

                    <CalculationSelector
                        subTotal={calculations.subTotal}
                        discount={formState.discount}
                        setDiscount={handleDiscountUpdate}
                        charges={convertLocalChargesToLegacy(formState.charges)}
                        setCharge={handleLegacyChargesUpdate}
                    />

                    {error && (
                        <div className="p-3 border border-red-500 bg-red-50 text-red-600 rounded relative">
                            {error}
                            <button
                                type="button"
                                className="absolute top-2 right-2 text-red-600 hover:text-red-800"
                                onClick={() => setError(null)}
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    )}

                    <div className="flex items-center justify-between">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={resetForm}
                            className="text-sm text-gray-500 hover:text-gray-700"
                        >
                            Clear Form
                        </Button>

                        <Button type="submit" className="py-6 text-lg">
                            Continue to Payment
                        </Button>
                    </div>
                </form>
            )}

            {/* Step 2: Payment */}
            {currentStep === "payment" && (
                <form
                    className="space-y-4"
                    onSubmit={(e) => {
                        e.preventDefault();
                        handleContinueToSummary();
                    }}
                >
                    <PaymentSelector
                        selectedPayments={formState.payments}
                        setSelectedPayments={handlePaymentsUpdate}
                        accounts={accounts}
                        grandTotal={calculations.grandTotal}
                        type={type}
                    />

                    {/* Balance Summary for BUY orders */}
                    {type === "BUY" && formState.payments.length > 0 && (
                        <BalanceSummary
                            payments={formState.payments}
                            accounts={accounts}
                            orderType={type}
                        />
                    )}

                    {/* Order Description */}
                    <div className="space-y-2">
                        <label
                            htmlFor="orderDescription"
                            className="text-sm font-medium text-gray-700"
                        >
                            Order Description
                        </label>
                        <Textarea
                            id="orderDescription"
                            placeholder="Enter order description, notes, or special instructions..."
                            value={formState.description}
                            onChange={(e) => handleDescriptionUpdate(e.target.value)}
                            rows={3}
                            className="w-full"
                        />
                    </div>

                    {/* Order Date */}
                    <div className="space-y-2">
                        <label htmlFor="orderDate" className="text-sm font-medium text-gray-700">
                            Order Date
                        </label>
                        <input
                            type="date"
                            id="orderDate"
                            value={formState.orderDate.toISOString().split("T")[0]}
                            onChange={(e) => handleOrderDateUpdate(new Date(e.target.value))}
                            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    {/* Calculation Summary */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="flex justify-between items-center text-sm mb-2">
                            <span>Subtotal:</span>
                            <span>₹{calculations.subTotal.toFixed(2)}</span>
                        </div>
                        {formState.discount > 0 && (
                            <div className="flex justify-between items-center text-sm mb-2 text-green-600">
                                <span>Discount:</span>
                                <span>-₹{formState.discount.toFixed(2)}</span>
                            </div>
                        )}
                        {calculations.chargeAmount > 0 && (
                            <div className="flex justify-between items-center text-sm mb-2 text-orange-600">
                                <span>Charges:</span>
                                <span>+₹{calculations.chargeAmount.toFixed(2)}</span>
                            </div>
                        )}
                        {calculations.vendorCharges > 0 && (
                            <div className="flex justify-between items-center text-sm mb-2 text-purple-600">
                                <span>Vendor Charges:</span>
                                <span>+₹{calculations.vendorCharges.toFixed(2)}</span>
                            </div>
                        )}
                        <div className="flex justify-between items-center font-semibold border-t pt-2">
                            <span>Grand Total:</span>
                            <span>₹{calculations.grandTotal.toFixed(2)}</span>
                        </div>
                        {calculations.totalPaid > 0 && (
                            <div className="flex justify-between items-center text-sm mt-2 text-blue-600">
                                <span>Total Paid:</span>
                                <span>₹{calculations.totalPaid.toFixed(2)}</span>
                            </div>
                        )}
                        {calculations.remainingAmount > 0 && (
                            <div className="flex justify-between items-center text-sm mt-1 text-red-600 font-medium">
                                <span>Remaining:</span>
                                <span>₹{calculations.remainingAmount.toFixed(2)}</span>
                            </div>
                        )}
                    </div>

                    {error && (
                        <div className="p-3 border border-red-500 bg-red-50 text-red-600 rounded relative">
                            {error}
                            <button
                                type="button"
                                className="absolute top-2 right-2 text-red-600 hover:text-red-800"
                                onClick={() => setError(null)}
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    )}

                    <div className="flex items-center justify-between">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleBackToDetails}
                            className="text-sm text-gray-500 hover:text-gray-700"
                        >
                            Back to Details
                        </Button>

                        <Button type="submit" className="py-6 text-lg">
                            Continue to Summary
                        </Button>
                    </div>
                </form>
            )}

            {/* Step 3: Summary & Confirmation */}
            {currentStep === "summary" && (
                <div className="space-y-6">
                    {/* Bill-like Summary */}
                    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                        {/* Header */}
                        <div className="text-center border-b pb-4 mb-6">
                            <h3 className="text-xl font-bold">{type} ORDER SUMMARY</h3>
                            <p className="text-sm text-gray-500 mt-1">
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
                            <h4 className="font-semibold text-gray-700 mb-2">
                                {type === "BUY" ? "Vendor Details" : "Customer Details"}
                            </h4>
                            <div className="bg-gray-50 p-3 rounded">
                                <p className="font-medium">{formState.entity?.name || "N/A"}</p>
                                {formState.entity?.phone && (
                                    <p className="text-sm text-gray-600">
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
                                <h4 className="font-semibold text-gray-700 mb-2">
                                    Order Description
                                </h4>
                                <div className="bg-gray-50 p-3 rounded">
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
                                        <tr className="border-b border-gray-200">
                                            <th className="text-left py-2 font-medium text-gray-700">
                                                Item
                                            </th>
                                            <th className="text-right py-2 font-medium text-gray-700">
                                                Qty
                                            </th>
                                            <th className="text-right py-2 font-medium text-gray-700">
                                                Rate
                                            </th>
                                            <th className="text-right py-2 font-medium text-gray-700">
                                                Amount
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {formState.products
                                            .filter((p) => p.productId !== "" && p.variantId !== "")
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
                                                        <td className="py-2">
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
                                                        <td className="text-right py-2">
                                                            {product.quantity} {details.unit}
                                                        </td>
                                                        <td className="text-right py-2">
                                                            ₹{product.rate.toFixed(2)}
                                                        </td>
                                                        <td className="text-right py-2 font-medium">
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
                        <div className="border-t pt-4">
                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <span>Subtotal:</span>
                                    <span>₹{calculations.subTotal.toFixed(2)}</span>
                                </div>
                                {formState.discount > 0 && (
                                    <div className="flex justify-between text-green-600">
                                        <span>Discount:</span>
                                        <span>-₹{formState.discount.toFixed(2)}</span>
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
                                <div className="flex justify-between font-bold text-lg border-t pt-2">
                                    <span>Grand Total:</span>
                                    <span>₹{calculations.grandTotal.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Payment Details */}
                        {formState.payments.length > 0 && (
                            <div className="mt-6 border-t pt-4">
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
                                                className="flex justify-between bg-gray-50 p-2 rounded"
                                            >
                                                <span className="text-sm">
                                                    {account?.name || "Unknown Account"} (
                                                    {account?.type || "Unknown"})
                                                </span>
                                                <span className="font-medium">
                                                    ₹{payment.amount.toFixed(2)}
                                                </span>
                                            </div>
                                        );
                                    })}
                                    <div className="flex justify-between font-semibold pt-2 border-t">
                                        <span>Total Paid:</span>
                                        <span className="text-blue-600">
                                            ₹{calculations.totalPaid.toFixed(2)}
                                        </span>
                                    </div>
                                    {calculations.remainingAmount > 0 && (
                                        <div className="flex justify-between font-semibold text-red-600">
                                            <span>Remaining Amount:</span>
                                            <span>₹{calculations.remainingAmount.toFixed(2)}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {error && (
                        <div className="p-3 border border-red-500 bg-red-50 text-red-600 rounded relative">
                            {error}
                            <button
                                type="button"
                                className="absolute top-2 right-2 text-red-600 hover:text-red-800"
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
                            onClick={handleBackToPayment}
                            className="text-sm text-gray-500 hover:text-gray-700"
                        >
                            Back to Payment
                        </Button>

                        <Button
                            onClick={handleSubmit}
                            className="py-6 text-lg bg-green-600 hover:bg-green-700"
                            disabled={loading}
                        >
                            {loading ? "Processing..." : `Confirm & Create ${type} Order`}
                        </Button>
                    </div>
                </div>
            )}

            {/* Vendor Account Selection Dialog */}
            {isAccountSelectionActive && (
                <AccountSelectionDialog
                    accounts={accounts}
                    vendorCharges={calculations.vendorCharges}
                    onSelect={handleVendorAccountSelect}
                    onClose={() => setIsAccountSelectionActive(false)}
                />
            )}
        </div>
    );
}
