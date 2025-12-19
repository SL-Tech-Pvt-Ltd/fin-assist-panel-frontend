import { useOrg } from "@/providers/org-provider";
import { api } from "@/utils/api";
import { useState, useEffect } from "react";
import { exportToExcel, exportToPDF } from "@/utils/reportExports";
import { TableComponent } from "@/components/modules/Table";
import { useRequirePermissions } from "@/hooks/use-permissions";
import "./report.css";
import { Link } from "react-router-dom";
import { ColumnDef } from "@tanstack/react-table";
import { Order } from "@/data/types";
import { convertAdToBs, convertBsToAd } from "@/utils/bs-ad-conversion";
import NepaliDate from "nepali-date-converter";

const FISCAL_YEARS = [
    {
        name: "FY 2082/83",
        startDate: "2025-07-16",
        endDate: "2026-07-15",
    },
    {
        name: "FY 2081/82",
        startDate: "2024-07-17",
        endDate: "2025-07-16",
    },
    {
        name: "FY 2080/81",
        startDate: "2023-07-17",
        endDate: "2024-07-16",
    },
    {
        name: "FY 2079/80",
        startDate: "2022-07-17",
        endDate: "2023-07-16",
    },
    {
        name: "FY 2078/79",
        startDate: "2021-07-17",
        endDate: "2022-07-16",
    },
];

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
        // start = new Date(now.getFullYear(), now.getMonth(), 1);
        // end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        const currentBSDate = convertAdToBs(now.getFullYear(), now.getMonth() + 1, now.getDate());
        const startDate = convertBsToAd(currentBSDate.year, currentBSDate.month, 1);

        // Get the last day of the BS month using NepaliDate
        const bsMonthEnd = new NepaliDate(currentBSDate.year, currentBSDate.month - 1, 1);
        bsMonthEnd.setMonth(currentBSDate.month); // Move to next month
        bsMonthEnd.setDate(0); // Go back one day to get last day of current month
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
    } else {
        start = now;
        end = now;
    }
    return {
        startDate: start.toISOString().slice(0, 10),
        endDate: end.toISOString().slice(0, 10),
    };
};

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "NPR",
        minimumFractionDigits: 2,
    }).format(amount || 0);
};

