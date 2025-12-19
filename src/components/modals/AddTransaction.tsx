"use client";

import type React from "react";

import { useState, useEffect } from "react";
import { PlusCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useOrg } from "@/providers/org-provider";
import { api } from "@/utils/api";
import { Account, TransactionDetails, Entity } from "@/data/types";
import { TransactionCategory } from "@/data/expense-income-types";

// Category options based on transaction type
const EXPENSE_CATEGORIES: { value: TransactionCategory; label: string }[] = [
    { value: "OFFICE_RENT", label: "Office Rent" },
    { value: "EMPLOYEE_SALARY", label: "Employee Salary" },
    { value: "UTILITY_BILLS", label: "Utility Bills" },
    { value: "OFFICE_SUPPLIES", label: "Office Supplies" },
    { value: "TRAVEL_EXPENSE", label: "Travel Expense" },
    { value: "MARKETING_ADVERTISING", label: "Marketing & Advertising" },
    { value: "PROFESSIONAL_FEES", label: "Professional Fees" },
    { value: "EQUIPMENT_MAINTENANCE", label: "Equipment Maintenance" },
    { value: "INSURANCE", label: "Insurance" },
    { value: "TAXES", label: "Taxes" },
    { value: "DONATIONS_GIVEN", label: "Donations Given" },
    { value: "INTEREST_PAID", label: "Interest Paid" },
    { value: "DEPRECIATION", label: "Depreciation" },
    { value: "MISCELLANEOUS_EXPENSE", label: "Miscellaneous Expense" },
];

const INCOME_CATEGORIES: { value: TransactionCategory; label: string }[] = [
    { value: "SERVICE_INCOME", label: "Service Income" },
    { value: "CONSULTING_INCOME", label: "Consulting Income" },
    { value: "RENTAL_INCOME", label: "Rental Income" },
    { value: "INTEREST_RECEIVED", label: "Interest Received" },
    { value: "DONATIONS_RECEIVED", label: "Donations Received" },
    { value: "COMMISSION_INCOME", label: "Commission Income" },
    { value: "DIVIDEND_INCOME", label: "Dividend Income" },
    { value: "CAPITAL_GAINS", label: "Capital Gains" },
    { value: "MISCELLANEOUS_INCOME", label: "Miscellaneous Income" },
];

interface AddTransactionProps {
    account: Account | null;
    accounts: Account[];
    onAddTransaction: (
        amount: number,
        description: string,
        type: "BUY" | "SELL" | "MISC" | "TRANSFER",
        details: object,
        transferAccountId: string | null,
        charge: number | null,
        createdAt?: string
    ) => Promise<void>;
}

