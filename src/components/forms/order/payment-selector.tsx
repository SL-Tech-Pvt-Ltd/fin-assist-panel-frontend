"use client";

import { useMemo } from "react";
import {
    Trash2,
    CreditCard,
    Wallet,
    Building,
    AlertCircle,
    AlertTriangle,
    DollarSign,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { Account } from "@/data/types";
import type { OrderPayment } from "./types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import AddPaymentDialog from "@/components/modals/AddPaymentDialog";

interface PaymentSelectorProps {
    accounts: Account[];
    grandTotal: number;
    selectedPayments: OrderPayment[];
    setSelectedPayments: (payments: OrderPayment[]) => void;
    error?: string | null;
    type: "BUY" | "SELL" | "MISC";
}

// Icon by account type
const AccountIcon = ({ type }: { type: string }) => {
    switch (type.toLowerCase()) {
        case "credit":
            return <CreditCard className="w-4 h-4" />;
        case "bank":
            return <Building className="w-4 h-4" />;
        default:
            return <Wallet className="w-4 h-4" />;
    }
};

const PaymentItem = ({
    payment,
    account,
    onRemove,
    type,
}: {
    payment: OrderPayment;
    account: Account;
    onRemove: () => void;
    type: "BUY" | "SELL" | "MISC";
}) => {
    const hasInsufficientBalance = type === "BUY" && payment.amount > account.balance;

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            transition={{ duration: 0.2 }}
            className={`flex justify-between items-center p-3 border-b last:border-b-0 group hover:bg-gray-50 rounded-md transition-colors ${
                hasInsufficientBalance ? "bg-red-50 border-red-200" : ""
            }`}
        >
            <div className="flex items-center gap-3">
                <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        hasInsufficientBalance
                            ? "bg-red-100 text-red-600"
                            : "bg-blue-100 text-blue-600"
                    }`}
                >
                    <AccountIcon type={account.type} />
                </div>
                <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{account.name}</span>
                        {hasInsufficientBalance && (
                            <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded font-medium">
                                Insufficient
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>{account.type}</span>
                        {type === "BUY" && (
                            <span
                                className={
                                    hasInsufficientBalance
                                        ? "text-red-600 font-medium"
                                        : "text-green-600"
                                }
                            >
                                Balance: Rs {account.balance.toFixed(2)}
                            </span>
                        )}
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-3">
                <Badge
                    variant={hasInsufficientBalance ? "destructive" : "secondary"}
                    className="font-semibold"
                >
                    Rs {payment.amount.toFixed(2)}
                </Badge>
                <Button
                    size="icon"
                    variant="ghost"
                    onClick={onRemove}
                    type="button"
                    className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 hover:bg-red-50 hover:text-red-600"
                    aria-label="Remove payment"
                >
                    <Trash2 className="w-4 h-4" />
                </Button>
            </div>
        </motion.div>
    );
};

const EmptyState = () => (
    <div className="py-12 text-center text-gray-500">
        <Wallet className="mx-auto mb-3 w-12 h-12 text-gray-400" />
        <p className="font-medium text-gray-700 mb-1">No payments added yet</p>
        <p className="text-sm">Start by selecting a payment method above</p>
    </div>
);

const TotalSummary = ({ totalPaid, grandTotal }: { totalPaid: number; grandTotal: number }) => {
    const remaining = useMemo(() => grandTotal - totalPaid, [totalPaid, grandTotal]);
    const overpaid = remaining < 0;

    return (
        <div className="flex flex-col items-end">
            <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium text-gray-600">Total Paid:</span>
                <span className="text-lg font-bold text-gray-900">Rs {totalPaid.toFixed(2)}</span>
            </div>
            {remaining !== 0 && (
                <div
                    className={`text-xs font-medium ${
                        overpaid ? "text-yellow-600" : "text-red-600"
                    }`}
                >
                    {overpaid ? "Overpaid" : "Remaining"}: Rs {Math.abs(remaining).toFixed(2)}
                </div>
            )}
        </div>
    );
};

export function PaymentSelector({
    accounts,
    grandTotal,
    selectedPayments,
    setSelectedPayments,
    error,
    type,
}: PaymentSelectorProps) {
    const totalPaid = useMemo(
        () => selectedPayments.reduce((acc, p) => acc + p.amount, 0),
        [selectedPayments]
    );

    const removePayment = (index: number) =>
        setSelectedPayments(selectedPayments.filter((_, i) => i !== index));

    const handleAddPayment = (amount: number, accountId: string, details: object) =>
        setSelectedPayments([...selectedPayments, { amount, accountId, details }]);

    const overpaidBy = useMemo(() => totalPaid - grandTotal, [totalPaid, grandTotal]);

    const insufficientBalancePayments = useMemo(() => {
        if (type !== "BUY") return [];
        return selectedPayments.filter((payment) => {
            const account = accounts.find((acc) => acc.id === payment.accountId);
            return account && payment.amount > account.balance;
        });
    }, [type, selectedPayments, accounts]);

    return (
        <Card className="border border-gray-200 shadow-sm bg-gradient-to-br from-gray-50 to-gray-100">
            <CardHeader className="border-b border-gray-200 pb-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-indigo-500 flex items-center justify-center">
                            <DollarSign className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <CardTitle className="text-lg font-semibold text-gray-800">
                                Payment Methods
                            </CardTitle>
                            <CardDescription>Select payment accounts</CardDescription>
                        </div>
                    </div>
                    <TotalSummary totalPaid={totalPaid} grandTotal={grandTotal} />
                </div>
            </CardHeader>

            <CardContent className="p-6 space-y-4">
                {error && (
                    <div className="p-3 bg-red-50 border-l-4 border-red-500 rounded flex gap-3 items-start">
                        <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                        <p className="text-red-600 text-sm font-medium">{error}</p>
                    </div>
                )}

                {overpaidBy > 0 && (
                    <div className="p-3 bg-yellow-50 border-l-4 border-yellow-500 rounded flex gap-3 items-start">
                        <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                        <div>
                            <p className="text-yellow-800 text-sm font-medium">
                                Payment exceeds total by Rs {Math.abs(overpaidBy).toFixed(2)}
                            </p>
                            <p className="text-yellow-700 text-xs mt-1">
                                Please adjust payment amounts to match the grand total.
                            </p>
                        </div>
                    </div>
                )}

                {insufficientBalancePayments.length > 0 && (
                    <div className="p-3 bg-red-50 border-l-4 border-red-500 rounded flex gap-3 items-start">
                        <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                        <div>
                            <p className="text-red-800 text-sm font-medium">
                                {insufficientBalancePayments.length === 1
                                    ? "One payment exceeds account balance"
                                    : `${insufficientBalancePayments.length} payments exceed account balances`}
                            </p>
                            <p className="text-red-700 text-xs mt-1">
                                Please reduce payment amounts or select different accounts.
                            </p>
                        </div>
                    </div>
                )}

                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-700">Selected Payments</h3>
                    <AddPaymentDialog
                        type={type}
                        accounts={accounts}
                        remainingAmount={grandTotal}
                        onAddPayment={handleAddPayment}
                    />
                </div>

                <div
                    className={cn(
                        "rounded-lg border border-gray-200",
                        selectedPayments.length === 0 ? "bg-gray-50" : "bg-white"
                    )}
                >
                    {selectedPayments.length === 0 ? (
                        <EmptyState />
                    ) : (
                        <ScrollArea className="h-[280px] w-full p-3">
                            <AnimatePresence initial={false}>
                                {selectedPayments.map((payment, index) => {
                                    const account = accounts.find(
                                        (a) => a.id === payment.accountId
                                    );
                                    if (!account) return null;
                                    return (
                                        <PaymentItem
                                            key={`${payment.accountId}-${index}`}
                                            payment={payment}
                                            account={account}
                                            type={type}
                                            onRemove={() => removePayment(index)}
                                        />
                                    );
                                })}
                            </AnimatePresence>
                        </ScrollArea>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
