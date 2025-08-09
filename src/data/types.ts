export interface User {
    id?: string;
    email: string;
    password: string;
    name: string;
    createdAt: string;
    updatedAt: string;

    organizations?: Organization[];
    roleAccess?: RoleAccess[];
}

export interface Organization {
    id?: string;
    name: string;
    ownerId: string;
    description: string | null;
    logo?: string | null;
    contact?: string | null;
    pan?: string | null;
    vat?: string | null;
    vatStatus?: "always" | "never" | "conditional" | null;
    domain?: string | null;
    createdAt?: string;
    updatedAt?: string;
}

export type ACCESS = "ORG" | "ACCOUNT" | "PRODUCT" | "ENTITY" | "ORDER";

export interface RoleAccess {
    id: string;
    userId: string;
    organizationId: string;
    access: ACCESS;
    user?: User;
    organization?: Organization;
    createdAt: string;
}

export interface Invite {
    id: string;
    organizationId: string;
    email: string;
    status: "PENDING" | "ACCEPTED" | "REJECTED" | "EXPIRED";
    createdAt: string;
    updatedAt: string;

    organization?: Organization;
}

export type ACCOUNT_TYPE =
    | "BANK"
    | "BANK_OD"
    | "CASH_COUNTER"
    | "CHEQUE"
    | "MISC";

export interface AccountDetails {
    accountNumber: string;
    bankName: string;
    chequeDate: string | null;
}

export interface Account {
    id: string;
    name: string;
    balance: number;
    type: ACCOUNT_TYPE;

    details: AccountDetails;

    organizationId: string;
    createdAt: string;
    updatedAt: string;

    transactions?: Transaction[];
}

export interface Entity {
    id: string;
    name: string;
    phone: string;
    email: string | null;
    description: string | null;
    isMerchant: boolean | null;
    isVendor: boolean | null;
    organizationId: string;
    createdAt: string;
    updatedAt: string;
    isDefault?: boolean;

    orders?: Order[];
}

export interface Category {
    id: string;
    name: string;
    description: string | null;
    organizationId: string;
    createdAt: string;
    updatedAt: string;
}

export interface ProductVariant {
    id: string;
    name: string;
    description: string | null;
    productId: string;

    buyPrice: number;
    estimatedPrice: number;
    stock: number;

    values: object;
    code: string;
    sku: string;

    createdAt: string;
    updatedAt: string;
}

export interface Product {
    id: string;
    name: string;
    categoryId: string;
    image: string | null;
    sku: string;
    description: string | null;
    organizationId: string;
    createdAt: string;
    updatedAt: string;
    isPublished: boolean;

    variants?: ProductVariant[];
    category?: Category | null;
}

export type PaymentStatus =
    | "PAID"
    | "PENDING"
    | "FAILED"
    | "CANCELLED"
    | "PARTIAL";

export interface Order {
    id: string;
    orderNumber: string;
    description?: string | null;

    type: "BUY" | "SELL" | "MISC";

    baseAmount: number;
    discount: number;
    tax: number;
    totalAmount: number;

    paymentStatus: PaymentStatus;

    organizationId: string;
    entityId?: string | null;
    createdAt: string;
    updatedAt: string;
    charges?: {
        id: string;
        amount: number;
        label: string;
        bearedByEntity: boolean;
    }[];

    organization?: Organization | null;
    entity?: Entity | null;

    items?: OrderItem[];
    transactions?: Transaction[];
}

export interface OrderItem {
    id: string;
    name: string;
    description?: string | null;

    orderId: string;
    productVariantId: string;
    quantity: number;
    price: number;
    subTotal: number;

    createdAt: string;
    updatedAt: string;
}

export interface TransactionDetails {
    chequeNumber?: string | null;
    chequeDate?: string | null;
    chequeIssuer?: string | null;
    chequeIssuerBank?: string | null;
}