const formatDate = (dateStr: string, offsetDays: number = 0) => {
    // Convert AD date to BS for display
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

const convertBsToAdDate = (bsYear: number, bsMonth: number, bsDay: number): string => {
    // Convert BS date to AD date string (YYYY-MM-DD)
    const adDate = convertBsToAd(bsYear, bsMonth, bsDay);
    return `${adDate.year}-${String(adDate.month).padStart(2, "0")}-${String(adDate.day).padStart(
        2,
        "0"
    )}`;
};

const convertAdDateToBsString = (adDateStr: string): string => {
    // Convert AD date string to BS date string for input fields
    const adDate = new Date(adDateStr);
    const bsDate = convertAdToBs(adDate.getFullYear(), adDate.getMonth() + 1, adDate.getDate());
    return `${bsDate.year}-${String(bsDate.month).padStart(2, "0")}-${String(bsDate.day).padStart(
        2,
        "0"
    )}`;
};

const ReportPage = () => {
    useRequirePermissions(["ORDER_READ", "ORDER_ADMIN"]);
    const { orgId } = useOrg();
    const [report, setReport] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [periodType, setPeriodType] = useState("month");
    // Store dates in AD format internally
    const [customStart, setCustomStart] = useState(() => {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        return startOfMonth.toISOString().slice(0, 10);
    });
    const [customEnd, setCustomEnd] = useState(() => {
        const today = new Date();
        return today.toISOString().slice(0, 10);
    });
    // BS date strings for display in input fields
    const [bsCustomStart, setBsCustomStart] = useState(() => {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        return convertAdDateToBsString(startOfMonth.toISOString().slice(0, 10));
    });
    const [bsCustomEnd, setBsCustomEnd] = useState(() => {
        const today = new Date();
        return convertAdDateToBsString(today.toISOString().slice(0, 10));
    });
    const [selectedFiscalYear, setSelectedFiscalYear] = useState(FISCAL_YEARS[0]);
    const [activeTab, setActiveTab] = useState("summary");

    // Auto-fetch report when component mounts or period changes
    useEffect(() => {
        if (orgId) {
            handleFetch();
        }
    }, [orgId, periodType, customStart, customEnd, selectedFiscalYear]);

    // Handle custom date changes and validate dates
    const handleCustomStartChange = (bsDateStr: string) => {
        // Parse BS date and convert to AD
        const parts = bsDateStr.split("-");
        if (parts.length === 3) {
            const bsYear = parseInt(parts[0]);
            const bsMonth = parseInt(parts[1]);
            const bsDay = parseInt(parts[2]);
            const adDateStr = convertBsToAdDate(bsYear, bsMonth, bsDay);

            setBsCustomStart(bsDateStr);
            setCustomStart(adDateStr);

            // Validate and adjust end date if needed
            if (adDateStr && customEnd && new Date(adDateStr) > new Date(customEnd)) {
                setCustomEnd(adDateStr);
                setBsCustomEnd(bsDateStr);
            }
        }
    };

    const handleCustomEndChange = (bsDateStr: string) => {
        // Parse BS date and convert to AD
        const parts = bsDateStr.split("-");
        if (parts.length === 3) {
            const bsYear = parseInt(parts[0]);
            const bsMonth = parseInt(parts[1]);
            const bsDay = parseInt(parts[2]);
            const adDateStr = convertBsToAdDate(bsYear, bsMonth, bsDay);

            setBsCustomEnd(bsDateStr);
            setCustomEnd(adDateStr);

            // Validate and adjust start date if needed
            if (adDateStr && customStart && new Date(adDateStr) < new Date(customStart)) {
                setCustomStart(adDateStr);
                setBsCustomStart(bsDateStr);
            }
        }
    };

    // Column definitions for daily breakdown table
    // Column definitions for daily breakdown table
    const dailyBreakdownColumns = [
        {
            accessorKey: "date",
            header: "Date",
            cell: ({ getValue }: any) => formatDate(getValue()),
        },
        {
            accessorKey: "revenue",
            header: "Revenue",
            cell: ({ getValue }: any) => (
                <span className="font-semibold text-emerald-600">{formatCurrency(getValue())}</span>
            ),
        },
        {
            accessorKey: "cost",
            header: "Cost",
            cell: ({ getValue }: any) => (
                <span className="font-semibold text-red-600">{formatCurrency(getValue())}</span>
            ),
        },
        {
            accessorKey: "profit",
            header: "Profit",
            cell: ({ getValue }: any) => {
                const profit = getValue();
                return (
                    <span
                        className={`font-semibold ${
                            profit >= 0 ? "text-emerald-600" : "text-red-600"
                        }`}
                    >
                        {formatCurrency(profit)}
                    </span>
                );
            },
        },
        {
            accessorKey: "orders",
            header: "Orders",
            cell: ({ getValue }: any) => <span className="text-gray-600">{getValue()}</span>,
        },
        {
            accessorKey: "transactions",
            header: "Transactions",
            cell: ({ getValue }: any) => <span className="text-gray-600">{getValue()}</span>,
        },
    ];

    // Column definitions for transactions table
    const transactionsColumns = [
        {
            accessorKey: "createdAt",
            header: "Date",
            cell: ({ getValue }: any) => formatDate(getValue()),
        },
        {
            accessorKey: "type",
            header: "Type",
            cell: ({ getValue }: any) => {
                const type = getValue();
                return (
                    <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            type === "income"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-red-100 text-red-800"
                        }`}
                    >
                        {type}
                    </span>
                );
            },
        },
        {
            accessorKey: "amount",
            header: "Amount",
            cell: ({ row }: any) => {
                const type = row.original.type;
                return (
                    <span
                        className={`font-semibold ${
                            type === "income" ? "text-emerald-600" : "text-red-600"
                        }`}
                    >
                        {formatCurrency(row.original.amount)}
                    </span>
                );
            },
        },
        {
            accessorKey: "account.name",
            header: "Account",
            cell: ({ row }: any) => row.original.account?.name || "N/A",
        },
        {
            accessorKey: "description",
            header: "Description",
            cell: ({ getValue }: any) => (
                <div className="max-w-xs truncate" title={getValue()}>
                    {getValue()}
                </div>
            ),
        },
    ];

    // Column definitions for orders table
    const ordersColumns: ColumnDef<Order>[] = [
        {
            accessorKey: "orderNumber",
            header: "Order #",
            cell: (props) => (
                <Link
                    to={`/org/${orgId}/orders/${props.row.original.id}`}
                    className="font-medium text-blue-600"
                >
                    {props.row.original.orderNumber}
                </Link>
            ),
        },
        {
            accessorKey: "createdAt",
            header: "Date",
            cell: ({ getValue }: any) => formatDate(getValue()),
        },
        {
            accessorKey: "type",
            header: "Type",
            cell: ({ getValue }: any) => {
                const type = getValue();
                return (
                    <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            type === "sell"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-blue-100 text-blue-800"
                        }`}
                    >
                        {type}
                    </span>
                );
            },
        },
        {
            accessorKey: "entity.name",
            header: "Customer",
            cell: ({ row }: any) => row.original.entity?.name || "N/A",
        },
        {
            accessorKey: "totalAmount",
            header: "Amount",
            cell: ({ getValue }: any) => (
                <span className="font-semibold text-gray-900">{formatCurrency(getValue())}</span>
            ),
        },
        {
            accessorKey: "paymentStatus",
            header: "Status",
            cell: ({ getValue }: any) => {
                const status = getValue();
                return (
                    <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            status === "paid"
                                ? "bg-emerald-100 text-emerald-800"
                                : status === "pending"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-red-100 text-red-800"
                        }`}
                    >
                        {status}
                    </span>
                );
            },
        },
        {
            accessorKey: "netProfit",
            header: "Profit",
            cell: ({ getValue }: any) => {
                const profit = getValue() || 0;
                return (
                    <span
                        className={`font-semibold ${
                            profit >= 0 ? "text-emerald-600" : "text-red-600"
                        }`}
                    >
                        {formatCurrency(profit)}
                    </span>
                );
            },
        },
    ];

    const handleFetch = async () => {
        if (!orgId) return;
        setLoading(true);
        setError("");
        try {
            let period;
            if (periodType === "custom") {
                period = { startDate: customStart, endDate: customEnd };
            } else if (periodType === "fiscal") {
                period = {
                    startDate: selectedFiscalYear.startDate,
                    endDate: selectedFiscalYear.endDate,
                };
            } else {
                period = getPeriod(periodType);
            }

            const response = await api.get(`/orgs/${orgId}/report`, {
                params: period,
            });
            setReport(response.data);
        } catch (err: any) {
            setError(err.response?.data?.message || "Failed to fetch report");
        } finally {
            setLoading(false);
        }
    };

    const handleExportToExcel = () => {
        exportToExcel(report);
    };

    const handleExportToPDF = () => {
        exportToPDF(report);
    };

    return (
        <div className="print-full-width">
            <div className="print-full-width">
                {/* Enhanced Header */}
                <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-white/20 p-6 mb-6 print-clean print-section no-print">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl shadow-lg">
                                <svg
                                    className="w-8 h-8 text-white"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                                    />
                                </svg>
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                                    Business Analytics
                                </h1>
                                <p className="text-sm text-gray-600 font-medium">
                                    Generate comprehensive reports & insights
                                </p>
                            </div>
                        </div>

                        {report && (
                            <div className="flex flex-wrap gap-2">
                                <button
                                    onClick={handleExportToExcel}
                                    className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-all duration-200 flex items-center gap-2 text-sm font-medium shadow-sm hover:shadow-md"
                                >
                                    <svg
                                        className="w-4 h-4"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                        />
                                    </svg>
                                    Excel
                                </button>
                                <button
                                    onClick={handleExportToPDF}
                                    className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all duration-200 flex items-center gap-2 text-sm font-medium shadow-sm hover:shadow-md"
                                >
                                    <svg
                                        className="w-4 h-4"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                                        />
                                    </svg>
                                    PDF
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Compact Period Selection */}
                    <div className="mt-6 p-4 bg-gray-50/80 rounded-xl border border-gray-200/50">
                        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                            <div className="flex-1">
                                <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wider">
                                    Time Period
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {[
                                        { key: "today", label: "Today" },
                                        { key: "yesterday", label: "Yesterday" },
                                        { key: "week", label: "This Week" },
                                        { key: "month", label: "This Month" },
                                        { key: "year", label: "This Year" },
                                        { key: "fiscal", label: "Fiscal Year" },
                                        { key: "custom", label: "Custom" },
                                    ].map((period) => (
                                        <button
                                            key={period.key}
                                            onClick={() => setPeriodType(period.key)}
                                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                                                periodType === period.key
                                                    ? "bg-blue-600 text-white shadow-md scale-105"
                                                    : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"
                                            }`}
                                        >
                                            {period.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {periodType === "fiscal" && (
                                <div className="flex gap-3 items-end">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">
                                            Select Fiscal Year
                                        </label>
                                        <select
                                            value={selectedFiscalYear.name}
                                            onChange={(e) => {
                                                const fiscal = FISCAL_YEARS.find(
                                                    (fy) => fy.name === e.target.value
                                                );
                                                if (fiscal) setSelectedFiscalYear(fiscal);
                                            }}
                                            className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                                        >
                                            {FISCAL_YEARS.map((fiscal) => (
                                                <option key={fiscal.name} value={fiscal.name}>
                                                    {fiscal.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            )}

                            {periodType === "custom" && (
                                <div className="flex gap-3 items-end">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">
                                            From (BS)
                                        </label>
                                        <input
                                            type="date"
                                            value={bsCustomStart}
                                            onChange={(e) =>
                                                handleCustomStartChange(e.target.value)
                                            }
                                            className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                                            placeholder="YYYY-MM-DD (BS)"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">
                                            To (BS)
                                        </label>
                                        <input
                                            type="date"
                                            value={bsCustomEnd}
                                            onChange={(e) => handleCustomEndChange(e.target.value)}
                                            className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                                            placeholder="YYYY-MM-DD (BS)"
                                        />
                                    </div>
                                    {customStart && customEnd && (
                                        <div className="text-xs text-gray-500 mt-1">
                                            {new Date(customEnd).getTime() -
                                                new Date(customStart).getTime() >=
                                            0
                                                ? `${
                                                      Math.ceil(
                                                          (new Date(customEnd).getTime() -
                                                              new Date(customStart).getTime()) /
                                                              (1000 * 60 * 60 * 24)
                                                      ) + 1
                                                  } days selected`
                                                : "Invalid date range"}
                                        </div>
                                    )}
                                </div>
                            )}

                            {(loading || error) && (
                                <div className="flex items-center gap-3">
                                    {loading && (
                                        <div className="flex items-center gap-2 text-blue-600 text-sm font-medium">
                                            <svg
                                                className="animate-spin w-4 h-4"
                                                xmlns="http://www.w3.org/2000/svg"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                            >
                                                <circle
                                                    className="opacity-25"
                                                    cx="12"
                                                    cy="12"
                                                    r="10"
                                                    stroke="currentColor"
                                                    strokeWidth="4"
                                                ></circle>
                                                <path
                                                    className="opacity-75"
                                                    fill="currentColor"
                                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                                ></path>
                                            </svg>
                                            Generating report...
                                        </div>
                                    )}
                                    {error && (
                                        <div className="text-red-700 bg-red-100 px-3 py-2 rounded-lg border border-red-200 text-sm font-medium">
                                            {error}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Report Content */}
                {report && (
                    <div className="space-y-4">
                        {/* Compact Report Header */}
                        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-md border border-white/20 p-4 print-clean print-section">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                                        Business Report
                                    </h2>
                                    <p className="text-sm text-gray-600">
                                        {formatDate(report.reportPeriod?.startDate)} —{" "}
                                        {formatDate(report.reportPeriod?.endDate, -1)}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <div className="inline-flex items-center px-3 py-1 bg-gradient-to-r from-blue-100 to-purple-100 text-blue-800 text-sm font-medium rounded-full border border-blue-200">
                                        <svg
                                            className="w-4 h-4 mr-1"
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
                                        {report.reportPeriod?.daysCount} days
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Compact Tabs */}
                        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-md border border-white/20 print-clean">
                            <div className="border-b border-gray-200/50 no-print p-4 pb-0">
                                <nav className="flex flex-wrap gap-2" aria-label="Tabs">
                                    {[
                                        { key: "summary", label: "Overview", icon: "📊" },
                                        { key: "products", label: "Products", icon: "🏷️" },
                                        { key: "customers", label: "Customers", icon: "👥" },
                                        { key: "payments", label: "Payments", icon: "💳" },
                                        { key: "daily", label: "Daily", icon: "📅" },
                                        { key: "transactions", label: "Transactions", icon: "💰" },
                                        { key: "orders", label: "Orders", icon: "📦" },
                                    ].map((tab) => (
                                        <button
                                            key={tab.key}
                                            onClick={() => setActiveTab(tab.key)}
                                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-1.5 ${
                                                activeTab === tab.key
                                                    ? "bg-gradient-to-r from-blue-600 to-purple-600 border text-white shadow-lg"
                                                    : "bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200"
                                            }`}
                                        >
                                            <span>{tab.icon}</span>
                                            {tab.label}
                                        </button>
                                    ))}
                                </nav>
                            </div>

                            <div className="p-4 print-section">
                                <div className="hidden print:block mb-4">
                                    <h3 className="text-lg font-semibold text-gray-900">
                                        {activeTab === "summary" && "📊 Business Overview"}
                                        {activeTab === "products" && "🏷️ Top Performing Products"}
                                        {activeTab === "customers" && "👥 Top Customers"}
                                        {activeTab === "payments" && "💳 Payment Analysis"}
                                        {activeTab === "daily" && "📅 Daily Performance"}
                                        {activeTab === "transactions" && "💰 Recent Transactions"}
                                        {activeTab === "orders" && "📦 Recent Orders"}
                                    </h3>
                                </div>

                                {/* Summary Tab */}
                                {activeTab === "summary" && (
                                    <div className="space-y-4">
                                        {/* Key Metrics Grid */}
                                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                            <div className="bg-gradient-to-br from-emerald-50 via-green-50 to-emerald-100 rounded-xl p-4 border border-emerald-200/50 shadow-sm">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="text-emerald-700 text-xs font-semibold uppercase tracking-wider">
                                                            Revenue (Incoming)
                                                        </p>
                                                        <p className="text-lg font-bold text-gray-900 mt-1">
                                                            {formatCurrency(
                                                                report.summary?.totalRevenue
                                                            )}
                                                        </p>
                                                    </div>
                                                    <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
                                                        <svg
                                                            className="w-4 h-4 text-white"
                                                            fill="none"
                                                            stroke="currentColor"
                                                            viewBox="0 0 24 24"
                                                        >
                                                            <path
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                                strokeWidth={2}
                                                                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                                                            />
                                                        </svg>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="bg-gradient-to-br from-red-50 via-rose-50 to-red-100 rounded-xl p-4 border border-red-200/50 shadow-sm">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="text-red-700 text-xs font-semibold uppercase tracking-wider">
                                                            Cost (Outgoing)
                                                        </p>
                                                        <p className="text-lg font-bold text-gray-900 mt-1">
                                                            {formatCurrency(
                                                                report.summary?.totalCost
                                                            )}
                                                        </p>
                                                    </div>
                                                    <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center">
                                                        <svg
                                                            className="w-4 h-4 text-white"
                                                            fill="none"
                                                            stroke="currentColor"
                                                            viewBox="0 0 24 24"
                                                        >
                                                            <path
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                                strokeWidth={2}
                                                                d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"
                                                            />
                                                        </svg>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="bg-gradient-to-br from-blue-50 via-sky-50 to-blue-100 rounded-xl p-4 border border-blue-200/50 shadow-sm">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="text-blue-700 text-xs font-semibold uppercase tracking-wider">
                                                            Gross Profit
                                                        </p>
                                                        <p className="text-lg font-bold text-gray-900 mt-1">
                                                            {formatCurrency(
                                                                report.summary?.grossProfit
                                                            )}
                                                        </p>
                                                    </div>
                                                    <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                                                        <svg
                                                            className="w-4 h-4 text-white"
                                                            fill="none"
                                                            stroke="currentColor"
                                                            viewBox="0 0 24 24"
                                                        >
                                                            <path
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                                strokeWidth={2}
                                                                d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
                                                            />
                                                        </svg>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="bg-gradient-to-br from-purple-50 via-violet-50 to-purple-100 rounded-xl p-4 border border-purple-200/50 shadow-sm">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="text-purple-700 text-xs font-semibold uppercase tracking-wider">
                                                            Net Profit
                                                        </p>
                                                        <p className="text-lg font-bold text-gray-900 mt-1">
                                                            {formatCurrency(
                                                                report.summary?.netProfit
                                                            )}
                                                        </p>
                                                    </div>
                                                    <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                                                        <svg
                                                            className="w-4 h-4 text-white"
                                                            fill="none"
                                                            stroke="currentColor"
                                                            viewBox="0 0 24 24"
                                                        >
                                                            <path
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                                strokeWidth={2}
                                                                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                                            />
                                                        </svg>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Secondary Metrics */}
                                        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
                                            <div className="bg-white/80 rounded-lg p-3 border border-gray-200/50 shadow-sm">
                                                <div className="text-center">
                                                    <p className="text-2xl font-bold text-gray-900">
                                                        {report.summary?.totalOrders || 0}
                                                    </p>
                                                    <p className="text-xs text-gray-600 font-medium mt-1">
                                                        Total Orders
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="bg-white/80 rounded-lg p-3 border border-gray-200/50 shadow-sm">
                                                <div className="text-center">
                                                    <p className="text-2xl font-bold text-emerald-600">
                                                        {report.summary?.sellOrders || 0}
                                                    </p>
                                                    <p className="text-xs text-gray-600 font-medium mt-1">
                                                        Sell Orders
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="bg-white/80 rounded-lg p-3 border border-gray-200/50 shadow-sm">
                                                <div className="text-center">
                                                    <p className="text-2xl font-bold text-blue-600">
                                                        {report.summary?.buyOrders || 0}
                                                    </p>
                                                    <p className="text-xs text-gray-600 font-medium mt-1">
                                                        Buy Orders
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="bg-white/80 rounded-lg p-3 border border-gray-200/50 shadow-sm">
                                                <div className="text-center">
                                                    <p className="text-2xl font-bold text-purple-600">
                                                        {report.summary?.totalTransactions || 0}
                                                    </p>
                                                    <p className="text-xs text-gray-600 font-medium mt-1">
                                                        Transactions
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="bg-white/80 rounded-lg p-3 border border-gray-200/50 shadow-sm">
                                                <div className="text-center">
                                                    <p className="text-2xl font-bold text-red-600">
                                                        {formatCurrency(
                                                            report.summary?.totalExpenses
                                                        )
                                                            .replace("NPR", "")
                                                            .trim()}
                                                    </p>
                                                    <p className="text-xs text-gray-600 font-medium mt-1">
                                                        Expenses
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="bg-white/80 rounded-lg p-3 border border-gray-200/50 shadow-sm">
                                                <div className="text-center">
                                                    <p className="text-2xl font-bold text-green-600">
                                                        {formatCurrency(
                                                            report.summary?.totalIncomes
                                                        )
                                                            .replace("NPR", "")
                                                            .trim()}
                                                    </p>
                                                    <p className="text-xs text-gray-600 font-medium mt-1">
                                                        Incomes
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Additional Metrics Section */}
                                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                            <div className="bg-white/60 rounded-xl p-4 border border-gray-200/30">
                                                <h4 className="text-sm font-semibold text-gray-800 mb-3">
                                                    📋 Orders Overview
                                                </h4>
                                                <div className="space-y-2">
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-sm text-gray-600">
                                                            Total Orders
                                                        </span>
                                                        <span className="font-semibold text-gray-900">
                                                            {report.summary?.totalOrders || 0}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-sm text-gray-600">
                                                            Sell Orders
                                                        </span>
                                                        <span className="font-semibold text-emerald-600">
                                                            {report.summary?.sellOrders || 0}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-sm text-gray-600">
                                                            Buy Orders
                                                        </span>
                                                        <span className="font-semibold text-blue-600">
                                                            {report.summary?.buyOrders || 0}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="bg-white/60 rounded-xl p-4 border border-gray-200/30">
                                                <h4 className="text-sm font-semibold text-gray-800 mb-3">
                                                    💳 Transactions
                                                </h4>
                                                <div className="space-y-2">
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-sm text-gray-600">
                                                            Total Count
                                                        </span>
                                                        <span className="font-semibold text-gray-900">
                                                            {report.summary?.totalTransactions || 0}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-sm text-gray-600">
                                                            Expenses
                                                        </span>
                                                        <span className="font-semibold text-red-600">
                                                            {formatCurrency(
                                                                report.summary?.totalExpenses
                                                            )}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-sm text-gray-600">
                                                            Incomes
                                                        </span>
                                                        <span className="font-semibold text-emerald-600">
                                                            {formatCurrency(
                                                                report.summary?.totalIncomes
                                                            )}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="bg-white/60 rounded-xl p-4 border border-gray-200/30">
                                                <h4 className="text-sm font-semibold text-gray-800 mb-3">
                                                    💰 Financial Health
                                                </h4>
                                                <div className="space-y-2">
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-sm text-gray-600">
                                                            Actual Revenue
                                                        </span>
                                                        <span className="font-semibold text-emerald-600">
                                                            {formatCurrency(
                                                                report.summary?.actualRevenue
                                                            )}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-sm text-gray-600">
                                                            Actual Cost
                                                        </span>
                                                        <span className="font-semibold text-red-600">
                                                            {formatCurrency(
                                                                report.summary?.actualCost
                                                            )}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-sm text-gray-600">
                                                            Net Income/Expense
                                                        </span>
                                                        <span
                                                            className={`font-semibold ${
                                                                (report.summary?.netIncomeExpense ||
                                                                    0) >= 0
                                                                    ? "text-emerald-600"
                                                                    : "text-red-600"
                                                            }`}
                                                        >
                                                            {formatCurrency(
                                                                report.summary?.netIncomeExpense
                                                            )}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Products Tab */}
                                {activeTab === "products" && (
                                    <>
                                        {report.topProducts?.length > 0 ? (
                                            <div className="overflow-x-auto">
                                                <table className="w-full">
                                                    <thead>
                                                        <tr className="bg-gray-50">
                                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                                                Product
                                                            </th>
                                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                                                Qty Sold
                                                            </th>
                                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                                                Revenue
                                                            </th>
                                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                                                Orders
                                                            </th>
                                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                                                Avg Order
                                                            </th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-200">
                                                        {report.topProducts.map(
                                                            (product: any, index: number) => (
                                                                <tr
                                                                    key={index}
                                                                    className="hover:bg-gray-50"
                                                                >
                                                                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                                                        <Link
                                                                            to={`/org/${orgId}/products/${product.id}`}
                                                                            className="hover:underline"
                                                                        >
                                                                            {product.name}
                                                                        </Link>
                                                                    </td>
                                                                    <td className="px-4 py-3 text-sm text-gray-600">
                                                                        {product.quantity}
                                                                    </td>
                                                                    <td className="px-4 py-3 text-sm font-semibold text-emerald-600">
                                                                        {formatCurrency(
                                                                            product.revenue
                                                                        )}
                                                                    </td>
                                                                    <td className="px-4 py-3 text-sm text-gray-600">
                                                                        {product.orders}
                                                                    </td>
                                                                    <td className="px-4 py-3 text-sm text-gray-600">
                                                                        {formatCurrency(
                                                                            product.revenue /
                                                                                product.orders
                                                                        )}
                                                                    </td>
                                                                </tr>
                                                            )
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center py-12 px-4">
                                                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                                    <svg
                                                        className="w-8 h-8 text-gray-400"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        viewBox="0 0 24 24"
                                                    >
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            strokeWidth={2}
                                                            d="M20 7l-8-4-8 4m16 0l-8 4-8-4m16 0v10l-8 4-8-4V7"
                                                        />
                                                    </svg>
                                                </div>
                                                <h3 className="text-lg font-medium text-gray-900 mb-2">
                                                    No Products Found
                                                </h3>
                                                <p className="text-gray-500 text-center max-w-sm">
                                                    No product data available for this time period.
                                                    Try adjusting your date range or check if there
                                                    are any orders in this timespan.
                                                </p>
                                            </div>
                                        )}
                                    </>
                                )}

                                {/* Other tabs implementation continues here with the same compact styling... */}

                                {/* Customers Tab */}
                                {activeTab === "customers" && (
                                    <>
                                        {report.topCustomers?.length > 0 ? (
                                            <div className="overflow-x-auto">
                                                <table className="w-full">
                                                    <thead>
                                                        <tr className="bg-gray-50">
                                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                                                Customer
                                                            </th>
                                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                                                Orders
                                                            </th>
                                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                                                Revenue
                                                            </th>
                                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                                                Avg Order
                                                            </th>
                                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                                                Contact
                                                            </th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-200">
                                                        {report.topCustomers.map(
                                                            (customer: any, index: number) => (
                                                                <tr
                                                                    key={index}
                                                                    className="hover:bg-gray-50"
                                                                >
                                                                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                                                        <Link
                                                                            to={`/org/${orgId}/entity/${customer.id}`}
                                                                            className="hover:underline"
                                                                        >
                                                                            {customer.name}
                                                                        </Link>
                                                                    </td>
                                                                    <td className="px-4 py-3 text-sm text-gray-600">
                                                                        {customer.orders}
                                                                    </td>
                                                                    <td className="px-4 py-3 text-sm font-semibold text-emerald-600">
                                                                        {formatCurrency(
                                                                            customer.revenue
                                                                        )}
                                                                    </td>
                                                                    <td className="px-4 py-3 text-sm text-gray-600">
                                                                        {formatCurrency(
                                                                            customer.revenue /
                                                                                customer.orders
                                                                        )}
                                                                    </td>
                                                                    <td className="px-4 py-3 text-sm text-gray-600">
                                                                        {customer.phone ||
                                                                            customer.email ||
                                                                            "N/A"}
                                                                    </td>
                                                                </tr>
                                                            )
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center py-12 px-4">
                                                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                                    <svg
                                                        className="w-8 h-8 text-gray-400"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        viewBox="0 0 24 24"
                                                    >
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            strokeWidth={2}
                                                            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                                                        />
                                                    </svg>
                                                </div>
                                                <h3 className="text-lg font-medium text-gray-900 mb-2">
                                                    No Customers Found
                                                </h3>
                                                <p className="text-gray-500 text-center max-w-sm">
                                                    No customer data available for this time period.
                                                    Try adjusting your date range or check if there
                                                    are any orders in this timespan.
                                                </p>
                                            </div>
                                        )}
                                    </>
                                )}

                                {/* Payments Tab */}
                                {activeTab === "payments" && (
                                    <>
                                        {report.paymentAnalysis ? (
                                            <div className="space-y-4">
                                                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                                                    <div className="bg-gradient-to-br from-emerald-50 to-green-100 rounded-xl p-4 border border-emerald-200">
                                                        <div className="text-center">
                                                            <p className="text-3xl font-bold text-emerald-600">
                                                                {report.paymentAnalysis.paid || 0}
                                                            </p>
                                                            <p className="text-xs text-gray-600 font-medium mt-1">
                                                                Paid
                                                            </p>
                                                            <p className="text-xs text-emerald-600 font-semibold">
                                                                {report.paymentAnalysis
                                                                    .paymentStatusPercentages
                                                                    ?.paid || 0}
                                                                %
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="bg-gradient-to-br from-yellow-50 to-amber-100 rounded-xl p-4 border border-yellow-200">
                                                        <div className="text-center">
                                                            <p className="text-3xl font-bold text-yellow-600">
                                                                {report.paymentAnalysis.pending ||
                                                                    0}
                                                            </p>
                                                            <p className="text-xs text-gray-600 font-medium mt-1">
                                                                Pending
                                                            </p>
                                                            <p className="text-xs text-yellow-600 font-semibold">
                                                                {report.paymentAnalysis
                                                                    .paymentStatusPercentages
                                                                    ?.pending || 0}
                                                                %
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 border border-orange-200">
                                                        <div className="text-center">
                                                            <p className="text-3xl font-bold text-orange-600">
                                                                {report.paymentAnalysis.partial ||
                                                                    0}
                                                            </p>
                                                            <p className="text-xs text-gray-600 font-medium mt-1">
                                                                Partial
                                                            </p>
                                                            <p className="text-xs text-orange-600 font-semibold">
                                                                {report.paymentAnalysis
                                                                    .paymentStatusPercentages
                                                                    ?.partial || 0}
                                                                %
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-4 border border-red-200">
                                                        <div className="text-center">
                                                            <p className="text-3xl font-bold text-red-600">
                                                                {report.paymentAnalysis.cancelled ||
                                                                    0}
                                                            </p>
                                                            <p className="text-xs text-gray-600 font-medium mt-1">
                                                                Cancelled
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
                                                        <div className="text-center">
                                                            <p className="text-3xl font-bold text-purple-600">
                                                                {report.paymentAnalysis.refunded ||
                                                                    0}
                                                            </p>
                                                            <p className="text-xs text-gray-600 font-medium mt-1">
                                                                Refunded
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="bg-white/60 rounded-xl p-4 border border-gray-200/30">
                                                    <h4 className="text-sm font-semibold text-gray-800 mb-3">
                                                        💰 Revenue by Payment Status
                                                    </h4>
                                                    <div className="space-y-2">
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-sm text-gray-600">
                                                                Paid Revenue
                                                            </span>
                                                            <span className="font-semibold text-emerald-600">
                                                                {formatCurrency(
                                                                    report.paymentAnalysis
                                                                        .revenueByStatus?.paid || 0
                                                                )}
                                                            </span>
                                                        </div>
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-sm text-gray-600">
                                                                Pending Revenue
                                                            </span>
                                                            <span className="font-semibold text-yellow-600">
                                                                {formatCurrency(
                                                                    report.paymentAnalysis
                                                                        .revenueByStatus?.pending ||
                                                                        0
                                                                )}
                                                            </span>
                                                        </div>
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-sm text-gray-600">
                                                                Partial Revenue
                                                            </span>
                                                            <span className="font-semibold text-orange-600">
                                                                {formatCurrency(
                                                                    report.paymentAnalysis
                                                                        .revenueByStatus?.partial ||
                                                                        0
                                                                )}
                                                            </span>
                                                        </div>
                                                        <div className="flex justify-between items-center pt-2 border-t">
                                                            <span className="text-sm font-semibold text-gray-900">
                                                                Total Orders
                                                            </span>
                                                            <span className="font-bold text-gray-900">
                                                                {report.paymentAnalysis.total || 0}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center py-12 px-4">
                                                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                                    <svg
                                                        className="w-8 h-8 text-gray-400"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        viewBox="0 0 24 24"
                                                    >
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            strokeWidth={2}
                                                            d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                                                        />
                                                    </svg>
                                                </div>
                                                <h3 className="text-lg font-medium text-gray-900 mb-2">
                                                    No Payment Data Found
                                                </h3>
                                                <p className="text-gray-500 text-center max-w-sm">
                                                    No payment analysis data available for this time
                                                    period. Try adjusting your date range or check
                                                    if there are any orders in this timespan.
                                                </p>
                                            </div>
                                        )}
                                    </>
                                )}

                                {/* Daily Tab */}
                                {activeTab === "daily" && (
                                    <>
                                        {report.dailyBreakdown?.length > 0 ? (
                                            <TableComponent
                                                columns={dailyBreakdownColumns}
                                                data={report.dailyBreakdown}
                                                allowSearch={true}
                                                allowPagination={true}
                                                showFooter={true}
                                                allowExport={true}
                                                exportFileName="daily-breakdown"
                                                title="Daily Breakdown"
                                                description="Daily revenue, cost, and profit breakdown for the selected period"
                                                emptyStateMessage="No daily data available for this period"
                                            />
                                        ) : (
                                            <div className="flex flex-col items-center justify-center py-12 px-4">
                                                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                                    <svg
                                                        className="w-8 h-8 text-gray-400"
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
                                                </div>
                                                <h3 className="text-lg font-medium text-gray-900 mb-2">
                                                    No Daily Data Found
                                                </h3>
                                                <p className="text-gray-500 text-center max-w-sm">
                                                    No daily breakdown available for this time
                                                    period. Try adjusting your date range to see
                                                    daily analytics.
                                                </p>
                                            </div>
                                        )}
                                    </>
                                )}

                                {/* Transactions Tab */}
                                {activeTab === "transactions" && (
                                    <>
                                        {report.rawData?.transactions?.length > 0 ? (
                                            <TableComponent
                                                columns={transactionsColumns}
                                                data={report.rawData.transactions.slice(0, 50)}
                                                allowSearch={true}
                                                allowPagination={true}
                                                showFooter={true}
                                                allowExport={true}
                                                exportFileName="transactions-report"
                                                title="Recent Transactions"
                                                description="Detailed list of all transactions for the selected period"
                                                emptyStateMessage="No transaction data available for this time period"
                                            />
                                        ) : (
                                            <div className="flex flex-col items-center justify-center py-12 px-4">
                                                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                                    <svg
                                                        className="w-8 h-8 text-gray-400"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        viewBox="0 0 24 24"
                                                    >
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            strokeWidth={2}
                                                            d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                                                        />
                                                    </svg>
                                                </div>
                                                <h3 className="text-lg font-medium text-gray-900 mb-2">
                                                    No Transactions Found
                                                </h3>
                                                <p className="text-gray-500 text-center max-w-sm">
                                                    No transaction data available for this time
                                                    period. Transactions will appear here when
                                                    there's financial activity.
                                                </p>
                                            </div>
                                        )}
                                    </>
                                )}

                                {/* Orders Tab */}
                                {activeTab === "orders" && (
                                    <>
                                        {report.rawData?.orders?.length > 0 ? (
                                            <TableComponent
                                                columns={ordersColumns}
                                                data={report.rawData.orders.slice(0, 50)}
                                                allowSearch={true}
                                                allowPagination={true}
                                                showFooter={true}
                                                allowExport={true}
                                                exportFileName="orders-report"
                                                title="Recent Orders"
                                                description="Detailed list of all orders for the selected period"
                                                emptyStateMessage="No orders data available for this time period"
                                            />
                                        ) : (
                                            <div className="flex flex-col items-center justify-center py-12 px-4">
                                                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                                    <svg
                                                        className="w-8 h-8 text-gray-400"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        viewBox="0 0 24 24"
                                                    >
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            strokeWidth={2}
                                                            d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                                                        />
                                                    </svg>
                                                </div>
                                                <h3 className="text-lg font-medium text-gray-900 mb-2">
                                                    No Orders Found
                                                </h3>
                                                <p className="text-gray-500 text-center max-w-sm">
                                                    No orders available for this time period. Orders
                                                    will appear here when customers place buy or
                                                    sell orders.
                                                </p>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ReportPage;
