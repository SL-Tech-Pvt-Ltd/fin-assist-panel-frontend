export type AccountStatus = "UNVERIFIED" | "VERIFIED" | "SUSPENDED" | "DELETED";

export interface User {
    id: string;
    email: string;
    password: string;
    name: string;
    bio?: string | null;
    address?: string | null;
    avatar?: string | null;
    phone?: string | null;
    status: AccountStatus;
    isSuperAdmin: boolean;
    isDemoUser: boolean;
    createdAt: string;
    updatedAt: string;
    roleAccess?: RoleAccess[];
    organizations?: Organization[];
}

export interface AccountVerification {
    id: string;
    userId: string;
    user?: User;
    token: string;
    expires: string;
    verified: boolean;
    createdAt: string;
}

export interface PasswordResetRequest {
    id: string;
    userId: string;
    user?: User;
    token: string;
    expires: string;
    used: boolean;
    createdAt: string;
}
export interface Organization {
    id: string;
    name: string;
    ownerId: string;
    owner?: User;
    vatStatus?: "always" | "never" | "conditional" | null;
    description?: string | null;
    logo?: string | null;
    contact?: string | null;
    pan?: string | null;
    vat?: string | null;
    domain?: string | null;
    depreciationRate?: number | null;
    deletedAt?: string | null;
    defaultRoleId?: string | null;
    createdAt: string;
    updatedAt: string;
}

export type Permission =
    | "ORGANIZATION_UPDATE"
    | "ORGANIZATION_ADMIN"
    | "ACCOUNT_READ"
    | "ACCOUNT_CREATE"
    | "ACCOUNT_UPDATE"
    | "PRODUCT_READ"
    | "PRODUCT_CREATE"
    | "PRODUCT_UPDATE"
    | "ENTITY_READ"
    | "ENTITY_CREATE"
    | "ENTITY_UPDATE"
    | "ORDER_READ"
    | "ORDER_CREATE"
    | "ORDER_UPDATE"
    | "POS_READ"
    | "POS_CREATE"
    | "POS_UPDATE"
    | "EXPENSE_READ"
    | "EXPENSE_CREATE"
    | "EXPENSE_UPDATE";

export interface OrganizationRole {
    id: string;
    title: string;
    description?: string | null;
    organizationId: string;
    permissions: Permission[];
    createdAt: string;
    updatedAt: string;
}

export interface RoleAccess {
    id: string;
    userId: string;
    organizationId: string;
    user?: User;

    organizationRoleId?: string | null;
    organizationRole?: OrganizationRole | null;

    role?: OrganizationRole;

    organization?: Organization;
    createdAt: string;
}

export type InviteStatus = "PENDING" | "ACCEPTED" | "REJECTED" | "EXPIRED";

export interface Invite {
    id: string;
    email: string;
    status: InviteStatus;
    organizationId: string;
    organization?: Organization;
    createdAt: string;
    updatedAt: string;
}

export type AccountType = "BANK" | "BANK_OD" | "CASH_COUNTER" | "CHEQUE" | "MISC";

export interface AccountDetails {
    accountNumber?: string;
    bankName?: string;
    chequeDate?: string | null;
}

export interface Account {
    id: string;
    name: string;
    balance: number;
    type: AccountType;
    limit?: number | null;
    details?: {
        accountNumber?: string;
        bankName?: string;
        chequeDate?: string | null;
    };
    interestRate?: number | null;
    accumulatedInterest?: number | null;
    interestChanges?: any;
    organizationId: string;
    organization?: Organization;
    createdAt: string;
    updatedAt: string;
    isDeleted?: boolean;
    transactions?: Transaction[];
    expenseIncomeTransactions?: ExpenseIncomeTransaction[];
}

export interface Entity {
    id: string;
    name: string;
    phone: string;
    email?: string | null;
    description?: string | null;
    isDefault: boolean;
    isMerchant: boolean;
    isVendor: boolean;
    organizationId: string;
    organization?: Organization;
    createdAt: string;
    updatedAt: string;
    isDeleted?: boolean;
    orders?: Order[];
    expenseIncomeTransactions?: ExpenseIncomeTransaction[];
}

export interface Category {
    id: string;
    name: string;
    description?: string | null;
    organizationId: string;
    organization?: Organization;
    createdAt: string;
    updatedAt: string;
    products?: Product[];
}

export interface StockFiFoQueue {
    id: string;
    productVariantId: string;
    buyPrice: number;
    estimatedPrice: number;
    originalStock: number;
    availableStock: number;
    createdAt: string;
    updatedAt: string;
    productVariant?: ProductVariant;
}

export interface ProductVariant {
    id: string;
    name: string;
    productId: string;
    product?: Product;
    description?: string | null;
    imageUrls?: string[];
    isBase?: boolean;
    price: number;
    buyPrice: number;
    minSellingPrice?: number;
    stock: number;
    values?: any;
    code: string;
    sku: string;
    createdAt: string;
    updatedAt: string;
    items?: OrderItem[];
    stock_fifo_queue?: StockFiFoQueue[];
}

export interface Product {
    id: string;
    name: string;
    slug?: string | null;
    categoryId?: string | null;
    category?: Category | null;
    description?: string | null;
    image?: string | null;
    imageUrls?: string[];
    isPublished?: boolean;
    code: string;
    sku: string;
    options?: any;
    isDeleted?: boolean;
    organizationId: string;
    organization?: Organization;
    createdAt: string;
    updatedAt: string;
    variants?: ProductVariant[];
}

export type PaymentStatus = "PAID" | "PENDING" | "FAILED" | "CANCELLED" | "PARTIAL";

export interface Order {
    id: string;
    orderNumber: string;
    description?: string | null;

    type: "BUY" | "SELL" | "MISC";

    baseAmount: number;
    discount: number;
    tax: number;
    totalAmount: number;

    totalGrossProfit: number;
    totalNettProfit: number;
    totalAboveMinSelling: number;
    totalEstimatedProfit: number;

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

    paidTillNow?: number;

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

    order?: Order;
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
    type: "BUY" | "SELL" | "MISC" | "TRANSFER" | "REFUND" | "CHEQUE" | "CASH_COUNTER";

    createdAt: string;
    updatedAt: string;

    account?: Account | null;
    order?: Order | null;
    organization?: Organization | null;
}

// Expense and Income Management Types
export type TransactionCategory =
    | "OFFICE_RENT"
    | "EMPLOYEE_SALARY"
    | "UTILITY_BILLS"
    | "OFFICE_SUPPLIES"
    | "TRAVEL_EXPENSE"
    | "MARKETING_ADVERTISING"
    | "PROFESSIONAL_FEES"
    | "EQUIPMENT_MAINTENANCE"
    | "INSURANCE"
    | "TAXES"
    | "DONATIONS_GIVEN"
    | "INTEREST_PAID"
    | "DEPRECIATION"
    | "MISCELLANEOUS_EXPENSE"
    | "SERVICE_INCOME"
    | "CONSULTING_INCOME"
    | "RENTAL_INCOME"
    | "INTEREST_RECEIVED"
    | "DONATIONS_RECEIVED"
    | "COMMISSION_INCOME"
    | "DIVIDEND_INCOME"
    | "CAPITAL_GAINS"
    | "MISCELLANEOUS_INCOME"
    | "PRODUCT_SALE"
    | "PRODUCT_PURCHASE";

export type RecurrenceType = "NONE" | "DAILY" | "WEEKLY" | "MONTHLY" | "QUARTERLY" | "YEARLY";

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