export interface Transaction {
    id: string;
    description: string | null;
    amount: number;
    details?: TransactionDetails | null;

    organizationId: string;
    accountId: string;
    orderId: string | null;
    type:
        | "BUY"
        | "SELL"
        | "MISC"
        | "TRANSFER"
        | "REFUND"
        | "CHEQUE"
        | "CASH_COUNTER";

    createdAt: string;
    updatedAt: string;

    account?: Account | null;
    order?: Order | null;
    organization?: Organization | null;
}

// Expense and Income Management Types
export enum TransactionCategory {
    // Expense Categories
    OFFICE_RENT = "OFFICE_RENT",
    EMPLOYEE_SALARY = "EMPLOYEE_SALARY",
    UTILITY_BILLS = "UTILITY_BILLS",
    OFFICE_SUPPLIES = "OFFICE_SUPPLIES",
    TRAVEL_EXPENSE = "TRAVEL_EXPENSE",
    MARKETING_ADVERTISING = "MARKETING_ADVERTISING",
    PROFESSIONAL_FEES = "PROFESSIONAL_FEES",
    EQUIPMENT_MAINTENANCE = "EQUIPMENT_MAINTENANCE",
    INSURANCE = "INSURANCE",
    TAXES = "TAXES",
    DONATIONS_GIVEN = "DONATIONS_GIVEN",
    INTEREST_PAID = "INTEREST_PAID",
    DEPRECIATION = "DEPRECIATION",
    MISCELLANEOUS_EXPENSE = "MISCELLANEOUS_EXPENSE",
    
    // Income Categories
    SERVICE_INCOME = "SERVICE_INCOME",
    CONSULTING_INCOME = "CONSULTING_INCOME",
    RENTAL_INCOME = "RENTAL_INCOME",
    INTEREST_RECEIVED = "INTEREST_RECEIVED",
    DONATIONS_RECEIVED = "DONATIONS_RECEIVED",
    COMMISSION_INCOME = "COMMISSION_INCOME",
    DIVIDEND_INCOME = "DIVIDEND_INCOME",
    CAPITAL_GAINS = "CAPITAL_GAINS",
    MISCELLANEOUS_INCOME = "MISCELLANEOUS_INCOME",
    
    // Existing for backward compatibility
    PRODUCT_SALE = "PRODUCT_SALE",
    PRODUCT_PURCHASE = "PRODUCT_PURCHASE",
}

export enum RecurrenceType {
    NONE = "NONE",
    DAILY = "DAILY",
    WEEKLY = "WEEKLY",
    MONTHLY = "MONTHLY",
    QUARTERLY = "QUARTERLY",
    YEARLY = "YEARLY",
}

export interface ExpenseIncomeTransaction {
    id: string;
    amount: number;
    description: string;
    category: TransactionCategory;
    isExpense: boolean;
    
    // Recurrence fields
    isRecurring: boolean;
    recurrenceType: RecurrenceType;
    recurrenceInterval?: number;
    nextDueDate?: string;
    endDate?: string;
    
    // Reference fields
    organizationId: string;
    accountId: string;
    entityId?: string;
    
    // Metadata
    tags: string[];
    notes?: string;
    attachments?: any;
    
    createdAt: string;
    updatedAt: string;
    
    // Relations
    account?: Account;
    entity?: Entity;
    parentTransaction?: ExpenseIncomeTransaction;
    childTransactions?: ExpenseIncomeTransaction[];
}

export interface ExpenseIncomeSummary {
    totalExpenses: number;
    totalIncome: number;
    netAmount: number;
    byCategory: {
        category: TransactionCategory;
        amount: number;
        count: number;
        isExpense: boolean;
    }[];
    byMonth: {
        month: string;
        totalExpenses: number;
        totalIncome: number;
        netAmount: number;
    }[];
    topCategories: {
        category: TransactionCategory;
        amount: number;
        percentage: number;
        isExpense: boolean;
    }[];
}
