import type { Entity, Product, Account, Order } from "@/data/types";

/**
 * API Payload for creating orders
 */
export interface CreateOrderPayload {
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
 * Local state product with UI metadata
 */
export interface OrderProduct {
    productId: string;
    variantId: string;
    rate: number;
    quantity: number;
    description: string;
}

/**
 * Local state charge with UI metadata
 */
export interface OrderCharge {
    id: string;
    name: string;
    amount: number;
    type: "fixed" | "percentage";
    percentage: number;
    isPaidByBusiness: boolean;
    isVat?: boolean;
}

/**
 * Local state payment with UI metadata
 */
export interface OrderPayment {
    accountId: string;
    amount: number;
    details: Record<string, any>;
}

/**
 * Main form state structure
 */
export interface OrderFormState {
    // Order Details
    entity: Entity | null;
    products: OrderProduct[];
    discount: number;
    discountType: "fixed" | "percentage";
    discountPercentage: number;
    charges: OrderCharge[];
    tax: number;
    taxType: "fixed" | "percentage";
    taxPercentage: number;
    description: string;
    orderDate: Date;

    // Payment Details
    payments: OrderPayment[];

    // Additional metadata
    isPublic: boolean;
}

/**
 * UI workflow step
 */
export type FormStep = "details" | "payment" | "summary";

/**
 * Calculation results for memoization
 */
export interface OrderCalculations {
    subTotal: number;
    discountAmount: number;
    taxAmount: number;
    chargeAmount: number;
    vendorCharges: number;
    grandTotal: number;
    totalPaid: number;
    remainingAmount: number;
}

/**
 * Component Props
 */
export interface CreateOrderProps {
    type: "BUY" | "SELL";
    entities: Entity[];
    products: Product[];
    accounts: Account[];
    addEntity: (entity: Partial<Entity>) => Promise<Entity | null>;
    onSubmit: (data: CreateOrderPayload) => Promise<Order> | void;
    defaultEntity?: Entity | null;
}
