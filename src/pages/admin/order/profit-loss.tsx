import { useOrg } from "@/providers/org-provider";
import { api } from "@/utils/api";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRequirePermissions } from "@/hooks/use-permissions";
import {
    TrendingUp,
    DollarSign,
    ShoppingCart,
    Target,
    Calendar,
    FileText,
    ArrowUpRight,
} from "lucide-react";

interface ProfitLossData {
    summary: {
        totalOrders: number;
        dateRange: {};
        totals: {
            revenue: number;
            grossProfit: number;
            netProfit: number;
            discount: number;
            tax: number;
            charges: number;
            netAmount: number;
            paidAmount: number;
        };
        metrics: {
            averageOrderValue: number;
        };
        performance: {
            profitableOrders: number;
            lossOrders: number;
            breakEvenOrders: number;
        };
    };
    generatedAt: string;
}

const ProfitLossPage = () => {
    useRequirePermissions(["ORDER_READ", "ORDER_ADMIN"]);
    const { orgId } = useOrg();
    const [data, setData] = useState<ProfitLossData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchProfitLossData = async () => {
        try {
            setLoading(true);
            const res = await api.get(`orgs/${orgId}/orders/profit-loss`);
            setData(res.data);
        } catch (err) {
            setError("Failed to fetch profit and loss data");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (orgId) {
            fetchProfitLossData();
        }
    }, [orgId]);

    const formatCurrency = (amount: number) => {
        return `Rs ${amount.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        })}`;
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    };

    const getProfitColor = (profit: number) => {
        if (profit > 0) return "text-green-600";
        if (profit < 0) return "text-red-600";
        return "text-gray-600";
    };

    if (loading) {
        return (
            <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                    {[...Array(4)].map((_, i) => (
                        <Card key={i} className="animate-pulse">
                            <CardContent className="p-6">
                                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                                <div className="h-8 bg-gray-200 rounded"></div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="p-6">
                <Card>
                    <CardContent className="p-6 text-center">
                        <p className="text-red-600">{error || "No data available"}</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Profit & Loss</h1>
                    <p className="text-gray-600">Financial performance overview for your orders</p>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Calendar className="h-4 w-4" />
                    Generated: {formatDate(data.generatedAt)}
                </div>
            </div>

            {/* Key Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="bg-gradient-to-r from-green-500 to-emerald-600 text-white">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-2">
                            <DollarSign className="h-6 w-6" />
                            <TrendingUp className="h-4 w-4" />
                        </div>
                        <div className="text-2xl font-bold mb-1">
                            {formatCurrency(data.summary.totals.revenue)}
                        </div>
                        <div className="text-green-100 text-sm">Total Revenue</div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-r from-blue-500 to-cyan-600 text-white">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-2">
                            <Target className="h-6 w-6" />
                            <ArrowUpRight className="h-4 w-4" />
                        </div>
                        <div className="text-2xl font-bold mb-1">
                            {formatCurrency(data.summary.totals.grossProfit)}
                        </div>
                        <div className="text-blue-100 text-sm">Gross Profit</div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-r from-purple-500 to-violet-600 text-white">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-2">
                            <Target className="h-6 w-6" />
                            <ArrowUpRight className="h-4 w-4" />
                        </div>
                        <div className="text-2xl font-bold mb-1">
                            {(data.summary.totals.netProfit || -1) >= 0 ? (
                                <span className="">
                                    {formatCurrency(data.summary.totals.netProfit || 0)}
                                </span>
                            ) : (
                                <span className="">
                                    {formatCurrency(data.summary.totals.netProfit || 0)}
                                </span>
                            )}
                        </div>
                        <div className="text-purple-100 text-sm">Net Profit</div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-r from-orange-500 to-red-600 text-white">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-2">
                            <ShoppingCart className="h-6 w-6" />
                            <FileText className="h-4 w-4" />
                        </div>
                        <div className="text-2xl font-bold mb-1">{data.summary.totalOrders}</div>
                        <div className="text-orange-100 text-sm">Total Orders</div>
                    </CardContent>
                </Card>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <DollarSign className="h-5 w-5 text-blue-500" />
                            Financial Summary
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex justify-between">
                            <span className="text-gray-600">Revenue:</span>
                            <span className="font-semibold">
                                {formatCurrency(data.summary.totals.revenue)}
                            </span>
                        </div>

                        <div className="flex justify-between">
                            <span className="text-gray-600">Gross Profit:</span>
                            <span
                                className={`font-semibold ${getProfitColor(
                                    data.summary.totals.grossProfit
                                )}`}
                            >
                                {formatCurrency(data.summary.totals.grossProfit)}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">Net Profit:</span>
                            <span className="font-bold">
                                {formatCurrency(data.summary.totals.netProfit || 0)}
                            </span>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Target className="h-5 w-5 text-green-500" />
                            Performance Metrics
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex justify-between">
                            <span className="text-gray-600">Avg Order Value:</span>
                            <span className="font-semibold">
                                {formatCurrency(data.summary.metrics.averageOrderValue)}
                            </span>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-purple-500" />
                            Order Performance
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex justify-between">
                            <span className="text-gray-600">Profitable Orders:</span>
                            <span className="font-semibold text-green-600">
                                {data.summary.performance.profitableOrders}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">Loss Orders:</span>
                            <span className="font-semibold text-red-600">
                                {data.summary.performance.lossOrders}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">Break-even Orders:</span>
                            <span className="font-semibold text-gray-600">
                                {data.summary.performance.breakEvenOrders}
                            </span>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default ProfitLossPage;
