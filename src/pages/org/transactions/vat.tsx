import { Order } from "@/data/types";
import { useEffect, useState, useMemo } from "react";
import { api } from "@/utils/api";
import { useOrg } from "@/providers/org-provider";
import { TableComponent } from "@/components/modules/Table";
import { useRequirePermissions } from "@/hooks/use-permissions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ColumnDef } from "@tanstack/react-table";

interface VATEntry {
    id: string;
    orderNumber: string;
    type: "BUY" | "SELL" | "MISC";
    entityName: string;
    vatAmount: number;
    baseAmount: number;
    totalAmount: number;
    vatLabel: string;
    paymentStatus: string;
    createdAt: string;
    debitAmount: number;
    creditAmount: number;
    description: string;
}

export default function VATPage() {
    useRequirePermissions(["ORDER_READ"]);
    const { orgId } = useOrg();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("all");

    useEffect(() => {
        api.get(`orgs/${orgId}/orders`).then((data) => {
            setOrders(data.data);
            setLoading(false);
        });
    }, [orgId]);

    // Extract VAT entries from orders
    const vatEntries = useMemo(() => {
        const entries: VATEntry[] = [];

        orders.forEach((order) => {
            if (order.charges) {
                order.charges.forEach((charge) => {
                    // Check for VAT (case insensitive) and non-zero amount
                    if (charge.label.toLowerCase().includes("vat") && charge.amount !== 0) {
                        // For professional ledger:
                        // BUY orders = VAT Buy (Debit) - VAT we paid on purchases
                        // SELL orders = VAT Sell (Credit) - VAT we collected on sales
                        const isDebit = order.type === "BUY";
                        const debitAmount = isDebit ? Math.abs(charge.amount) : 0;
                        const creditAmount = !isDebit ? Math.abs(charge.amount) : 0;

                        entries.push({
                            id: `${order.id}-${charge.id}`,
                            orderNumber: order.orderNumber,
                            type: order.type,
                            entityName: order.entity?.name || "N/A",
                            vatAmount: charge.amount,
                            baseAmount: order.baseAmount,
                            totalAmount: order.totalAmount,
                            vatLabel: charge.label,
                            paymentStatus: order.paymentStatus,
                            createdAt: order.createdAt,
                            debitAmount,
                            creditAmount,
                            description: `${charge.label} - ${
                                order.type === "BUY" ? "Purchase from" : "Sale to"
                            } ${order.entity?.name || "Unknown"}`,
                        });
                    }
                });
            }
        });

        return entries.sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
    }, [orders]);

    // Filter entries based on active tab
    const filteredEntries = useMemo(() => {
        switch (activeTab) {
            case "buy":
                return vatEntries.filter((entry) => entry.type === "BUY");
            case "sell":
                return vatEntries.filter((entry) => entry.type === "SELL");
            default:
                return vatEntries;
        }
    }, [vatEntries, activeTab]);

    // Calculate statistics
    const stats = useMemo(() => {
        const totalDebits = vatEntries.reduce((sum, entry) => sum + entry.debitAmount, 0);
        const totalCredits = vatEntries.reduce((sum, entry) => sum + entry.creditAmount, 0);
        const balance = totalCredits - totalDebits; // Net VAT position

        const buyVat = vatEntries
            .filter((entry) => entry.type === "BUY")
            .reduce((sum, entry) => sum + entry.debitAmount, 0);

        const sellVat = vatEntries
            .filter((entry) => entry.type === "SELL")
            .reduce((sum, entry) => sum + entry.creditAmount, 0);

        return {
            totalDebits,
            totalCredits,
            balance,
            buyVat,
            sellVat,
            entriesCount: vatEntries.length,
        };
    }, [vatEntries]);

    // Table columns - Professional Ledger Format
    const columns: ColumnDef<VATEntry>[] = [
        {
            accessorKey: "createdAt",
            header: "Date",
            cell: ({ row }) => {
                const date = new Date(row.getValue("createdAt"));
                return (
                    <div className="font-mono text-sm">
                        {date.toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                        })}
                    </div>
                );
            },
            enableSorting: true,
        },
        {
            accessorKey: "orderNumber",
            header: "Voucher No.",
            cell: ({ row }) => (
                <div className="font-mono text-sm font-medium">{row.getValue("orderNumber")}</div>
            ),
            enableSorting: false,
        },
        {
            accessorKey: "description",
            header: "Particulars",
            cell: ({ row }) => (
                <div className="max-w-xs">
                    <div className="text-sm font-medium">{row.getValue("description")}</div>
                    <div className="text-xs text-gray-500 mt-1">
                        Base: ₹{parseFloat(row.getValue("baseAmount")).toFixed(2)}
                    </div>
                </div>
            ),
            enableSorting: false,
        },
        {
            accessorKey: "type",
            header: "Type",
            cell: ({ row }) => {
                const type = row.getValue("type") as string;
                return (
                    <Badge
                        variant={
                            type === "BUY"
                                ? "destructive"
                                : type === "SELL"
                                ? "default"
                                : "secondary"
                        }
                    >
                        {type === "BUY" ? "Buy" : type === "SELL" ? "Sell" : type}
                    </Badge>
                );
            },
            enableSorting: false,
        },
        {
            accessorKey: "debitAmount",
            header: () => (
                <div className="text-right">
                    <div className="font-semibold">Debit (Dr.)</div>
                    <div className="text-xs text-gray-500">VAT Buy</div>
                </div>
            ),
            cell: ({ row }) => {
                const amount = parseFloat(row.getValue("debitAmount"));
                return (
                    <div className="text-right font-mono">
                        {amount > 0 ? (
                            <span className="text-red-600 font-medium">₹{amount.toFixed(2)}</span>
                        ) : (
                            <span className="text-gray-300">-</span>
                        )}
                    </div>
                );
            },
            enableSorting: false,
        },
        {
            accessorKey: "creditAmount",
            header: () => (
                <div className="text-right">
                    <div className="font-semibold">Credit (Cr.)</div>
                    <div className="text-xs text-gray-500">VAT Sell</div>
                </div>
            ),
            cell: ({ row }) => {
                const amount = parseFloat(row.getValue("creditAmount"));
                return (
                    <div className="text-right font-mono">
                        {amount > 0 ? (
                            <span className="text-green-600 font-medium">₹{amount.toFixed(2)}</span>
                        ) : (
                            <span className="text-gray-300">-</span>
                        )}
                    </div>
                );
            },
            enableSorting: false,
        },
        {
            accessorKey: "paymentStatus",
            header: "Status",
            cell: ({ row }) => {
                const status = row.getValue("paymentStatus") as string;
                const getStatusColor = (status: string) => {
                    switch (status) {
                        case "PAID":
                            return "bg-green-100 text-green-800 border-green-200";
                        case "PENDING":
                            return "bg-yellow-100 text-yellow-800 border-yellow-200";
                        case "FAILED":
                            return "bg-red-100 text-red-800 border-red-200";
                        case "PARTIAL":
                            return "bg-blue-100 text-blue-800 border-blue-200";
                        default:
                            return "bg-gray-100 text-gray-800 border-gray-200";
                    }
                };
                return (
                    <span
                        className={`px-2 py-1 rounded-md text-xs font-medium border ${getStatusColor(
                            status
                        )}`}
                    >
                        {status}
                    </span>
                );
            },
            enableSorting: false,
        },
    ];

    if (loading) {
        return (
            <section className="container mx-auto px-6 py-8 max-w-7xl">
                {/* Header Skeleton */}
                <div className="mb-8">
                    <div className="h-8 bg-gray-200 rounded-lg w-48 mb-2 animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded-lg w-96 animate-pulse"></div>
                </div>

                {/* Statistics Cards Skeleton */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    {[...Array(4)].map((_, index) => (
                        <div
                            key={index}
                            className="border-2 border-gray-100 rounded-xl p-6 animate-pulse"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="h-4 bg-gray-200 rounded w-24"></div>
                                <div className="h-4 w-4 bg-gray-200 rounded"></div>
                            </div>
                            <div className="h-8 bg-gray-200 rounded w-20 mb-2"></div>
                            <div className="h-3 bg-gray-200 rounded w-16"></div>
                        </div>
                    ))}
                </div>

                {/* Ledger Summary Skeleton */}
                <div className="mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl animate-pulse">
                    <div className="p-6 border-b">
                        <div className="flex items-center gap-2">
                            <div className="h-5 w-5 bg-gray-200 rounded"></div>
                            <div className="h-6 bg-gray-200 rounded w-32"></div>
                        </div>
                    </div>
                    <div className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {[...Array(3)].map((_, index) => (
                                <div key={index} className="bg-white p-4 rounded-lg border">
                                    <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                                    <div className="h-5 bg-gray-200 rounded w-16"></div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Table Skeleton */}
                <div className="border-2 border-gray-200 rounded-xl animate-pulse">
                    {/* Table Header */}
                    <div className="bg-gray-50 border-b p-6">
                        <div className="flex items-center gap-2">
                            <div className="h-5 w-5 bg-gray-200 rounded"></div>
                            <div className="h-6 bg-gray-200 rounded w-40"></div>
                        </div>
                    </div>

                    <div className="p-6">
                        {/* Tabs Skeleton */}
                        <div className="mb-6">
                            <div className="grid grid-cols-3 gap-2 bg-gray-100 p-1 rounded-lg">
                                {[...Array(3)].map((_, index) => (
                                    <div key={index} className="h-8 bg-gray-200 rounded"></div>
                                ))}
                            </div>
                        </div>

                        {/* Table Content Skeleton */}
                        <div className="border rounded-lg overflow-hidden">
                            {/* Table Header Row */}
                            <div className="bg-gray-50 border-b p-4">
                                <div className="grid grid-cols-7 gap-4">
                                    <div className="h-4 bg-gray-200 rounded"></div>
                                    <div className="h-4 bg-gray-200 rounded"></div>
                                    <div className="h-4 bg-gray-200 rounded"></div>
                                    <div className="h-4 bg-gray-200 rounded"></div>
                                    <div className="h-4 bg-gray-200 rounded"></div>
                                    <div className="h-4 bg-gray-200 rounded"></div>
                                    <div className="h-4 bg-gray-200 rounded"></div>
                                </div>
                            </div>

                            {/* Table Rows Skeleton */}
                            {[...Array(8)].map((_, rowIndex) => (
                                <div key={rowIndex} className="border-b p-4">
                                    <div className="grid grid-cols-7 gap-4 items-center">
                                        <div className="h-4 bg-gray-200 rounded"></div>
                                        <div className="h-4 bg-gray-200 rounded w-20"></div>
                                        <div>
                                            <div className="h-4 bg-gray-200 rounded mb-1"></div>
                                            <div className="h-3 bg-gray-200 rounded w-16"></div>
                                        </div>
                                        <div className="h-6 bg-gray-200 rounded w-12"></div>
                                        <div className="text-right">
                                            <div className="h-4 bg-gray-200 rounded w-16 ml-auto"></div>
                                        </div>
                                        <div className="text-right">
                                            <div className="h-4 bg-gray-200 rounded w-16 ml-auto"></div>
                                        </div>
                                        <div className="h-6 bg-gray-200 rounded w-16"></div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Table Footer Skeleton */}
                        <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
                            <div className="flex justify-between items-center">
                                <div className="h-4 bg-gray-200 rounded w-24"></div>
                                <div className="flex gap-8">
                                    <div className="h-4 bg-gray-200 rounded w-24"></div>
                                    <div className="h-4 bg-gray-200 rounded w-24"></div>
                                    <div className="h-4 bg-gray-200 rounded w-32"></div>
                                </div>
                            </div>
                        </div>

                        {/* Pagination Skeleton */}
                        <div className="mt-4 flex justify-between items-center">
                            <div className="h-4 bg-gray-200 rounded w-32"></div>
                            <div className="flex gap-2">
                                {[...Array(5)].map((_, index) => (
                                    <div key={index} className="h-8 w-8 bg-gray-200 rounded"></div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Loading Text with Animation */}
                <div className="fixed bottom-8 right-8">
                    <div className="bg-white shadow-lg rounded-lg p-4 border flex items-center gap-3">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                        <span className="text-sm font-medium text-gray-700">
                            Loading VAT data...
                        </span>
                    </div>
                </div>
            </section>
        );
    }

    return (
        <section className="container mx-auto px-6 py-8 max-w-7xl">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">VAT Ledger</h1>
                <p className="text-gray-600">
                    Professional VAT Account Ledger - Buy vs Sell VAT Analysis
                </p>
            </div>

            {/* Professional Ledger Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <Card className="border-2 border-green-100">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-green-700">
                            Total Debits (Dr.)
                        </CardTitle>
                        <div className="text-green-600">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path
                                    fillRule="evenodd"
                                    d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
                                    clipRule="evenodd"
                                />
                            </svg>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                            ₹{stats.totalDebits.toFixed(2)}
                        </div>
                        <p className="text-xs text-muted-foreground">VAT Buy (Purchases)</p>
                    </CardContent>
                </Card>

                <Card className="border-2 border-red-100">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-red-700">
                            Total Credits (Cr.)
                        </CardTitle>
                        <div className="text-red-600">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path
                                    fillRule="evenodd"
                                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                    clipRule="evenodd"
                                />
                            </svg>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">
                            ₹{stats.totalCredits.toFixed(2)}
                        </div>
                        <p className="text-xs text-muted-foreground">VAT Sell (Sales)</p>
                    </CardContent>
                </Card>

                <Card className="border-2 border-blue-100">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-blue-700">
                            Net Balance
                        </CardTitle>
                        <div className="text-blue-600">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path
                                    fillRule="evenodd"
                                    d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z"
                                    clipRule="evenodd"
                                />
                            </svg>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div
                            className={`text-2xl font-bold ${
                                stats.balance >= 0 ? "text-green-600" : "text-red-600"
                            }`}
                        >
                            ₹{stats.balance.toFixed(2)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {stats.balance >= 0 ? "VAT Payable" : "VAT Refundable"}
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-2 border-purple-100">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-purple-700">
                            Total Entries
                        </CardTitle>
                        <div className="text-purple-600">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-purple-600">
                            {stats.entriesCount}
                        </div>
                        <p className="text-xs text-muted-foreground">VAT Transactions</p>
                    </CardContent>
                </Card>
            </div>

            {/* Professional Ledger Summary */}
            <Card className="mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200">
                <CardHeader>
                    <CardTitle className="text-lg font-bold text-blue-900 flex items-center gap-2">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path
                                fillRule="evenodd"
                                d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
                                clipRule="evenodd"
                            />
                        </svg>
                        Ledger Summary
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div className="bg-white p-4 rounded-lg border">
                            <div className="text-gray-600 mb-1">Opening Balance</div>
                            <div className="font-bold text-gray-900">₹0.00</div>
                        </div>
                        <div className="bg-white p-4 rounded-lg border">
                            <div className="text-gray-600 mb-1">Current Period</div>
                            <div className="font-bold text-blue-600">
                                Dr: ₹{stats.totalDebits.toFixed(2)} | Cr: ₹
                                {stats.totalCredits.toFixed(2)}
                            </div>
                        </div>
                        <div className="bg-white p-4 rounded-lg border">
                            <div className="text-gray-600 mb-1">Closing Balance</div>
                            <div
                                className={`font-bold ${
                                    stats.balance >= 0 ? "text-green-600" : "text-red-600"
                                }`}
                            >
                                ₹{Math.abs(stats.balance).toFixed(2)}{" "}
                                {stats.balance >= 0 ? "Cr" : "Dr"}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Professional Ledger Table */}
            <Card className="border-2 border-gray-200">
                <CardHeader className="bg-gray-50 border-b">
                    <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path
                                fillRule="evenodd"
                                d="M5 4a3 3 0 00-3 3v6a3 3 0 003 3h10a3 3 0 003-3V7a3 3 0 00-3-3H5zm-1 9v-1h5v2H5a1 1 0 01-1-1zm7 1h4a1 1 0 001-1v-1h-5v2zm0-4h5V8h-5v2zM9 8H4v2h5V8z"
                                clipRule="evenodd"
                            />
                        </svg>
                        VAT Account Ledger
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <div className="px-6 pt-6">
                            <TabsList className="grid w-full grid-cols-3 mb-6">
                                <TabsTrigger value="all" className="text-sm font-semibold">
                                    All Entries ({vatEntries.length})
                                </TabsTrigger>
                                <TabsTrigger value="buy" className="text-sm font-semibold">
                                    Buy VAT - Dr (
                                    {vatEntries.filter((e) => e.type === "BUY").length})
                                </TabsTrigger>
                                <TabsTrigger value="sell" className="text-sm font-semibold">
                                    Sell VAT - Cr (
                                    {vatEntries.filter((e) => e.type === "SELL").length})
                                </TabsTrigger>
                            </TabsList>
                        </div>

                        <div className="px-6 pb-6">
                            <TabsContent value="all" className="mt-0">
                                <div className="border rounded-lg overflow-hidden">
                                    <TableComponent
                                        columns={columns}
                                        data={filteredEntries}
                                        allowSearch={true}
                                        allowPagination={true}
                                        showFooter={true}
                                    />
                                </div>
                                {filteredEntries.length > 0 && (
                                    <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="font-semibold text-gray-700">
                                                Ledger Totals:
                                            </span>
                                            <div className="flex gap-8">
                                                <span className="text-red-600 font-mono">
                                                    Total Dr: ₹{stats.totalDebits.toFixed(2)}
                                                </span>
                                                <span className="text-green-600 font-mono">
                                                    Total Cr: ₹{stats.totalCredits.toFixed(2)}
                                                </span>
                                                <span
                                                    className={`font-bold font-mono ${
                                                        stats.balance >= 0
                                                            ? "text-green-600"
                                                            : "text-red-600"
                                                    }`}
                                                >
                                                    Balance: ₹{Math.abs(stats.balance).toFixed(2)}{" "}
                                                    {stats.balance >= 0 ? "Cr" : "Dr"}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </TabsContent>

                            <TabsContent value="buy" className="mt-0">
                                <div className="border rounded-lg overflow-hidden">
                                    <TableComponent
                                        columns={columns}
                                        data={filteredEntries}
                                        allowSearch={true}
                                        allowPagination={true}
                                        showFooter={true}
                                    />
                                </div>
                                {filteredEntries.length > 0 && (
                                    <div className="mt-4 p-4 bg-red-50 rounded-lg border border-red-200">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="font-semibold text-red-700">
                                                Buy VAT Summary:
                                            </span>
                                            <span className="text-red-600 font-mono font-bold">
                                                Total Buy VAT (Dr): ₹{stats.buyVat.toFixed(2)}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </TabsContent>

                            <TabsContent value="sell" className="mt-0">
                                <div className="border rounded-lg overflow-hidden">
                                    <TableComponent
                                        columns={columns}
                                        data={filteredEntries}
                                        allowSearch={true}
                                        allowPagination={true}
                                        showFooter={true}
                                    />
                                </div>
                                {filteredEntries.length > 0 && (
                                    <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="font-semibold text-green-700">
                                                Sell VAT Summary:
                                            </span>
                                            <span className="text-green-600 font-mono font-bold">
                                                Total Sell VAT (Cr): ₹{stats.sellVat.toFixed(2)}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </TabsContent>
                        </div>
                    </Tabs>
                </CardContent>
            </Card>
        </section>
    );
}
