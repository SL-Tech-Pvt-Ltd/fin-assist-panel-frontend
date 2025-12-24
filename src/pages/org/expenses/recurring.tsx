import { useState, useEffect } from "react";
import { Plus, Calendar, Play, Pause, Trash2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRequirePermissions, usePermissions } from "@/hooks/use-permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { TableComponent } from "@/components/modules/Table";
import { useOrg } from "@/providers/org-provider";
import { api } from "@/utils/api";
import { toast } from "@/hooks/use-toast";
import ExpenseIncomeForm from "@/components/forms/ExpenseIncomeForm";
import {
    ExpenseIncomeTransaction,
    CreateExpenseIncomeData,
    TransactionCategory,
    RecurrenceType,
} from "@/data/expense-income-types";

export default function RecurringTransactionsPage() {
    useRequirePermissions(["EXPENSE_READ"]);
    const { hasPermission } = usePermissions();
    const { orgId } = useOrg();
    const [loading, setLoading] = useState(true);
    const [recurringTransactions, setRecurringTransactions] = useState<ExpenseIncomeTransaction[]>(
        []
    );
    const [showAddDialog, setShowAddDialog] = useState(false);

    // Load recurring transactions
    useEffect(() => {
        if (orgId) {
            loadRecurringTransactions();
        }
    }, [orgId]);

    const loadRecurringTransactions = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/orgs/${orgId}/expenses-income`, {
                params: {
                    isRecurring: true,
                    page: 1,
                    limit: 100,
                },
            });
            setRecurringTransactions(response.data.transactions || []);
        } catch (error) {
            console.error("Failed to load recurring transactions:", error);
            toast({
                title: "Error",
                description: "Failed to load recurring transactions",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleAddRecurringTransaction = async (data: CreateExpenseIncomeData) => {
        try {
            await api.post(`/orgs/${orgId}/expenses-income`, {
                ...data,
                isRecurring: true,
            });
            toast({
                title: "Success",
                description: "Recurring transaction added successfully",
            });
            setShowAddDialog(false);
            loadRecurringTransactions();
        } catch (error) {
            console.error("Failed to add recurring transaction:", error);
            toast({
                title: "Error",
                description: "Failed to add recurring transaction",
                variant: "destructive",
            });
        }
    };

    const toggleRecurringStatus = async (transactionId: string, isActive: boolean) => {
        try {
            await api.put(`/orgs/${orgId}/expenses-income/${transactionId}`, {
                isActive: !isActive,
            });
            toast({
                title: "Success",
                description: `Recurring transaction ${!isActive ? "activated" : "paused"}`,
            });
            loadRecurringTransactions();
        } catch (error) {
            console.error("Failed to update recurring transaction:", error);
            toast({
                title: "Error",
                description: "Failed to update recurring transaction",
                variant: "destructive",
            });
        }
    };

    const deleteRecurringTransaction = async (transactionId: string) => {
        if (!confirm("Are you sure you want to delete this recurring transaction?")) {
            return;
        }

        try {
            await api.delete(`/orgs/${orgId}/expenses-income/${transactionId}`);
            toast({
                title: "Success",
                description: "Recurring transaction deleted successfully",
            });
            loadRecurringTransactions();
        } catch (error) {
            console.error("Failed to delete recurring transaction:", error);
            toast({
                title: "Error",
                description: "Failed to delete recurring transaction",
                variant: "destructive",
            });
        }
    };

    const formatCurrency = (amount: number) => {
        return `Rs ${amount.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        })}`;
    };

    const formatCategory = (category: TransactionCategory) => {
        return category.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
    };

    const formatRecurrenceType = (type: RecurrenceType) => {
        return type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
    };

    const getNextExecutionDate = (transaction: ExpenseIncomeTransaction) => {
        if (!transaction.createdAt || !transaction.recurrenceType) {
            return "Not scheduled";
        }

        const lastExecuted = new Date(transaction.createdAt);
        let nextDate = new Date(lastExecuted);

        switch (transaction.recurrenceType) {
            case "DAILY":
                nextDate.setDate(lastExecuted.getDate() + 1);
                break;
            case "WEEKLY":
                nextDate.setDate(lastExecuted.getDate() + 7);
                break;
            case "MONTHLY":
                nextDate.setMonth(lastExecuted.getMonth() + 1);
                break;
            case "QUARTERLY":
                nextDate.setMonth(lastExecuted.getMonth() + 3);
                break;
            case "YEARLY":
                nextDate.setFullYear(lastExecuted.getFullYear() + 1);
                break;
            default:
                return "Unknown";
        }

        return nextDate.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    };

    const recurringColumns = [
        {
            header: "Description",
            accessorKey: "description",
            cell: ({ row }: any) => (
                <div>
                    <div className="font-medium">{row.original.description}</div>
                    <div className="text-sm text-gray-500">
                        {formatCategory(row.original.category)}
                    </div>
                </div>
            ),
        },
        {
            header: "Type",
            accessorKey: "isExpense",
            cell: ({ row }: any) => (
                <Badge variant={row.original.isExpense ? "destructive" : "default"}>
                    {row.original.isExpense ? "Expense" : "Income"}
                </Badge>
            ),
        },
        {
            header: "Amount",
            accessorKey: "amount",
            cell: ({ row }: any) => (
                <span
                    className={`font-medium ${
                        row.original.isExpense ? "text-red-600" : "text-green-600"
                    }`}
                >
                    {formatCurrency(row.original.amount)}
                </span>
            ),
        },
        {
            header: "Frequency",
            accessorKey: "recurrenceType",
            cell: ({ row }: any) => (
                <div>
                    <div className="font-medium">
                        {formatRecurrenceType(row.original.recurrenceType)}
                    </div>
                    {row.original.recurrenceEndDate && (
                        <div className="text-sm text-gray-500">
                            Until: {new Date(row.original.recurrenceEndDate).toLocaleDateString()}
                        </div>
                    )}
                </div>
            ),
        },
        {
            header: "Next Execution",
            accessorKey: "nextExecution",
            cell: ({ row }: any) => (
                <div className="text-sm">{getNextExecutionDate(row.original)}</div>
            ),
        },
        {
            header: "Status",
            accessorKey: "isRecurring",
            cell: ({ row }: any) => (
                <Badge variant={row.original.isRecurring ? "default" : "secondary"}>
                    {row.original.isRecurring ? "Active" : "Paused"}
                </Badge>
            ),
        },
        {
            header: "Actions",
            accessorKey: "actions",
            cell: ({ row }: any) => (
                <div className="flex gap-2">
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                            toggleRecurringStatus(row.original.id, row.original.isRecurring)
                        }
                    >
                        {row.original.isRecurring ? (
                            <Pause className="h-4 w-4" />
                        ) : (
                            <Play className="h-4 w-4" />
                        )}
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteRecurringTransaction(row.original.id)}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            ),
        },
    ];

    const activeRecurring = recurringTransactions.filter((t) => t.isRecurring);
    const pausedRecurring = recurringTransactions.filter((t) => !t.isRecurring);

    return (
        <div className="container mx-auto px-6 py-8 max-w-7xl">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Recurring Transactions</h1>
                    <p className="text-gray-600">
                        Manage your automatic income and expense transactions
                    </p>
                </div>
                {hasPermission("EXPENSE_CREATE") && (
                    <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="h-4 w-4 mr-2" />
                                Add Recurring Transaction
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>Add New Recurring Transaction</DialogTitle>
                                <DialogDescription>
                                    Create a new recurring income or expense transaction
                                </DialogDescription>
                            </DialogHeader>
                            <ExpenseIncomeForm
                                isExpense={true}
                                onSubmit={handleAddRecurringTransaction}
                                onCancel={() => setShowAddDialog(false)}
                            />
                        </DialogContent>
                    </Dialog>
                )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Recurring</CardTitle>
                        <RefreshCw className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{recurringTransactions.length}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active</CardTitle>
                        <Play className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                            {activeRecurring.length}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Paused</CardTitle>
                        <Pause className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-600">
                            {pausedRecurring.length}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Next Due</CardTitle>
                        <Calendar className="h-4 w-4 text-purple-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {
                                activeRecurring.filter((t) => {
                                    const nextDate = getNextExecutionDate(t);
                                    return (
                                        nextDate !== "Not scheduled" &&
                                        new Date(nextDate) <=
                                            new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                                    );
                                }).length
                            }
                        </div>
                        <p className="text-xs text-gray-500">Within 7 days</p>
                    </CardContent>
                </Card>
            </div>

            {/* Recurring Transactions Table */}
            <Card>
                <CardHeader>
                    <CardTitle>All Recurring Transactions</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                    ) : (
                        <TableComponent
                            columns={recurringColumns}
                            data={recurringTransactions}
                            allowSearch={true}
                            allowPagination={true}
                            showFooter={true}
                        />
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
