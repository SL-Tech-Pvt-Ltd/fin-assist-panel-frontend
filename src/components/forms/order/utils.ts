import type { Account, Product } from "@/data/types";
import type {
    OrderProduct,
    OrderCharge,
    OrderPayment,
    OrderFormState,
    CreateOrderPayload,
} from "./types";

/**
 * Calculate subtotal from products
 */
export const calculateSubTotal = (products: OrderProduct[]): number => {
    return products.reduce((sum, product) => {
        const amount = product.rate * product.quantity;
        return sum + (isNaN(amount) ? 0 : amount);
    }, 0);
};

/**
 * Calculate charges paid by entity
 */
export const calculateChargeAmount = (
    subTotal: number,
    discount: number,
    charges: OrderCharge[]
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
export const calculateVendorCharges = (subTotal: number, charges: OrderCharge[]): number => {
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
export const calculateGrandTotal = (
    subTotal: number,
    discount: number,
    tax: number,
    charges: OrderCharge[]
): number => {
    const chargeAmount = calculateChargeAmount(subTotal, discount, charges);
    const total = subTotal - discount + tax + chargeAmount;
    return Math.max(total, 0);
};

/**
 * Calculate total paid amount
 */
export const calculateTotalPaid = (payments: OrderPayment[]): number => {
    return payments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
};

/**
 * Calculate remaining amount to be paid
 */
export const calculateRemainingAmount = (grandTotal: number, totalPaid: number): number => {
    return Math.max(grandTotal - totalPaid, 0);
};

/**
 * Create initial form state with localStorage persistence
 */
export const createInitialFormState = (
    type: string,
    orgId: string,
    defaultEntity: any
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
                discountType: parsed.discountType || "fixed",
                discountPercentage: parsed.discountPercentage || 0,
                tax: parsed.tax || 0,
                taxType: parsed.taxType || "percentage",
                taxPercentage: parsed.taxPercentage || 0,
                charges: parsed.charges || [],
                payments: parsed.payments || [],
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
        discountType: "fixed",
        discountPercentage: 0,
        tax: 0,
        taxType: "percentage",
        taxPercentage: 0,
        charges: [],
        payments: [],
        isPublic: false,
        orderDate: new Date(),
    };
};

/**
 * Convert local state to API payload
 */
export const convertToPayload = (
    formState: OrderFormState,
    type: "BUY" | "SELL",
    accounts: Account[]
): CreateOrderPayload => {
    // Filter valid products
    const validProducts = formState.products.filter(
        (p) => p.productId !== "" && p.variantId !== ""
    );

    // Calculate grand total
    const grandTotal = calculateGrandTotal(
        calculateSubTotal(validProducts),
        formState.discount,
        formState.tax,
        formState.charges
    );

    // Determine final payments
    const finalPayments =
        formState.entity?.isDefault &&
        type === "SELL" &&
        accounts.find((acc) => acc.type === "CASH_COUNTER")
            ? [
                  {
                      accountId: accounts.find((acc) => acc.type === "CASH_COUNTER")?.id || "",
                      amount: grandTotal,
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
 * Validate product quantities for SELL orders
 */
export const validateProductQuantities = (
    type: "BUY" | "SELL",
    products: Product[],
    addedProducts: OrderProduct[]
): { isValid: boolean; errors: string[] } => {
    if (type !== "SELL") return { isValid: true, errors: [] };

    const errors: string[] = [];
    const variantMap = new Map(products.flatMap((p) => p.variants?.map((v) => [v.id, v]) ?? []));
    const productMap = new Map(products.map((p) => [p.id, p]));

    const getVariantStock = (variant: any): number => {
        if (!variant?.stock_fifo_queue) return 0;
        return variant.stock_fifo_queue.reduce(
            (total: number, entry: any) => total + entry.availableStock,
            0
        );
    };

    addedProducts.forEach((item, index) => {
        const variant = variantMap.get(item.variantId);
        if (variant && item.quantity > getVariantStock(variant)) {
            const product = productMap.get(item.productId);
            errors.push(
                `Item #${index + 1} (${product?.name} - ${variant.name}): Quantity (${
                    item.quantity
                }) exceeds available stock (${getVariantStock(variant)}).`
            );
        }
    });

    return { isValid: errors.length === 0, errors };
};

/**
 * Validate account balances for payments
 */
export const validateAccountBalances = (
    payments: OrderPayment[],
    accounts: Account[],
    type: "BUY" | "SELL"
): { isValid: boolean; errors: string[] } => {
    if (type !== "BUY") return { isValid: true, errors: [] };

    const errors: string[] = [];
    const accountMap = new Map(accounts.map((acc) => [acc.id, acc]));

    payments.forEach((payment, index) => {
        const account = accountMap.get(payment.accountId);
        if (account && payment.amount > account.balance) {
            errors.push(
                `Payment #${index + 1} (${account.name}): Amount (${payment.amount.toFixed(
                    2
                )}) exceeds balance (${account.balance.toFixed(2)})`
            );
        }
    });

    return { isValid: errors.length === 0, errors };
};
