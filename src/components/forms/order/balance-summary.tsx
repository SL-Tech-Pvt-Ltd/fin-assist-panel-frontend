"use client";

import { useMemo } from "react";
import { AlertCircle, CheckCircle, Wallet, TrendingDown } from "lucide-react";
import type { Account } from "@/data/types";
import type { OrderPayment } from "./types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface BalanceSummaryProps {
    payments: OrderPayment[];
    accounts: Account[];
    orderType: "BUY" | "SELL" | "MISC";
    className?: string;
}

interface AccountSummary {
    account: Account;
    totalRequired: number;
    balance: number;
    shortfall: number;
    hasInsufficientBalance: boolean;
}

export function BalanceSummary({
    payments,
    accounts,
    orderType,
    className = "",
}: BalanceSummaryProps) {
    const accountSummaries = useMemo(() => {
        if (orderType !== "BUY" || payments.length === 0) return [];

        // Group payments by account
        const accountPayments = new Map<string, number>();
        payments.forEach((payment) => {
            const current = accountPayments.get(payment.accountId) || 0;
            accountPayments.set(payment.accountId, current + payment.amount);
        });

        // Create summaries for accounts with payments
        const summaries: AccountSummary[] = [];
        accountPayments.forEach((totalRequired, accountId) => {
            const account = accounts.find((acc) => acc.id === accountId);
            if (account) {
                const shortfall = Math.max(0, totalRequired - account.balance);
                summaries.push({
                    account,
                    totalRequired,
                    balance: account.balance,
                    shortfall,
                    hasInsufficientBalance: shortfall > 0,
                });
            }
        });

        return summaries.sort((a, b) => {
            // Sort by insufficient balance first, then by account name
            if (a.hasInsufficientBalance !== b.hasInsufficientBalance) {
                return a.hasInsufficientBalance ? -1 : 1;
            }
            return a.account.name.localeCompare(b.account.name);
        });
    }, [payments, accounts, orderType]);

    const totalShortfall = useMemo(() => {
        return accountSummaries.reduce((sum, summary) => sum + summary.shortfall, 0);
    }, [accountSummaries]);

    const hasAnyInsufficientBalance = accountSummaries.some((s) => s.hasInsufficientBalance);

    if (orderType !== "BUY" || accountSummaries.length === 0) {
        return null;
    }

    return (
        <Card
            className={`border border-gray-200 shadow-sm bg-gradient-to-br from-gray-50 to-gray-100 ${className}`}
        >
            <CardHeader className="border-b border-gray-200 pb-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div
                            className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                hasAnyInsufficientBalance ? "bg-red-500" : "bg-green-500"
                            }`}
                        >
                            {hasAnyInsufficientBalance ? (
                                <TrendingDown className="w-5 h-5 text-white" />
                            ) : (
                                <Wallet className="w-5 h-5 text-white" />
                            )}
                        </div>
                        <CardTitle className="text-lg font-semibold text-gray-800">
                            Account Balance Summary
                        </CardTitle>
                    </div>
                    {hasAnyInsufficientBalance ? (
                        <Badge variant="destructive" className="font-semibold">
                            Insufficient Balance
                        </Badge>
                    ) : (
                        <Badge className="bg-green-100 text-green-700 hover:bg-green-200 font-semibold">
                            All Good
                        </Badge>
                    )}
                </div>
            </CardHeader>

            <CardContent className="p-6 space-y-3">
                {accountSummaries.map((summary) => (
                    <div
                        key={summary.account.id}
                        className={`p-4 rounded-lg border-l-4 ${
                            summary.hasInsufficientBalance
                                ? "bg-red-50 border-red-500"
                                : "bg-green-50 border-green-500"
                        }`}
                    >
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                {summary.hasInsufficientBalance ? (
                                    <AlertCircle className="w-5 h-5 text-red-600" />
                                ) : (
                                    <CheckCircle className="w-5 h-5 text-green-600" />
                                )}
                                <span className="font-semibold text-gray-900">
                                    {summary.account.name}
                                </span>
                            </div>
                            <Badge variant="outline" className="text-xs font-medium">
                                {summary.account.type}
                            </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-600">Available:</span>
                                <span className="font-semibold text-gray-900">
                                    Rs {summary.balance.toFixed(2)}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Required:</span>
                                <span className="font-semibold text-gray-900">
                                    Rs {summary.totalRequired.toFixed(2)}
                                </span>
                            </div>
                        </div>

                        {summary.hasInsufficientBalance && (
                            <div className="mt-3 pt-3 border-t border-red-200">
                                <div className="flex justify-between items-center">
                                    <span className="text-red-700 font-semibold text-sm">
                                        Shortfall:
                                    </span>
                                    <span className="font-bold text-red-700 text-lg">
                                        Rs {summary.shortfall.toFixed(2)}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                ))}

                {totalShortfall > 0 && (
                    <div className="mt-4 p-4 bg-red-100 border-l-4 border-red-600 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-bold text-red-900">Total Shortfall:</span>
                            <span className="font-bold text-red-900 text-xl">
                                Rs {totalShortfall.toFixed(2)}
                            </span>
                        </div>
                        <p className="text-xs text-red-800 mt-2">
                            ⚠️ You need to add Rs {totalShortfall.toFixed(2)} more to your accounts
                            or reduce payment amounts.
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
