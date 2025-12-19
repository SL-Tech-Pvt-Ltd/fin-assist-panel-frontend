import { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import {
    Package,
    Settings,
    TrendingDown,
    TrendingUp,
    AlertCircle,
    RefreshCw,
    DollarSign,
    ShoppingCart,
    Users,
    Wallet,
    CreditCard,
    Banknote,
    Target,
    ArrowDownRight,
} from "lucide-react";
import { api } from "@/utils/api";
import { useOrg } from "@/providers/org-provider";
import { convertAdToBs, convertBsToAd } from "@/utils/bs-ad-conversion";
import NepaliDate from "nepali-date-converter";
import { Link } from "react-router-dom";

interface TransactionData {
    period: string;
    value: number;
}

interface Account {
    name: string;
    type: "CHEQUE" | "BANK" | "CASH_COUNTER";
    balance: number;
}

interface PaymentStatusSummary {
    totalPaidOrders: number;
    totalUnpaidOrders: number;
    paidPercentage: number;
}

interface RecentOrder {
    id: string;
    orderNumber: string;
    totalAmount: number;
    paymentStatus: "PENDING" | "PARTIAL" | "PAID";
    createdAt: string;
    type: "BUY" | "SELL";
}

interface OrderSummary {
    totalOrders: number;
    totalRevenue: number;
    totalPaid: number;
    averageOrderValue: number;
    pendingAmount: number;
    recentOrders: RecentOrder[];
}

interface DashboardData {
    transactions?: TransactionData[] | null;
    products?: number | null;
    entities?: number;
    creditPending?: number | null;
    debitPending?: number | null;
    buyPaid?: number | null;
    sellPaid?: number | null;
    totalOrders?: number;
    totalBuyOrders?: number;
    totalSellOrders?: number;
    totalRevenue?: number;
    totalInventoryValue?: number;
    totalExpenses?: number;
    netProfit?: number;
    totalCashBalance?: number;
    totalBankBalance?: number;
    totalBalance?: number;
    recentOrdersCount?: number;
    currentMonthOrders?: number;
    lastMonthOrders?: number;
    orderGrowthPercentage?: number;
    accounts?: Account[];
    averageOrderValue?: number;
    paymentStatusSummary?: PaymentStatusSummary;
    orderSummary?: OrderSummary;
}

interface ApiResponse {
    success: boolean;
    data?: DashboardData;
    error?: string;
}

type PeriodType = "week" | "month" | "year" | "all";

const getPeriod = (type: string) => {
    const now = new Date();
    let start: Date, end: Date;
    if (type === "today") {
        start = new Date(now);
        end = new Date(now);
    } else if (type === "yesterday") {
        start = new Date(now);
        start.setDate(now.getDate() - 1);
        end = new Date(now);
        end.setDate(now.getDate() - 1);
    } else if (type === "week") {
        const day = now.getDay();
        start = new Date(now);
        start.setDate(now.getDate() - day);
        end = new Date(now);
        end.setDate(start.getDate() + 6);
    } else if (type === "month") {
        const currentBSDate = convertAdToBs(now.getFullYear(), now.getMonth() + 1, now.getDate());
        const startDate = convertBsToAd(currentBSDate.year, currentBSDate.month, 1);

        const bsMonthEnd = new NepaliDate(currentBSDate.year, currentBSDate.month - 1, 1);
        bsMonthEnd.setMonth(currentBSDate.month);
        bsMonthEnd.setDate(0);
        const lastDayOfMonth = bsMonthEnd.getDate();

        const endDate = convertBsToAd(currentBSDate.year, currentBSDate.month, lastDayOfMonth);
        start = new Date(startDate.year, startDate.month - 1, startDate.day + 1);
        end = new Date(endDate.year, endDate.month - 1, endDate.day + 1);
    } else if (type === "year") {
        const currentBSDate = convertAdToBs(now.getFullYear(), now.getMonth() + 1, now.getDate());
        const startDate = convertBsToAd(currentBSDate.year, 1, 1);
        const endDate = convertBsToAd(currentBSDate.year, 12, 30);

        start = new Date(startDate.year, startDate.month - 1, startDate.day + 1);
        end = new Date(endDate.year, endDate.month - 1, endDate.day + 1);
    } else if (type === "all") {
        start = new Date(2020, 0, 1);
        end = now;
    } else {
        start = now;
        end = now;
    }
    return {
        startDate: start.toISOString().slice(0, 10),
        endDate: end.toISOString().slice(0, 10),
    };
};

const formatDate = (dateStr: string, offsetDays: number = 0) => {
    const adDate = new Date(dateStr);
    const bsDate = convertAdToBs(
        adDate.getFullYear(),
        adDate.getMonth() + 1,
        adDate.getDate() + offsetDays
    );

    const bsMonths = [
        "Baisakh",
        "Jestha",
        "Ashadh",
        "Shrawan",
        "Bhadra",
        "Ashwin",
        "Kartik",
        "Mangsir",
        "Poush",
        "Magh",
        "Falgun",
        "Chaitra",
    ];

    return `${bsMonths[bsDate.month - 1]} ${bsDate.day}, ${bsDate.year}`;
};

const Dashboard = () => {
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>("month");
    const { orgId } = useOrg();

    // Store dates in AD format internally
    const [customStart, setCustomStart] = useState(() => {
        const period = getPeriod("month");
        return period.startDate;
    });
    const [customEnd, setCustomEnd] = useState(() => {
        const period = getPeriod("month");
        return period.endDate;
    });

    // API call with date range parameters
    const fetchDashboardData = async (
        startDate?: string,
        endDate?: string
    ): Promise<ApiResponse> => {
        try {
            const params =
                startDate && endDate ? { startDate, endDate } : getPeriod(selectedPeriod);
            const data = await api.get(`/orgs/${orgId}/dashboard`, { params });

            return {
                success: data.status === 200,
                data: data.data as DashboardData,
                error: data.status !== 200 ? "Failed to fetch dashboard data" : undefined,
            };
        } catch (error) {
            console.error("Error fetching dashboard data:", error);
            return {
                success: false,
                error: "Failed to fetch dashboard data",
            };
        }
    };

    const loadData = async () => {
        setLoading(true);
        setError(null);

        try {
            const period = getPeriod(selectedPeriod);
            const startDate = period.startDate;
            const endDate = period.endDate;

            const response = await fetchDashboardData(startDate, endDate);

            if (response.success && response.data) {
                setData(response.data);
            } else {
                setError(response.error || "Unknown error occurred");
            }
        } catch (err) {
            setError("Network error. Please check your connection.");
        } finally {
            setLoading(false);
        }
    };

    // Handle period change
    const handlePeriodChange = async (period: PeriodType) => {
        setSelectedPeriod(period);
        const dateRange = getPeriod(period);
        setCustomStart(dateRange.startDate);
        setCustomEnd(dateRange.endDate);
    };

    useEffect(() => {
        if (orgId) {
            loadData();
        }
    }, [orgId, selectedPeriod]);

    // Derived data calculations
    const getDerivedData = (dashboardData: DashboardData) => {
        const totalTransactions =
            dashboardData.transactions?.reduce((sum, item) => sum + item.value, 0) || 0;
        const totalTransactionsFormatted = `${totalTransactions.toFixed(2)}`;

        const creditPendingFormatted = `₹${(dashboardData.creditPending || 0).toFixed(2)}`;
        const debitPendingFormatted = `₹${(dashboardData.debitPending || 0).toFixed(2)}`;

        const buyDue = 100 - (dashboardData.buyPaid || 0);
        const sellDue = 100 - (dashboardData.sellPaid || 0);

        // Format revenue, expenses, profit
        const totalRevenueFormatted = `₹${(dashboardData.totalRevenue || 0).toFixed(2)}`;
        const totalExpensesFormatted = `₹${(dashboardData.totalExpenses || 0).toFixed(2)}`;
        const netProfitFormatted = `₹${(dashboardData.netProfit || 0).toFixed(2)}`;

        // Format balance data
        const totalBalanceFormatted = `₹${(dashboardData.totalBalance || 0).toFixed(2)}`;
        const totalCashBalanceFormatted = `₹${(dashboardData.totalCashBalance || 0).toFixed(2)}`;
        const totalBankBalanceFormatted = `₹${dashboardData.totalBankBalance || 0}`;

        // Format average order value
        const averageOrderValueFormatted = `₹${dashboardData.averageOrderValue || 0}`;

        // Prepare account balance chart data
        const accountChartData =
            dashboardData.accounts?.map((account) => ({
                name: account.name,
                balance: account.balance,
                type: account.type,
            })) || [];

        // Payment status pie chart data
        const paymentStatusData = [
            {
                name: "Paid",
                value: dashboardData.paymentStatusSummary?.totalPaidOrders || 0,
                color: "#10B981",
            },
            {
                name: "Unpaid",
                value: dashboardData.paymentStatusSummary?.totalUnpaidOrders || 0,
                color: "#EF4444",
            },
        ];

        // Format months for display (remove year)
        const chartData = dashboardData.transactions?.map((item) => ({
            ...item,
            month: item.period, // Extract month part
        }));

        return {
            totalTransactionsFormatted,
            creditPendingFormatted,
            debitPendingFormatted,
            buyDue,
            sellDue,
            chartData,
            totalRevenueFormatted,
            totalExpensesFormatted,
            netProfitFormatted,
            totalBalanceFormatted,
            totalCashBalanceFormatted,
            totalBankBalanceFormatted,
            averageOrderValueFormatted,
            accountChartData,
            paymentStatusData,
        };
    };

    // Progress circle component
    const ProgressCircle = ({ percentage = 20, size = 80 }) => {
        const radius = size / 2 - 6;
        const circumference = 2 * Math.PI * radius;
        const strokeDasharray = circumference;
        const strokeDashoffset = circumference - (percentage / 100) * circumference;

        const fontSize = size < 80 ? "text-xs" : "text-lg";
        const strokeWidth = size < 80 ? 4 : 6;

        return (
            <div className="relative mx-auto" style={{ width: size, height: size }}>
                <svg width={size} height={size} className="transform -rotate-90">
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        stroke="rgb(243 244 246)"
                        strokeWidth={strokeWidth}
                        fill="transparent"
                    />
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        stroke="rgb(168 85 247)"
                        strokeWidth={strokeWidth}
                        fill="transparent"
                        strokeDasharray={strokeDasharray}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        className="transition-all duration-300 ease-in-out"
                    />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className={`${fontSize} font-bold text-gray-900`}>
                        {percentage.toFixed(0)}%
                    </span>
                </div>
            </div>
        );
    };

    // Loading skeleton component
    const LoadingSkeleton = () => (
        <div className="p-6 bg-gray-50 min-h-screen animate-pulse">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header skeleton */}
                <div className="mb-8">
                    <div className="h-8 bg-gray-300 rounded w-48 mb-2"></div>
                    <div className="h-4 bg-gray-300 rounded w-64"></div>
                </div>

                {/* Top metrics skeleton */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="bg-white rounded-xl p-6 shadow-sm h-32"></div>
                    ))}
                </div>

                {/* Main content skeleton */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 bg-white rounded-xl p-6 shadow-sm h-80"></div>
                    <div className="bg-white rounded-xl p-6 shadow-sm h-80"></div>
                </div>

                {/* Bottom content skeleton */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white rounded-xl p-6 shadow-sm h-64"></div>
                    <div className="bg-white rounded-xl p-6 shadow-sm h-64"></div>
                </div>
            </div>
        </div>
    );

    // Error state component
    const ErrorState = () => (
        <div className="p-6 bg-gray-50 min-h-[90vh]">
            <div className="max-w-7xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
                    <p className="text-gray-600">A descriptive body text comes here</p>
                </div>

                <div className="bg-white rounded-xl p-12 shadow-sm text-center">
                    <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong</h2>
                    <p className="text-gray-600 mb-6">{error}</p>
                    <button
                        onClick={loadData}
                        disabled={loading}
                        className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                    >
                        {loading ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                            <RefreshCw className="w-4 h-4" />
                        )}
                        {loading ? "Retrying..." : "Retry"}
                    </button>
                </div>
            </div>
        </div>
    );

    // Show loading state
    if (loading && !data) {
        return <LoadingSkeleton />;
    }

    // Show error state
    if (error && !data) {
        return <ErrorState />;
    }

    // Show dashboard with data
    if (!data) return null;

    const derivedData = getDerivedData(data);

    return (
        <div className="p-4 bg-gray-50 min-h-screen">
            <div className="max-w-7xl mx-auto space-y-4">
                {/* Header */}
                <div className="mb-6 flex justify-between items-start">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 mb-1">Dashboard</h1>
                        <p className="text-gray-600 text-sm">
                            Complete business overview and analytics
                        </p>
                        <div className="mt-2 inline-flex items-center px-3 py-1.5 bg-gradient-to-r from-blue-50 to-purple-50 text-blue-800 text-xs font-semibold rounded-full border border-blue-200">
                            <svg
                                className="w-4 h-4 mr-1.5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                />
                            </svg>
                            {formatDate(customStart)} — {formatDate(customEnd)}
                        </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        {/* Period Selection Buttons */}
                        <button
                            onClick={loadData}
                            disabled={loading}
                            className="inline-flex items-center gap-2 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 text-gray-700 px-3 py-2 rounded-lg font-medium transition-colors text-sm"
                        >
                            {loading ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                                <RefreshCw className="w-4 h-4" />
                            )}
                            {loading ? "Refreshing..." : "Refresh"}
                        </button>
                        <div className="flex items-center bg-gray-100 rounded-lg p-1">
                            {(["week", "month", "year", "all"] as PeriodType[]).map((period) => (
                                <button
                                    key={period}
                                    onClick={() => handlePeriodChange(period)}
                                    disabled={loading}
                                    className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                                        selectedPeriod === period
                                            ? "bg-white text-gray-900 shadow-sm"
                                            : "text-gray-600 hover:text-gray-900 disabled:text-gray-400"
                                    }`}
                                >
                                    {period === "week"
                                        ? "Week"
                                        : period === "month"
                                        ? "Month"
                                        : period === "year"
                                        ? "Year"
                                        : "All"}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Top Metrics Cards - More Compact */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {/* Total Revenue */}
                    <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg p-4 text-white">
                        <div className="flex items-center justify-between mb-2">
                            <DollarSign className="w-6 h-6" />
                            <TrendingUp className="w-4 h-4" />
                        </div>
                        <div className="text-xl font-bold mb-1">
                            {derivedData.totalRevenueFormatted}
                        </div>
                        <div className="text-green-100 text-xs">Revenue</div>
                    </div>

                    {/* Total Orders */}
                    <div className="bg-gradient-to-r from-purple-500 to-violet-600 rounded-lg p-4 text-white">
                        <div className="flex items-center justify-between mb-2">
                            <ShoppingCart className="w-6 h-6" />
                            <span
                                className={`text-xs px-1.5 py-0.5 rounded ${
                                    (data.orderGrowthPercentage || 0) >= 0
                                        ? "bg-green-500/20 text-green-100"
                                        : "bg-red-500/20 text-red-100"
                                }`}
                            >
                                {(data.orderGrowthPercentage || 0) >= 0 ? "+" : ""}
                                {data.orderGrowthPercentage || 0}%
                            </span>
                        </div>
                        <div className="text-xl font-bold mb-1">{data.totalOrders}</div>
                        <div className="text-purple-100 text-xs">Orders</div>
                    </div>

                    {/* Total Inventory Value */}
                    <div className="bg-gradient-to-r from-indigo-500 to-blue-600 rounded-lg p-4 text-white">
                        <div className="flex items-center justify-between mb-2">
                            <Package className="w-6 h-6" />
                        </div>
                        <div className="text-xl font-bold mb-1">
                            ₹{data.totalInventoryValue?.toFixed(2) || "0.00"}
                        </div>
                        <div className="text-indigo-100 text-xs">Inventory Value</div>
                    </div>

                    {/* Total Balance */}
                    <div className="bg-gradient-to-r from-orange-500 to-amber-600 rounded-lg p-4 text-white">
                        <div className="flex items-center justify-between mb-2">
                            <Wallet className="w-6 h-6" />
                        </div>
                        <div className="text-xl font-bold mb-1">
                            {derivedData.totalBalanceFormatted}
                        </div>
                        <div className="text-orange-100 text-xs">Balance</div>
                    </div>
                </div>

                {/* Main Content - More Compact Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                    {/* Transactions Chart - Takes 2 columns */}
                    <div className="lg:col-span-2 bg-white rounded-lg p-4 shadow-sm">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-semibold text-gray-900">
                                Monthly Transactions
                            </h2>
                            <span className="text-lg font-bold text-gray-900">
                                {derivedData.totalTransactionsFormatted}
                            </span>
                        </div>

                        <div className="h-48 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={derivedData.chartData || []}>
                                    <XAxis
                                        dataKey="month"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 11, fill: "#6B7280" }}
                                    />
                                    <YAxis hide />
                                    <Line
                                        type="monotone"
                                        dataKey="value"
                                        stroke="rgb(168 85 247)"
                                        strokeWidth={2}
                                        dot={false}
                                        activeDot={{
                                            r: 4,
                                            fill: "rgb(168 85 247)",
                                        }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Payment Status */}
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Status</h3>

                        <div className="h-32 mb-3">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={derivedData.paymentStatusData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={25}
                                        outerRadius={55}
                                        dataKey="value"
                                    >
                                        {derivedData.paymentStatusData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                    <span className="text-gray-600">Paid</span>
                                </div>
                                <span className="font-semibold">
                                    {data.paymentStatusSummary?.totalPaidOrders || 0}
                                </span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                    <span className="text-gray-600">Unpaid</span>
                                </div>
                                <span className="font-semibold">
                                    {data.paymentStatusSummary?.totalUnpaidOrders || 0}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h3>

                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Package className="w-4 h-4 text-blue-600" />
                                    <span className="text-sm text-gray-600">Products</span>
                                </div>
                                <span className="font-bold text-gray-900">{data.products}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Users className="w-4 h-4 text-green-600" />
                                    <span className="text-sm text-gray-600">Entities</span>
                                </div>
                                <span className="font-bold text-gray-900">{data.entities}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Target className="w-4 h-4 text-purple-600" />
                                    <span className="text-sm text-gray-600">Avg Order</span>
                                </div>
                                <span className="font-bold text-gray-900">
                                    ₹
                                    {data.orderSummary?.averageOrderValue
                                        ? Math.round(data.orderSummary.averageOrderValue)
                                        : data.averageOrderValue || 0}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <ArrowDownRight className="w-4 h-4 text-red-600" />
                                    <span className="text-sm text-gray-600">Expenses</span>
                                </div>
                                <span className="font-bold text-gray-900">
                                    {derivedData.totalExpensesFormatted}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom Section - Compact Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Account Balances - Compact */}
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                            Account Balances
                        </h3>

                        <div className="space-y-3">
                            {data.accounts?.map((account, index) => (
                                <div
                                    key={index}
                                    className="flex items-center justify-between p-2 bg-gray-50 rounded"
                                >
                                    <div className="flex items-center gap-2">
                                        {account.type === "CASH_COUNTER" && (
                                            <Banknote className="w-4 h-4 text-green-600" />
                                        )}
                                        {account.type === "BANK" && (
                                            <CreditCard className="w-4 h-4 text-blue-600" />
                                        )}
                                        {account.type === "CHEQUE" && (
                                            <Settings className="w-4 h-4 text-purple-600" />
                                        )}
                                        <div>
                                            <div className="font-medium text-gray-900 text-sm">
                                                {account.name}
                                            </div>
                                            <div className="text-xs text-gray-500 capitalize">
                                                {account.type.replace("_", " ").toLowerCase()}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-sm font-bold text-gray-900">
                                        ₹{account.balance.toLocaleString()}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Order & Performance Stats */}
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                            Order Statistics
                        </h3>

                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-2">
                                <div className="text-center p-2 bg-blue-50 rounded">
                                    <div className="text-lg font-bold text-blue-600">
                                        {data.totalBuyOrders}
                                    </div>
                                    <div className="text-xs text-blue-700">Buy Orders</div>
                                </div>
                                <div className="text-center p-2 bg-green-50 rounded">
                                    <div className="text-lg font-bold text-green-600">
                                        {data.totalSellOrders}
                                    </div>
                                    <div className="text-xs text-green-700">Sell Orders</div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-600">Current Month</span>
                                    <span className="font-semibold">{data.currentMonthOrders}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-600">Last Month</span>
                                    <span className="font-semibold">{data.lastMonthOrders}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-600">Recent Orders</span>
                                    <span className="font-semibold">{data.recentOrdersCount}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Pending Amounts & Progress */}
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                            Pending & Progress
                        </h3>

                        <div className="space-y-4">
                            {/* Pending Amounts */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between p-2 bg-red-50 rounded">
                                    <div className="flex items-center gap-2">
                                        <TrendingDown className="w-4 h-4 text-red-600" />
                                        <span className="text-sm text-gray-900">
                                            Credit Pending
                                        </span>
                                    </div>
                                    <span className="text-sm font-bold text-red-600">
                                        {derivedData.creditPendingFormatted}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between p-2 bg-yellow-50 rounded">
                                    <div className="flex items-center gap-2">
                                        <TrendingUp className="w-4 h-4 text-yellow-600" />
                                        <span className="text-sm text-gray-900">Debit Pending</span>
                                    </div>
                                    <span className="text-sm font-bold text-yellow-600">
                                        {derivedData.debitPendingFormatted}
                                    </span>
                                </div>
                            </div>

                            {/* Buy/Sell Progress - Compact */}
                            <div className="grid grid-cols-2 gap-2">
                                <div className="text-center">
                                    <div className="mb-1">
                                        <ProgressCircle percentage={data.buyPaid || 0} size={60} />
                                    </div>
                                    <div className="text-xs text-gray-600">Buy Orders</div>
                                </div>
                                <div className="text-center">
                                    <div className="mb-1">
                                        <ProgressCircle percentage={data.sellPaid || 0} size={60} />
                                    </div>
                                    <div className="text-xs text-gray-600">Sell Orders</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Recent Orders Section */}
                {data.orderSummary?.recentOrders && data.orderSummary.recentOrders.length > 0 && (
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">Recent Orders</h3>
                            <div className="text-sm text-gray-600">
                                Showing {data.orderSummary.recentOrders.length} recent orders
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-gray-200">
                                        <th className="text-left py-2 px-3 font-medium text-gray-900">
                                            Order #
                                        </th>
                                        <th className="text-left py-2 px-3 font-medium text-gray-900">
                                            Type
                                        </th>
                                        <th className="text-right py-2 px-3 font-medium text-gray-900">
                                            Amount
                                        </th>
                                        <th className="text-center py-2 px-3 font-medium text-gray-900">
                                            Status
                                        </th>
                                        <th className="text-right py-2 px-3 font-medium text-gray-900">
                                            Date
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.orderSummary.recentOrders.map((order) => (
                                        <tr
                                            key={order.id}
                                            className="border-b border-gray-100 hover:bg-gray-50"
                                        >
                                            <td className="py-2 px-3">
                                                {/* <div className="font-medium text-gray-900">
                                                    {order.orderNumber}
                                                </div> */}
                                                <Link
                                                    to={`/org/${orgId}/orders/${order.id}`}
                                                    className="font-medium text-blue-600 hover:underline"
                                                >
                                                    {order.orderNumber}
                                                </Link>
                                            </td>
                                            <td className="py-2 px-3">
                                                <span
                                                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                                        order.type === "BUY"
                                                            ? "bg-blue-100 text-blue-800"
                                                            : "bg-green-100 text-green-800"
                                                    }`}
                                                >
                                                    {order.type}
                                                </span>
                                            </td>
                                            <td className="py-2 px-3 text-right font-medium">
                                                ₹{order.totalAmount.toLocaleString()}
                                            </td>
                                            <td className="py-2 px-3 text-center">
                                                <span
                                                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                                        order.paymentStatus === "PAID"
                                                            ? "bg-green-100 text-green-800"
                                                            : order.paymentStatus === "PARTIAL"
                                                            ? "bg-yellow-100 text-yellow-800"
                                                            : "bg-red-100 text-red-800"
                                                    }`}
                                                >
                                                    {order.paymentStatus}
                                                </span>
                                            </td>
                                            <td className="py-2 px-3 text-right text-gray-600">
                                                {new Date(order.createdAt).toLocaleDateString(
                                                    "en-US",
                                                    {
                                                        month: "short",
                                                        day: "numeric",
                                                        year: "numeric",
                                                    }
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Dashboard;