export function AddTransactionDialog({ account, onAddTransaction, accounts }: AddTransactionProps) {
    const { orgId } = useOrg();
    const [open, setOpen] = useState(false);
    const [amount, setAmount] = useState("");
    const [description, setDescription] = useState("");
    const [type, setType] = useState<"BUY" | "SELL" | "MISC" | "TRANSFER">("BUY");
    const [category, setCategory] = useState<TransactionCategory | "">("");
    const [entityId, setEntityId] = useState<string>("");
    const [transferAccountId, setTransferAccountId] = useState<string | null>(null);
    const [charge, setCharge] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [details, setDetails] = useState<TransactionDetails>({});
    const [entities, setEntities] = useState<Entity[]>([]);
    const [transactionDate, setTransactionDate] = useState<string>(
        new Date().toISOString().split("T")[0]
    );
    const [currentTime] = useState<string>(new Date().toISOString());

    const { toast } = useToast();

    // Load entities when component mounts
    useEffect(() => {
        const loadEntities = async () => {
            if (orgId) {
                try {
                    const response = await api.get(`/orgs/${orgId}/entities`);
                    setEntities(response.data || []);
                } catch (error) {
                    console.error("Failed to load entities:", error);
                }
            }
        };
        loadEntities();
    }, [orgId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!account) return;

        if (!amount) {
            toast({
                title: "Error",
                description: "Please fill in amount and description",
                variant: "destructive",
            });
            return;
        }

        const numericAmount = Number.parseFloat(amount);

        if (isNaN(numericAmount)) {
            toast({
                title: "Error",
                description: "Please enter a valid amount",
                variant: "destructive",
            });
            return;
        }

        // Prevent credit transactions from exceeding account balance
        if (type === "BUY" && account && numericAmount > account.balance) {
            toast({
                title: "Error",
                description: `Credit amount cannot exceed account balance of ${formatCurrency(
                    account.balance
                )}`,
                variant: "destructive",
            });
            return;
        }
        if (type === "TRANSFER" && numericAmount + (charge || 0) > account?.balance) {
            toast({
                title: "Error",
                description: `Transfer amount cannot exceed account balance of ${formatCurrency(
                    account.balance
                )}`,
                variant: "destructive",
            });
            return;
        }

        setIsLoading(true);

        try {
            // Convert date to ISO datetime format, preserving current time
            const createdAtISO = transactionDate
                ? (() => {
                      const selectedDate = new Date(transactionDate);
                      const currentDateTime = new Date(currentTime);
                      selectedDate.setHours(currentDateTime.getHours());
                      selectedDate.setMinutes(currentDateTime.getMinutes());
                      selectedDate.setSeconds(currentDateTime.getSeconds());
                      selectedDate.setMilliseconds(currentDateTime.getMilliseconds());
                      return selectedDate.toISOString();
                  })()
                : new Date().toISOString();

            // Add the regular account transaction
            await onAddTransaction(
                numericAmount,
                description,
                type,
                details || {},
                transferAccountId,
                charge,
                createdAtISO
            );

            // If this is an expense or income transaction, also create an expense/income record
            if (type !== "MISC" && category && orgId && account) {
                const expenseIncomeData = {
                    amount: numericAmount,
                    description,
                    category: category as TransactionCategory,
                    isExpense: type === "BUY", // BUY = expense (money going out), SELL = income (money coming in)
                    accountId: account.id,
                    entityId: entityId || undefined,
                    tags: [],
                    notes: `Account transaction: ${type}`,
                    isRecurring: false,
                };

                try {
                    await api.post(`/orgs/${orgId}/expenses-income`, expenseIncomeData);
                } catch (expenseIncomeError) {
                    console.error("Failed to create expense/income record:", expenseIncomeError);
                    // Don't fail the whole transaction if expense/income creation fails
                }
            }

            toast({
                title: "Success",
                description: "Transaction added successfully",
            });
            setOpen(false);
            setAmount("");
            setDescription("");
            setCategory("");
            setEntityId("");
            setTransactionDate(new Date().toISOString().split("T")[0]);
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to add transaction",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const formatCurrency = (value: number) => {
        return `Rs ${value.toFixed(2)}`;
    };

    if (!account) {
        return null; // or handle the case when account is null
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="py-0">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Transaction
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Add Transaction</DialogTitle>
                    <DialogDescription>Add a new transaction to your account.</DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <Card className="bg-muted/50">
                        <CardContent className="pt-6">
                            <div className="grid gap-2">
                                <div className="flex justify-between">
                                    <span className="text-sm font-medium text-muted-foreground">
                                        Account
                                    </span>
                                    <span className="text-sm font-semibold">{account.name}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm font-medium text-muted-foreground">
                                        Type
                                    </span>
                                    <span className="text-sm">{account.type}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm font-medium text-muted-foreground">
                                        Current Balance
                                    </span>
                                    <span
                                        className={cn(
                                            "text-sm font-semibold",
                                            account.balance > 0
                                                ? "text-green-600"
                                                : account.balance < 0
                                                ? "text-red-600"
                                                : ""
                                        )}
                                    >
                                        {formatCurrency(account.balance)}
                                    </span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="amount">Amount</Label>
                            <Input
                                id="amount"
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                placeholder="Enter transaction details"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="transactionDate">Transaction Date (Optional)</Label>
                            <Input
                                id="transactionDate"
                                type="date"
                                value={transactionDate}
                                onChange={(e) => setTransactionDate(e.target.value)}
                            />
                        </div>
                        <div className="grid gap-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="type">Transaction Type</Label>
                                <div className="flex items-center space-x-2">
                                    <Label
                                        htmlFor="debit"
                                        className={cn(
                                            "cursor-pointer rounded-md px-3 py-1 text-sm",
                                            type === "SELL"
                                                ? "bg-primary text-primary-foreground"
                                                : "bg-muted"
                                        )}
                                        onClick={() => setType("SELL")}
                                    >
                                        Income (Credit)
                                    </Label>
                                    <Label
                                        htmlFor="credit"
                                        className={cn(
                                            "cursor-pointer rounded-md px-3 py-1 text-sm",
                                            type === "BUY"
                                                ? "bg-primary text-primary-foreground"
                                                : "bg-muted"
                                        )}
                                        onClick={() => setType("BUY")}
                                    >
                                        Expense (Debit)
                                    </Label>
                                    <Label
                                        htmlFor="transfer"
                                        className={cn(
                                            "cursor-pointer rounded-md px-3 py-1 text-sm",
                                            type === "TRANSFER"
                                                ? "bg-primary text-primary-foreground"
                                                : "bg-muted"
                                        )}
                                        onClick={() => setType("TRANSFER")}
                                    >
                                        Transfer
                                    </Label>
                                </div>
                            </div>
                        </div>

                        {/* Category Selection - only show for expense/income transactions */}
                        {type !== "MISC" && type !== "TRANSFER" && (
                            <div className="grid gap-2">
                                <Label htmlFor="category">Category</Label>
                                <Select
                                    value={category}
                                    onValueChange={(value: string) =>
                                        setCategory(value as TransactionCategory)
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue
                                            placeholder={`Select ${
                                                type === "BUY" ? "expense" : "income"
                                            } category`}
                                        />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {(type === "BUY"
                                            ? EXPENSE_CATEGORIES
                                            : INCOME_CATEGORIES
                                        ).map((cat) => (
                                            <SelectItem key={cat.value} value={cat.value}>
                                                {cat.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {type === "TRANSFER" && (
                            <div className="grid gap-2">
                                <Label htmlFor="transferFrom">Transfer To</Label>
                                <Select
                                    value={transferAccountId || ""}
                                    onValueChange={(value: string) => setTransferAccountId(value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select account" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {accounts
                                            .filter((acc) => account.id !== acc.id)
                                            .map((account) => (
                                                <SelectItem key={account.id} value={account.id}>
                                                    {account.name} - {account.type}
                                                </SelectItem>
                                            ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                        {/* charge */}
                        {type === "TRANSFER" && (
                            <div className="grid gap-2">
                                <Label htmlFor="transferCharge">Transfer Charge</Label>
                                <Input
                                    id="transferCharge"
                                    name="transferCharge"
                                    placeholder="Enter transfer charge"
                                    value={charge || ""}
                                    onChange={(e) => setCharge(parseFloat(e.target.value))}
                                />
                            </div>
                        )}

                        {/* Entity Selection - only show for expense/income transactions */}
                        {type !== "MISC" && type !== "TRANSFER" && (
                            <div className="grid gap-2">
                                <Label htmlFor="entity">Entity (Optional)</Label>
                                <Select
                                    value={entityId}
                                    onValueChange={(value: string) => setEntityId(value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select entity" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {entities.map((entity) => (
                                            <SelectItem key={entity.id} value={entity.id}>
                                                {entity.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>
                    {account.type === "CHEQUE" && (
                        <>
                            <div className="grid gap-2 py-4">
                                <Label htmlFor="details">Cheque Issuer</Label>
                                <Input
                                    id="chequeIssuer"
                                    name="chequeIssuer"
                                    placeholder="Enter cheque issuer name"
                                    value={details?.chequeIssuer || ""}
                                    onChange={(e) =>
                                        setDetails({
                                            ...details,
                                            chequeIssuer: e.target.value,
                                        })
                                    }
                                />
                            </div>
                            <div className="grid gap-2 py-4">
                                <Label htmlFor="details">Cheque Issuer Bank</Label>
                                <Input
                                    id="chequeIssuerBank"
                                    name="chequeIssuerBank"
                                    placeholder="Enter cheque issuer bank name"
                                    value={details?.chequeIssuerBank || ""}
                                    onChange={(e) =>
                                        setDetails({
                                            ...details,
                                            chequeIssuerBank: e.target.value,
                                        })
                                    }
                                />
                            </div>
                            <div className="grid gap-2 py-4">
                                <Label htmlFor="details">Cheque Number</Label>
                                <Input
                                    id="chequeNumber"
                                    name="chequeNumber"
                                    placeholder="Enter cheque number"
                                    value={details?.chequeNumber || ""}
                                    onChange={(e) =>
                                        setDetails({
                                            ...details,
                                            chequeNumber: e.target.value,
                                        })
                                    }
                                />
                            </div>
                            <div className="grid gap-2 py-4">
                                <Label htmlFor="details">Cheque Date</Label>
                                <Input
                                    id="chequeDate"
                                    name="chequeDate"
                                    type="date"
                                    placeholder="Enter cheque date"
                                    value={details?.chequeDate || ""}
                                    onChange={(e) =>
                                        setDetails({
                                            ...details,
                                            chequeDate: e.target.value,
                                        })
                                    }
                                />
                            </div>
                        </>
                    )}
                    <DialogFooter>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? "Adding..." : "Add Transaction"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
