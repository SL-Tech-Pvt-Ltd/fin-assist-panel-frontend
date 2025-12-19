"use client";

import { useOrg } from "@/providers/org-provider";
import { api } from "@/utils/api";
import type { Account } from "@/data/types";
import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { useRequirePermissions, usePermissions } from "@/hooks/use-permissions";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import AccountCard from "@/components/cards/AccountCard";
import CreateAccountForm from "@/components/forms/CreateAccountForm";

export default function AccountsDashboard() {
    useRequirePermissions("ACCOUNT_READ");
    const { hasPermission } = usePermissions();
    const { orgId } = useOrg();
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [, setError] = useState<string | null>(null);
    const [, setIsCreateDialogOpen] = useState(false);
    const { toast } = useToast();

    const fetchAccounts = async () => {
        try {
            setIsLoading(true);
            const { data } = await api.get(`orgs/${orgId}/accounts`);
            setAccounts(data);
            setError(null);
        } catch (err) {
            setError("Failed to load accounts. Please try again.");
            toast({
                title: "Error",
                description: "Failed to load accounts. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (orgId) {
            fetchAccounts();
        }
    }, [orgId]);

    const handleCreateAccount = async (account: Account) => {
        try {
            const newlyCreated = await api.post(`orgs/${orgId}/accounts`, account);
            toast({
                title: "Success",
                description: "Account created successfully",
            });
            setAccounts((prev) => [...prev, newlyCreated.data]);
            setIsCreateDialogOpen(false);
        } catch (err) {
            toast({
                title: "Error",
                description: "Failed to create account. Please try again.",
                variant: "destructive",
            });
        }
    };

    const accountTypes = [
        { id: "all", label: "All Accounts" },
        { id: "BANK", label: "Bank Accounts" },
        { id: "BANK_OD", label: "Bank OD" },
        { id: "CASH_COUNTER", label: "Cash" },
        { id: "CHEQUE", label: "Cheque" },
        { id: "MISC", label: "Miscellaneous" },
    ];

    const hasCashCounter = accounts.some((account) => account.type === "CASH_COUNTER");

    const getTotalBalance = (type?: string) => {
        return accounts
            .filter((account) => !type || type === "all" || account.type === type)
            .reduce((sum, account) => sum + account.balance, 0)
            .toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            });
    };

    const getAccountsByType = (type: string) => {
        if (type === "all") return accounts;
        return accounts.filter((account) => account.type === type);
    };

    if (isLoading) {
        return <AccountsLoadingSkeleton />;
    }

    return (
        <div className="container mx-auto max-w-7xl px-4 py-8 space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Accounts</h1>
                    <p className="text-muted-foreground">
                        Manage your organization's financial accounts
                    </p>
                </div>
                {hasPermission("ACCOUNT_CREATE") && (
                    <CreateAccountForm
                        onSubmit={handleCreateAccount}
                        disableType={hasCashCounter}
                    />
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">₹{getTotalBalance()}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Active Accounts</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{accounts.length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Account Types</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {new Set(accounts.map((a) => a.type)).size}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="all" className="w-full">
                <TabsList className="grid grid-cols-3 md:grid-cols-6 mb-4">
                    {accountTypes.map((type) => (
                        <TabsTrigger key={type.id} value={type.id}>
                            {type.label}
                        </TabsTrigger>
                    ))}
                </TabsList>

                {accountTypes.map((type) => (
                    <TabsContent key={type.id} value={type.id} className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-semibold">{type.label}</h2>
                            <p className="text-sm text-muted-foreground">
                                Total: ₹{getTotalBalance(type.id)}
                            </p>
                        </div>

                        {getAccountsByType(type.id).length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {getAccountsByType(type.id).map((account) => (
                                    <AccountCard
                                        key={account.id}
                                        type={account.type}
                                        accountName={account.name}
                                        accountNumber={account.details?.accountNumber || ""}
                                        balance={account.balance}
                                        bankName={account.details?.bankName || ""}
                                        onClick={() => {}}
                                        isSelected={false}
                                    />
                                ))}
                            </div>
                        ) : (
                            <EmptyAccountState type={type.label} />
                        )}
                    </TabsContent>
                ))}
            </Tabs>
        </div>
    );
}

function AccountsLoadingSkeleton() {
    return (
        <div className="container mx-auto max-w-7xl px-4 py-8 space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <Skeleton className="h-10 w-[200px]" />
                    <Skeleton className="h-4 w-[300px] mt-2" />
                </div>
                <Skeleton className="h-10 w-[150px]" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                    <Card key={i}>
                        <CardHeader className="pb-2">
                            <Skeleton className="h-5 w-[120px]" />
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-8 w-[100px]" />
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <Skeleton key={i} className="h-[180px] w-full rounded-lg" />
                    ))}
                </div>
            </div>
        </div>
    );
}

function EmptyAccountState({ type }: { type: string }) {
    return (
        <Card className="w-full">
            <CardContent className="flex flex-col items-center justify-center py-10">
                <div className="rounded-full bg-muted p-3 mb-4">
                    <Plus className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium">No {type} Found</h3>
                <p className="text-sm text-muted-foreground text-center max-w-sm mt-1">
                    You haven't created any {type.toLowerCase()} yet. Click the "Add Account" button
                    to get started.
                </p>
            </CardContent>
        </Card>
    );
}
