import { Order, Transaction } from "./types";

export interface POSRegister {
    id: string;
    title: string;
    description?: string;
    openingBalance: number;
    expectedClosingBalance: number;
    actualClosingBalance: number;
    isClosed: boolean;
    closedAt: string | null;
    organizationId: string;
    createdAt: string;
    updatedAt: string;
    createdByUserId: string | null;
    // For list endpoint
    _count?: {
        orders: number;
        transactions: number;
    };
    // For single register endpoint
    orders?: Order[];
    transactions?: Transaction[];
}

export interface CreatePOSRegisterData {
    title: string;
    openingBalance: number;
    description?: string;
}

export interface ClosePOSRegisterData {
    actualClosingBalance: number;
}

export interface UpdatePOSRegisterData {
    title?: string;
    description?: string;
}

export interface POSRegisterSummary {
    registerId: string;
    title: string;
    openingBalance: number;
    currentBalance: number;
    totalSales: number;
    totalCashIn: number;
    totalCashOut: number;
    transactionCount: number;
    openedAt: string;
    duration: string;
}
