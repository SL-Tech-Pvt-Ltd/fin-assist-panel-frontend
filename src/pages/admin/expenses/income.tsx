import { useState, useEffect } from "react";
import { Plus, Search, Filter, DollarSign, TrendingUp, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
// import { useRequirePermissions, usePermissions } from "@/hooks/use-permissions";
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
    ExpenseIncomeSummary,
    CreateExpenseIncomeData,
    TransactionCategory,
} from "@/data/expense-income-types";

export default function IncomePage() {
    // useRequirePermissions(["ACCOUNT_READ", "ACCOUNT_ADMIN"]);
    // const { hasPermission } = usePermissions();
    const { orgId } = useOrg();
    const [loading, setLoading] = useState(true);
    const [income, setIncome] = useState<ExpenseIncomeTransaction[]>([]);
    const [summary, setSummary] = useState<ExpenseIncomeSummary | null>(null);
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [selectedPeriod, setSelectedPeriod] = useState("month");
    const [searchTerm, setSearchTerm] = useState("");

    // Load income and summary
    useEffect(() => {
        if (orgId) {
            loadIncome();
            loadSummary();
        }
    }, [orgId, selectedPeriod]);

    const loadIncome = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/orgs/${orgId}/expenses-income`, {
                params: {
                    isExpense: false, // For income
                    page: 1,
                    limit: 100,
                },
            });
            setIncome(response.data.transactions || []);
        } catch (error) {
            console.error("Failed to load income:", error);
            toast({
                title: "Error",
                description: "Failed to load income",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const loadSummary = async () => {
        try {
            const endDate = new Date();
            const startDate = new Date();

            if (selectedPeriod === "month") {
                startDate.setMonth(startDate.getMonth() - 1);
            } else if (selectedPeriod === "quarter") {
                startDate.setMonth(startDate.getMonth() - 3);
            } else if (selectedPeriod === "year") {
                startDate.setFullYear(startDate.getFullYear() - 1);
            }

            const response = await api.get(`/orgs/${orgId}/expenses-income/summary`, {
                params: {
                    startDate: startDate.toISOString(),
                    endDate: endDate.toISOString(),
                },
            });
            setSummary(response.data);
        } catch (error) {
            console.error("Failed to load summary:", error);
        }
    };

    const handleAddIncome = async (data: CreateExpenseIncomeData) => {
        try {
            await api.post(`/orgs/${orgId}/expenses-income`, data);
            toast({
                title: "Success",
                description: "Income added successfully",
            });
            setShowAddDialog(false);
            loadIncome();
            loadSummary();
        } catch (error) {
            console.error("Failed to add income:", error);
            toast({
                title: "Error",
                description: "Failed to add income",
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

    const filteredIncome = income.filter(
        (inc) =>
            inc.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            formatCategory(inc.category).toLowerCase().includes(searchTerm.toLowerCase()) ||
            inc.tags.some((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const incomeColumns = [
        {
            header: "Date",
            accessorKey: "createdAt",
            cell: ({ row }: any) => {
                const date = new Date(row.original.createdAt);
                return date.toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                });
            },
        },
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
            header: "Amount",
            accessorKey: "amount",
            cell: ({ row }: any) => (
                <span className="font-medium text-green-600">
                    {formatCurrency(row.original.amount)}
                </span>
            ),
        },
        {
            header: "Account",
            accessorKey: "account",
            cell: ({ row }: any) => row.original.account?.name || "N/A",
        },
        {
            header: "Entity",
            accessorKey: "entity",
            cell: ({ row }: any) => row.original.entity?.name || "-",
        },
        {
            header: "Tags",
            accessorKey: "tags",
            cell: ({ row }: any) => (
                <div className="flex flex-wrap gap-1">
                    {row.original.tags.map((tag: string, index: number) => (
                        <Badge key={index} variant="outline" className="text-xs">
                            {tag}
                        </Badge>
                    ))}
                </div>
            ),
        },
        {
            header: "Recurring",
            accessorKey: "isRecurring",
            cell: ({ row }: any) =>
                row.original.isRecurring ? (
                    <Badge variant="secondary">Recurring</Badge>
                ) : (
                    <Badge variant="outline">One-time</Badge>
                ),
        },
    ];

    return (
        <div className="container mx-auto px-6 py-8 max-w-7xl">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Income Management</h1>
                    <p className="text-gray-600">Track and manage your business income</p>
                </div>
                <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Income
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Add New Income</DialogTitle>
                            <DialogDescription>Create a new income transaction</DialogDescription>
                        </DialogHeader>
                        <ExpenseIncomeForm
                            isExpense={false}
                            onSubmit={handleAddIncome}
                            onCancel={() => setShowAddDialog(false)}
                        />
                    </DialogContent>
                </Dialog>
            </div>

            {summary && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Income</CardTitle>
                            <TrendingUp className="h-4 w-4 text-green-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-600">
                                {formatCurrency(summary.totalIncome)}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                            <TrendingDown className="h-4 w-4 text-red-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-red-600">
                                {formatCurrency(summary.totalExpenses)}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Net Amount</CardTitle>
                            <DollarSign className="h-4 w-4 text-blue-500" />
                        </CardHeader>
                        <CardContent>
                            <div
                                className={`text-2xl font-bold ${
                                    summary.netAmount >= 0 ? "text-green-600" : "text-red-600"
                                }`}
                            >
                                {formatCurrency(Math.abs(summary.netAmount))}
                            </div>
                            <p className="text-xs text-gray-500">
                                {summary.netAmount >= 0 ? "Profit" : "Loss"}
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Income Categories</CardTitle>
                            <Filter className="h-4 w-4 text-gray-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {summary.byCategory.filter((cat) => !cat.isExpense).length}
                            </div>
                            <p className="text-xs text-gray-500">Active categories</p>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Filters and Search */}
            <div className="flex gap-4 mb-6">
                <div className="flex-1">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                            placeholder="Search income..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant={selectedPeriod === "month" ? "default" : "outline"}
                        onClick={() => setSelectedPeriod("month")}
                    >
                        Last Month
                    </Button>
                    <Button
                        variant={selectedPeriod === "quarter" ? "default" : "outline"}
                        onClick={() => setSelectedPeriod("quarter")}
                    >
                        Last Quarter
                    </Button>
                    <Button
                        variant={selectedPeriod === "year" ? "default" : "outline"}
                        onClick={() => setSelectedPeriod("year")}
                    >
                        Last Year
                    </Button>
                </div>
            </div>

            {/* Income Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Recent Income</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                    ) : (
                        <TableComponent
                            columns={incomeColumns}
                            data={filteredIncome}
                            allowSearch={false}
                            allowPagination={true}
                            showFooter={true}
                        />
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
