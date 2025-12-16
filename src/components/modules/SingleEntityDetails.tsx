import React, { useState, useMemo, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    User,
    Phone,
    Mail,
    FileText,
    TrendingUp,
    TrendingDown,
    Search,
    Download,
    ArrowUpCircle,
    ArrowDownCircle,
} from "lucide-react";

import { Account, Entity, Order, PaymentStatus } from "@/data/types";
import { Link } from "react-router-dom";
import AddEntity from "../modals/AddEntity";
import { api } from "@/utils/api";
import AddPaymentDialog from "../modals/AddPaymentDialog";

interface EntityPageProps {
    entity: Entity;
    accounts?: Account[];
}

interface FilterState {
    search: string;
    status: PaymentStatus | "ALL";
}

const EntityPage: React.FC<EntityPageProps> = React.memo(({ entity, accounts = [] }) => {
    // State for filters
    const [filters, setFilters] = useState<FilterState>({
        search: "",
        status: "ALL",
    });

    // Memoized calculation functions
    const calculateOrderPaidAmount = useCallback((order: Order): number => {
        return order.paidTillNow || 0;
    }, []);

    const calculateOrderRemaining = useCallback(
        (order: Order): number => {
            const paidAmount = calculateOrderPaidAmount(order);
            return order.totalAmount - paidAmount;
        },
        [calculateOrderPaidAmount]
    );

    // Separate buy and sell orders
    const { buyOrders, sellOrders } = useMemo(() => {
        if (!entity.orders) return { buyOrders: [], sellOrders: [] };

        return {
            buyOrders: entity.orders.filter((order) => order.type === "BUY"),
            sellOrders: entity.orders.filter((order) => order.type === "SELL"),
        };
    }, [entity.orders]);

    // Memoized order statistics calculation with proper buy/sell logic
    const stats = useMemo(() => {
        if (!entity.orders || entity.orders.length === 0) {
            return {
                totalOrders: 0,
                // Buy orders - amounts we owe to entity
                totalBuyAmount: 0,
                totalBuyPaid: 0,
                totalBuyRemaining: 0, // Amount to give
                // Sell orders - amounts entity owes us
                totalSellAmount: 0,
                totalSellPaid: 0,
                totalSellRemaining: 0, // Amount to take
                // Net balance
                netBalance: 0, // Positive = we owe entity, Negative = entity owes us
                paidOrders: 0,
                pendingOrders: 0,
            };
        }

        let totalBuyAmount = 0;
        let totalBuyPaid = 0;
        let totalSellAmount = 0;
        let totalSellPaid = 0;
        let paidOrders = 0;
        let pendingOrders = 0;

        entity.orders.forEach((order) => {
            const paidAmount = calculateOrderPaidAmount(order);

            if (order.type === "BUY") {
                // Buy orders - we owe money to the entity
                totalBuyAmount += order.totalAmount;
                totalBuyPaid += paidAmount;
            } else if (order.type === "SELL") {
                // Sell orders - entity owes money to us
                totalSellAmount += order.totalAmount;
                totalSellPaid += paidAmount;
            }

            switch (order.paymentStatus) {
                case "PAID":
                    paidOrders++;
                    break;
                case "PENDING":
                case "PARTIAL":
                    pendingOrders++;
                    break;
            }
        });

        const totalBuyRemaining = totalBuyAmount - totalBuyPaid;
        const totalSellRemaining = totalSellAmount - totalSellPaid;
        const netBalance = totalBuyRemaining - totalSellRemaining; // Positive = we owe, Negative = they owe

        return {
            totalOrders: entity.orders.length,
            totalBuyAmount,
            totalBuyPaid,
            totalBuyRemaining,
            totalSellAmount,
            totalSellPaid,
            totalSellRemaining,
            netBalance,
            paidOrders,
            pendingOrders,
        };
    }, [entity.orders, calculateOrderPaidAmount]);

    // Filtered orders (sorted by date, newest first)
    const filteredBuyOrders = useMemo(() => {
        if (!buyOrders) return [];

        let filtered = buyOrders.filter((order) => {
            // Search filter
            if (filters.search) {
                const searchTerm = filters.search.toLowerCase();
                const matchesSearch =
                    order.orderNumber.toLowerCase().includes(searchTerm) ||
                    (order.description && order.description.toLowerCase().includes(searchTerm));
                if (!matchesSearch) return false;
            }

            // Status filter
            if (filters.status !== "ALL" && order.paymentStatus !== filters.status) {
                return false;
            }

            return true;
        });

        // Sort by date (newest first)
        filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        return filtered;
    }, [buyOrders, filters]);

    const filteredSellOrders = useMemo(() => {
        if (!sellOrders) return [];

        let filtered = sellOrders.filter((order) => {
            // Search filter
            if (filters.search) {
                const searchTerm = filters.search.toLowerCase();
                const matchesSearch =
                    order.orderNumber.toLowerCase().includes(searchTerm) ||
                    (order.description && order.description.toLowerCase().includes(searchTerm));
                if (!matchesSearch) return false;
            }

            // Status filter
            if (filters.status !== "ALL" && order.paymentStatus !== filters.status) {
                return false;
            }

            return true;
        });

        // Sort by date (newest first)
        filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        return filtered;
    }, [sellOrders, filters]);

    const getPaymentStatusBadge = useCallback((status: PaymentStatus) => {
        const variants: Record<PaymentStatus, string> = {
            PAID: "bg-green-100 text-green-800 border-green-200",
            PENDING: "bg-yellow-100 text-yellow-800 border-yellow-200",
            PARTIAL: "bg-blue-100 text-blue-800 border-blue-200",
            FAILED: "bg-red-100 text-red-800 border-red-200",
            CANCELLED: "bg-gray-100 text-gray-800 border-gray-200",
        };

        return <Badge className={variants[status]}>{status}</Badge>;
    }, []);

    const formatCurrency = useCallback((amount: number) => {
        return `Nrs ${amount.toLocaleString("en-NP", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        })}`;
    }, []);

    const formatDate = useCallback((dateString: string) => {
        return new Date(dateString).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    }, []);

    // Export functionality
    const exportToCSV = useCallback(() => {
        const timestamp = new Date().toISOString().split("T")[0];
        const allOrders = [...filteredBuyOrders, ...filteredSellOrders].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        // Build properly formatted CSV with clean sections
        const lines = [];

        // Entity Information Section
        lines.push("ENTITY INFORMATION");
        lines.push("Field,Value");
        lines.push(`Name,"${entity.name}"`);
        lines.push(`Phone,${entity.phone}`);
        lines.push(`Email,"${entity.email || "N/A"}"`);
        if (entity.description) {
            lines.push(`Description,"${entity.description.replace(/"/g, '""')}"`);
        }
        lines.push(`Report Generated,"${new Date().toLocaleString()}"`);
        lines.push("");
        lines.push("");

        // Financial Summary Section
        lines.push("FINANCIAL SUMMARY");
        lines.push("Category,Amount (NPR)");
        lines.push(
            `Net Balance - ${
                stats.netBalance >= 0 ? "Amount to Give" : "Amount to Take"
            },${Math.abs(stats.netBalance).toFixed(2)}`
        );
        lines.push(`Total Orders,${stats.totalOrders}`);
        lines.push(`Paid Orders,${stats.paidOrders}`);
        lines.push(`Pending Orders,${stats.pendingOrders}`);
        lines.push("");

        // Buy Orders Summary
        lines.push("BUY ORDERS SUMMARY (Amount to Give)");
        lines.push("Metric,Value");
        lines.push(`Total Amount,${stats.totalBuyAmount.toFixed(2)}`);
        lines.push(`Paid Amount,${stats.totalBuyPaid.toFixed(2)}`);
        lines.push(`Remaining Due,${stats.totalBuyRemaining.toFixed(2)}`);
        lines.push(
            `Payment Progress,${
                stats.totalBuyAmount > 0
                    ? ((stats.totalBuyPaid / stats.totalBuyAmount) * 100).toFixed(1)
                    : 0
            }%`
        );
        lines.push("");

        // Sell Orders Summary
        lines.push("SELL ORDERS SUMMARY (Amount to Take)");
        lines.push("Metric,Value");
        lines.push(`Total Amount,${stats.totalSellAmount.toFixed(2)}`);
        lines.push(`Received Amount,${stats.totalSellPaid.toFixed(2)}`);
        lines.push(`Remaining Due,${stats.totalSellRemaining.toFixed(2)}`);
        lines.push(
            `Collection Progress,${
                stats.totalSellAmount > 0
                    ? ((stats.totalSellPaid / stats.totalSellAmount) * 100).toFixed(1)
                    : 0
            }%`
        );
        lines.push("");
        lines.push("");

        // All Orders Details
        lines.push("ALL ORDERS DETAILS");
        lines.push(
            "Order Number,Type,Status,Date,Total Amount,Paid Amount,Remaining,Progress %,Description"
        );

        allOrders.forEach((order) => {
            const paidAmount = calculateOrderPaidAmount(order);
            const remaining = calculateOrderRemaining(order);
            const progress =
                order.totalAmount > 0 ? ((paidAmount / order.totalAmount) * 100).toFixed(1) : 0;
            const description = (order.description || "").replace(/"/g, '""');

            lines.push(
                `${order.orderNumber},${order.type},${order.paymentStatus},${formatDate(
                    order.createdAt
                )},${order.totalAmount.toFixed(2)},${paidAmount.toFixed(2)},${remaining.toFixed(
                    2
                )},${progress},"${description}"`
            );
        });

        const csvContent = lines.join("\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const sanitizedName = entity.name.replace(/[^a-z0-9]/gi, "_");
        a.download = `${sanitizedName}_Report_${timestamp}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }, [
        filteredBuyOrders,
        filteredSellOrders,
        entity,
        stats,
        calculateOrderPaidAmount,
        calculateOrderRemaining,
        formatDate,
        formatCurrency,
    ]);

    const exportToPDF = useCallback(async () => {
        const printWindow = window.open("", "_blank");
        if (!printWindow) return;

        const timestamp = new Date().toLocaleString();
        const allOrders = [...filteredBuyOrders, ...filteredSellOrders].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>${entity.name} - Entity Report</title>
                <meta charset="utf-8">
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { 
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                        padding: 40px; 
                        color: #1f2937;
                        line-height: 1.6;
                    }
                    .header { 
                        border-bottom: 3px solid #2563eb; 
                        padding-bottom: 20px; 
                        margin-bottom: 30px; 
                    }
                    .header h1 { 
                        color: #1e3a8a; 
                        font-size: 28px; 
                        margin-bottom: 10px; 
                    }
                    .header-info { 
                        display: grid; 
                        grid-template-columns: repeat(2, 1fr); 
                        gap: 8px; 
                        margin-top: 15px;
                        font-size: 14px;
                    }
                    .header-info p { color: #4b5563; }
                    .header-info strong { color: #1f2937; }
                    
                    .summary { margin-bottom: 30px; }
                    .summary h2 { 
                        color: #1e3a8a; 
                        font-size: 18px; 
                        margin-bottom: 15px; 
                        border-bottom: 2px solid #e5e7eb;
                        padding-bottom: 8px;
                    }
                    
                    .net-balance { 
                        background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
                        border: 2px solid #3b82f6;
                        border-radius: 8px;
                        padding: 20px;
                        margin-bottom: 20px;
                        text-align: center;
                    }
                    .net-balance h3 { 
                        font-size: 14px; 
                        color: #1e40af; 
                        margin-bottom: 8px; 
                    }
                    .net-balance .amount { 
                        font-size: 32px; 
                        font-weight: bold; 
                        color: ${stats.netBalance >= 0 ? "#dc2626" : "#059669"};
                        margin-bottom: 5px;
                    }
                    .net-balance .label { 
                        font-size: 13px; 
                        color: #4b5563; 
                    }
                    
                    .stats-grid { 
                        display: grid; 
                        grid-template-columns: repeat(2, 1fr); 
                        gap: 15px; 
                        margin-bottom: 30px; 
                    }
                    .stat-card { 
                        border: 1px solid #e5e7eb; 
                        border-radius: 8px; 
                        padding: 15px; 
                    }
                    .stat-card.buy { background-color: #fef2f2; border-color: #fca5a5; }
                    .stat-card.sell { background-color: #f0fdf4; border-color: #86efac; }
                    .stat-card h3 { 
                        font-size: 14px; 
                        margin-bottom: 12px; 
                        color: #374151;
                    }
                    .stat-card.buy h3 { color: #991b1b; }
                    .stat-card.sell h3 { color: #14532d; }
                    .stat-row { 
                        display: flex; 
                        justify-content: space-between; 
                        padding: 6px 0; 
                        font-size: 13px;
                        border-bottom: 1px solid #e5e7eb;
                    }
                    .stat-row:last-child { border-bottom: none; font-weight: bold; }
                    .stat-label { color: #6b7280; }
                    .stat-value { font-weight: 500; }
                    .stat-card.buy .stat-value { color: #991b1b; }
                    .stat-card.sell .stat-value { color: #14532d; }
                    
                    .orders-section { margin-top: 30px; page-break-inside: avoid; }
                    .orders-section h2 { 
                        color: #1e3a8a; 
                        font-size: 18px; 
                        margin-bottom: 15px; 
                        border-bottom: 2px solid #e5e7eb;
                        padding-bottom: 8px;
                    }
                    
                    table { 
                        width: 100%; 
                        border-collapse: collapse; 
                        margin-top: 10px; 
                        font-size: 12px;
                    }
                    th { 
                        background-color: #f3f4f6; 
                        padding: 10px 8px; 
                        text-align: left; 
                        font-weight: 600;
                        border: 1px solid #d1d5db;
                        color: #374151;
                    }
                    td { 
                        padding: 10px 8px; 
                        border: 1px solid #e5e7eb; 
                    }
                    tr:nth-child(even) { background-color: #f9fafb; }
                    .currency { text-align: right; font-family: 'Courier New', monospace; }
                    .type-badge { 
                        display: inline-block;
                        padding: 3px 8px;
                        border-radius: 4px;
                        font-size: 11px;
                        font-weight: 600;
                    }
                    .type-buy { background-color: #fee2e2; color: #991b1b; }
                    .type-sell { background-color: #d1fae5; color: #065f46; }
                    .status-badge {
                        display: inline-block;
                        padding: 3px 8px;
                        border-radius: 4px;
                        font-size: 11px;
                        font-weight: 600;
                    }
                    .status-PAID { background-color: #d1fae5; color: #065f46; }
                    .status-PENDING { background-color: #fef3c7; color: #92400e; }
                    .status-PARTIAL { background-color: #dbeafe; color: #1e40af; }
                    .progress-bar {
                        height: 6px;
                        background-color: #e5e7eb;
                        border-radius: 3px;
                        overflow: hidden;
                    }
                    .progress-fill {
                        height: 100%;
                        background-color: #3b82f6;
                        transition: width 0.3s;
                    }
                    .footer { 
                        margin-top: 40px; 
                        padding-top: 20px; 
                        border-top: 1px solid #e5e7eb; 
                        text-align: center;
                        font-size: 11px;
                        color: #9ca3af;
                    }
                    @media print {
                        body { padding: 20px; }
                        .stat-card, .orders-section { page-break-inside: avoid; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>📊 ${entity.name}</h1>
                    <div class="header-info">
                        <p><strong>Phone:</strong> ${entity.phone}</p>
                        <p><strong>Email:</strong> ${entity.email || "N/A"}</p>
                        ${
                            entity.description
                                ? `<p style="grid-column: 1 / -1;"><strong>Description:</strong> ${entity.description}</p>`
                                : ""
                        }
                        <p style="grid-column: 1 / -1;"><strong>Report Generated:</strong> ${timestamp}</p>
                    </div>
                </div>
                
                <div class="summary">
                    <h2>Financial Summary</h2>
                    
                    <div class="net-balance">
                        <h3>Net Balance</h3>
                        <div class="amount">${formatCurrency(Math.abs(stats.netBalance))}</div>
                        <div class="label">${
                            stats.netBalance >= 0 ? "Amount to Give" : "Amount to Take"
                        }</div>
                    </div>
                    
                    <div class="stats-grid">
                        <div class="stat-card buy">
                            <h3>📥 Buy Orders (Amount to Give)</h3>
                            <div class="stat-row">
                                <span class="stat-label">Total Amount:</span>
                                <span class="stat-value">${formatCurrency(
                                    stats.totalBuyAmount
                                )}</span>
                            </div>
                            <div class="stat-row">
                                <span class="stat-label">Paid:</span>
                                <span class="stat-value">${formatCurrency(
                                    stats.totalBuyPaid
                                )}</span>
                            </div>
                            <div class="stat-row">
                                <span class="stat-label">Remaining Due:</span>
                                <span class="stat-value">${formatCurrency(
                                    stats.totalBuyRemaining
                                )}</span>
                            </div>
                            <div class="stat-row">
                                <span class="stat-label">Progress:</span>
                                <span class="stat-value">${
                                    stats.totalBuyAmount > 0
                                        ? (
                                              (stats.totalBuyPaid / stats.totalBuyAmount) *
                                              100
                                          ).toFixed(1)
                                        : 0
                                }%</span>
                            </div>
                        </div>
                        
                        <div class="stat-card sell">
                            <h3>📤 Sell Orders (Amount to Take)</h3>
                            <div class="stat-row">
                                <span class="stat-label">Total Amount:</span>
                                <span class="stat-value">${formatCurrency(
                                    stats.totalSellAmount
                                )}</span>
                            </div>
                            <div class="stat-row">
                                <span class="stat-label">Received:</span>
                                <span class="stat-value">${formatCurrency(
                                    stats.totalSellPaid
                                )}</span>
                            </div>
                            <div class="stat-row">
                                <span class="stat-label">Remaining Due:</span>
                                <span class="stat-value">${formatCurrency(
                                    stats.totalSellRemaining
                                )}</span>
                            </div>
                            <div class="stat-row">
                                <span class="stat-label">Progress:</span>
                                <span class="stat-value">${
                                    stats.totalSellAmount > 0
                                        ? (
                                              (stats.totalSellPaid / stats.totalSellAmount) *
                                              100
                                          ).toFixed(1)
                                        : 0
                                }%</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="stats-grid">
                        <div class="stat-card">
                            <div class="stat-row">
                                <span class="stat-label">Total Orders:</span>
                                <span class="stat-value">${stats.totalOrders}</span>
                            </div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-row">
                                <span class="stat-label">Paid:</span>
                                <span class="stat-value" style="color: #059669;">${
                                    stats.paidOrders
                                }</span>
                            </div>
                            <div class="stat-row">
                                <span class="stat-label">Pending:</span>
                                <span class="stat-value" style="color: #dc2626;">${
                                    stats.pendingOrders
                                }</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="orders-section">
                    <h2>Order Details</h2>
                    <table>
                        <thead>
                            <tr>
                                <th>Order #</th>
                                <th>Type</th>
                                <th>Status</th>
                                <th>Date</th>
                                <th class="currency">Total</th>
                                <th class="currency">Paid</th>
                                <th class="currency">Remaining</th>
                                <th style="text-align: center;">Progress</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${allOrders
                                .map((order) => {
                                    const paidAmount = calculateOrderPaidAmount(order);
                                    const remaining = calculateOrderRemaining(order);
                                    const progress =
                                        order.totalAmount > 0
                                            ? (paidAmount / order.totalAmount) * 100
                                            : 0;
                                    return `
                                    <tr>
                                        <td>
                                            <strong>${order.orderNumber}</strong>
                                            ${
                                                order.description
                                                    ? `<br><small style="color: #6b7280;">${order.description}</small>`
                                                    : ""
                                            }
                                        </td>
                                        <td><span class="type-badge type-${order.type.toLowerCase()}">${
                                        order.type
                                    }</span></td>
                                        <td><span class="status-badge status-${
                                            order.paymentStatus
                                        }">${order.paymentStatus}</span></td>
                                        <td>${formatDate(order.createdAt)}</td>
                                        <td class="currency"><strong>${formatCurrency(
                                            order.totalAmount
                                        )}</strong></td>
                                        <td class="currency" style="color: #059669;">${formatCurrency(
                                            paidAmount
                                        )}</td>
                                        <td class="currency" style="color: ${
                                            remaining > 0 ? "#dc2626" : "#059669"
                                        }; font-weight: bold;">${formatCurrency(remaining)}</td>
                                        <td style="text-align: center;">
                                            <div class="progress-bar">
                                                <div class="progress-fill" style="width: ${progress}%;"></div>
                                            </div>
                                            <small>${progress.toFixed(0)}%</small>
                                        </td>
                                    </tr>
                                `;
                                })
                                .join("")}
                        </tbody>
                    </table>
                </div>
                
                <div class="footer">
                    <p>This report was generated automatically. All amounts are in Nepalese Rupees (NPR).</p>
                </div>
                
                <script>
                    window.onload = function() {
                        setTimeout(function() {
                            window.print();
                        }, 250);
                    };
                </script>
            </body>
            </html>
        `;

        printWindow.document.write(html);
        printWindow.document.close();
    }, [
        entity,
        stats,
        filteredBuyOrders,
        filteredSellOrders,
        calculateOrderPaidAmount,
        calculateOrderRemaining,
        formatDate,
        formatCurrency,
    ]);

    // Filter handlers
    const handleFilterChange = useCallback((key: keyof FilterState, value: string) => {
        setFilters((prev) => ({ ...prev, [key]: value }));
    }, []);

    const handleAddPayment = useCallback(
        async (amount: number, accountId: string) => {
            if (amount <= 0) {
                return;
            }
            let remainingAmount = amount;
            const toPayOrders: {
                orderId: string;
                accountId: string;
                amount: number;
            }[] = [];

            // Prioritize buy orders (money we owe to entity) first
            const ordersToProcess = entity.orders
                ? [...entity.orders]
                      .filter((order) => calculateOrderRemaining(order) > 0)
                      .sort((a, b) => {
                          // Buy orders first (we owe money), then by date
                          if (a.type === "BUY" && b.type !== "BUY") return -1;
                          if (b.type === "BUY" && a.type !== "BUY") return 1;
                          return a.createdAt.localeCompare(b.createdAt);
                      })
                : [];

            for (const order of ordersToProcess) {
                if (remainingAmount <= 0) {
                    break;
                }
                const toPay = calculateOrderRemaining(order);
                if (toPay <= 0) continue;
                const remaining = Math.min(remainingAmount, toPay);
                remainingAmount -= remaining;
                if (remaining > 0) {
                    toPayOrders.push({
                        orderId: order.id,
                        accountId: accountId,
                        amount: remaining,
                    });
                }
            }

            try {
                await Promise.all(
                    toPayOrders.map(async (order) => {
                        await api.post(
                            `/orgs/${entity.organizationId}/orders/${order.orderId}/transactions`,
                            {
                                amount: order.amount,
                                accountId: order.accountId,
                                details: {
                                    type: "PAYMENT",
                                    description: `Payment for Order ${order.orderId}`,
                                },
                            }
                        );
                    })
                );
                window.location.reload();
            } catch (error) {
                console.error("Error adding payment:", error);
            }
        },
        [entity.orders, entity.organizationId, calculateOrderRemaining]
    );
    return (
        <div className="max-w-7xl mx-auto p-4 space-y-4">
            {/* Entity Header */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                            <User className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-lg font-semibold text-gray-900">{entity.name}</h1>
                            <div className="flex items-center space-x-4 text-sm text-gray-500">
                                <span className="flex items-center space-x-1">
                                    <Phone className="h-3 w-3" />
                                    <span>{entity.phone}</span>
                                </span>
                                {entity.email && (
                                    <span className="flex items-center space-x-1">
                                        <Mail className="h-3 w-3" />
                                        <span>{entity.email}</span>
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={exportToCSV}
                            className="h-8 px-2"
                        >
                            <Download className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={exportToPDF}
                            className="h-8 px-2"
                        >
                            <FileText className="h-4 w-4" />
                        </Button>
                        <AddPaymentDialog
                            accounts={accounts}
                            type="MISC"
                            remainingAmount={Math.abs(stats.netBalance)}
                            onAddPayment={handleAddPayment}
                        />
                        <AddEntity
                            entity={entity}
                            addEntity={async (updates) => {
                                const newEntity = { ...entity, ...updates };
                                await api.put(
                                    `/orgs/${entity.organizationId}/entities/${entity.id}`,
                                    newEntity
                                );
                                window.location.reload();
                            }}
                            text="Edit"
                        />
                    </div>
                </div>
                {entity.description && (
                    <div className="mt-3 p-2 bg-blue-50 rounded-md text-sm text-gray-600">
                        {entity.description}
                    </div>
                )}
            </div>

            {/* Financial Summary */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Financial Summary</h2>

                {/* Net Balance Card */}
                <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-sm font-medium text-gray-600">Net Balance</h3>
                            <div className="flex items-center space-x-2 mt-1">
                                {stats.netBalance >= 0 ? (
                                    <ArrowUpCircle className="h-5 w-5 text-red-500" />
                                ) : (
                                    <ArrowDownCircle className="h-5 w-5 text-green-500" />
                                )}
                                <span
                                    className={`text-2xl font-bold ${
                                        stats.netBalance >= 0 ? "text-red-600" : "text-green-600"
                                    }`}
                                >
                                    {formatCurrency(Math.abs(stats.netBalance))}
                                </span>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                                {stats.netBalance >= 0
                                    ? "You owe this entity"
                                    : "This entity owes you"}
                            </p>
                        </div>
                        <div className="text-right">
                            <div className="text-sm text-gray-600">Total Orders</div>
                            <div className="text-xl font-bold">{stats.totalOrders}</div>
                        </div>
                    </div>
                </div>

                {/* Buy & Sell Summary */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Buy Orders Summary */}
                    <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                        <div className="flex items-center space-x-2 mb-3">
                            <TrendingDown className="h-5 w-5 text-red-600" />
                            <h3 className="font-semibold text-red-900">
                                Buy Orders (Amount to Give)
                            </h3>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-600">Total Amount:</span>
                                <span className="font-medium">
                                    {formatCurrency(stats.totalBuyAmount)}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-600">Paid:</span>
                                <span className="font-medium text-green-600">
                                    {formatCurrency(stats.totalBuyPaid)}
                                </span>
                            </div>
                            <div className="flex justify-between border-t border-red-200 pt-2">
                                <span className="font-medium text-gray-900">Remaining:</span>
                                <span className="font-bold text-red-600">
                                    {formatCurrency(stats.totalBuyRemaining)}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Sell Orders Summary */}
                    <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                        <div className="flex items-center space-x-2 mb-3">
                            <TrendingUp className="h-5 w-5 text-green-600" />
                            <h3 className="font-semibold text-green-900">
                                Sell Orders (Amount to Take)
                            </h3>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-600">Total Amount:</span>
                                <span className="font-medium">
                                    {formatCurrency(stats.totalSellAmount)}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-600">Received:</span>
                                <span className="font-medium text-green-600">
                                    {formatCurrency(stats.totalSellPaid)}
                                </span>
                            </div>
                            <div className="flex justify-between border-t border-green-200 pt-2">
                                <span className="font-medium text-gray-900">Remaining:</span>
                                <span className="font-bold text-green-600">
                                    {formatCurrency(stats.totalSellRemaining)}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Simple Search and Status Filter */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">Order Details</h2>
                    <div className="flex gap-2 w-full sm:w-auto">
                        <div className="relative flex-1 sm:w-64">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                placeholder="Search orders..."
                                value={filters.search}
                                onChange={(e) => handleFilterChange("search", e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        <Select
                            value={filters.status}
                            onValueChange={(value) => handleFilterChange("status", value)}
                        >
                            <SelectTrigger className="w-32">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">All Status</SelectItem>
                                <SelectItem value="PAID">Paid</SelectItem>
                                <SelectItem value="PENDING">Pending</SelectItem>
                                <SelectItem value="PARTIAL">Partial</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Buy Orders Section */}
                <div className="mb-6">
                    <div className="flex items-center space-x-2 mb-4">
                        <div className="flex items-center space-x-2">
                            <TrendingDown className="h-5 w-5 text-red-600" />
                            <h3 className="text-md font-semibold text-red-900">
                                Buy Orders - Amount to Give
                            </h3>
                        </div>
                        <Badge variant="secondary" className="bg-red-100 text-red-800">
                            {filteredBuyOrders.length}
                        </Badge>
                        {stats.totalBuyRemaining > 0 && (
                            <Badge className="bg-red-600 text-white">
                                Due: {formatCurrency(stats.totalBuyRemaining)}
                            </Badge>
                        )}
                    </div>

                    {filteredBuyOrders.length === 0 ? (
                        <div className="text-center py-6 bg-gray-50 rounded-lg">
                            <TrendingDown className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                            <p className="text-gray-500 text-sm">No buy orders found</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-b border-gray-200">
                                        <TableHead className="text-xs font-medium text-gray-600">
                                            Order
                                        </TableHead>
                                        <TableHead className="text-xs font-medium text-gray-600">
                                            Status
                                        </TableHead>
                                        <TableHead className="text-xs font-medium text-gray-600">
                                            Date
                                        </TableHead>
                                        <TableHead className="text-xs font-medium text-gray-600 text-right">
                                            Total
                                        </TableHead>
                                        <TableHead className="text-xs font-medium text-gray-600 text-right">
                                            Paid
                                        </TableHead>
                                        <TableHead className="text-xs font-medium text-gray-600 text-right">
                                            To Give
                                        </TableHead>
                                        <TableHead className="text-xs font-medium text-gray-600 text-center">
                                            Progress
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredBuyOrders.map((order) => {
                                        const paidAmount = order.paidTillNow || 0;
                                        const remaining = order.totalAmount - paidAmount;
                                        const progressPercentage =
                                            order.totalAmount > 0
                                                ? (paidAmount / order.totalAmount) * 100
                                                : 0;

                                        return (
                                            <TableRow
                                                key={order.id}
                                                className="hover:bg-red-50 border-b border-gray-100"
                                            >
                                                <TableCell className="py-3">
                                                    <Link
                                                        to={`/org/${entity.organizationId}/orders/${order.id}`}
                                                        className="text-blue-600 hover:underline font-medium text-sm"
                                                    >
                                                        {order.orderNumber}
                                                    </Link>
                                                    {order.description && (
                                                        <p className="text-xs text-gray-500 truncate">
                                                            {order.description}
                                                        </p>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    {getPaymentStatusBadge(order.paymentStatus)}
                                                </TableCell>
                                                <TableCell className="text-sm text-gray-600">
                                                    {formatDate(order.createdAt)}
                                                </TableCell>
                                                <TableCell className="text-right text-sm font-medium">
                                                    {formatCurrency(order.totalAmount)}
                                                </TableCell>
                                                <TableCell className="text-right text-sm font-medium text-green-600">
                                                    {formatCurrency(paidAmount)}
                                                </TableCell>
                                                <TableCell className="text-right text-sm font-bold text-red-600">
                                                    {formatCurrency(remaining)}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <div className="flex items-center space-x-2">
                                                        <div className="flex-1">
                                                            <Progress
                                                                value={progressPercentage}
                                                                className="h-2"
                                                            />
                                                        </div>
                                                        <span className="text-xs text-gray-500 min-w-[35px]">
                                                            {progressPercentage.toFixed(0)}%
                                                        </span>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </div>

                {/* Sell Orders Section */}
                <div>
                    <div className="flex items-center space-x-2 mb-4">
                        <div className="flex items-center space-x-2">
                            <TrendingUp className="h-5 w-5 text-green-600" />
                            <h3 className="text-md font-semibold text-green-900">
                                Sell Orders - Amount to Take
                            </h3>
                        </div>
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                            {filteredSellOrders.length}
                        </Badge>
                        {stats.totalSellRemaining > 0 && (
                            <Badge className="bg-green-600 text-white">
                                Due: {formatCurrency(stats.totalSellRemaining)}
                            </Badge>
                        )}
                    </div>

                    {filteredSellOrders.length === 0 ? (
                        <div className="text-center py-6 bg-gray-50 rounded-lg">
                            <TrendingUp className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                            <p className="text-gray-500 text-sm">No sell orders found</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-b border-gray-200">
                                        <TableHead className="text-xs font-medium text-gray-600">
                                            Order
                                        </TableHead>
                                        <TableHead className="text-xs font-medium text-gray-600">
                                            Status
                                        </TableHead>
                                        <TableHead className="text-xs font-medium text-gray-600">
                                            Date
                                        </TableHead>
                                        <TableHead className="text-xs font-medium text-gray-600 text-right">
                                            Total
                                        </TableHead>
                                        <TableHead className="text-xs font-medium text-gray-600 text-right">
                                            Received
                                        </TableHead>
                                        <TableHead className="text-xs font-medium text-gray-600 text-right">
                                            To Take
                                        </TableHead>
                                        <TableHead className="text-xs font-medium text-gray-600 text-center">
                                            Progress
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredSellOrders.map((order) => {
                                        const paidAmount = calculateOrderPaidAmount(order);
                                        const remaining = calculateOrderRemaining(order);
                                        const progressPercentage =
                                            order.totalAmount > 0
                                                ? (paidAmount / order.totalAmount) * 100
                                                : 0;

                                        return (
                                            <TableRow
                                                key={order.id}
                                                className="hover:bg-green-50 border-b border-gray-100"
                                            >
                                                <TableCell className="py-3">
                                                    <Link
                                                        to={`/org/${entity.organizationId}/orders/${order.id}`}
                                                        className="text-blue-600 hover:underline font-medium text-sm"
                                                    >
                                                        {order.orderNumber}
                                                    </Link>
                                                    {order.description && (
                                                        <p className="text-xs text-gray-500 truncate">
                                                            {order.description}
                                                        </p>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    {getPaymentStatusBadge(order.paymentStatus)}
                                                </TableCell>
                                                <TableCell className="text-sm text-gray-600">
                                                    {formatDate(order.createdAt)}
                                                </TableCell>
                                                <TableCell className="text-right text-sm font-medium">
                                                    {formatCurrency(order.totalAmount)}
                                                </TableCell>
                                                <TableCell className="text-right text-sm font-medium text-green-600">
                                                    {formatCurrency(paidAmount)}
                                                </TableCell>
                                                <TableCell className="text-right text-sm font-bold text-green-600">
                                                    {formatCurrency(remaining)}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <div className="flex items-center space-x-2">
                                                        <div className="flex-1">
                                                            <Progress
                                                                value={progressPercentage}
                                                                className="h-2"
                                                            />
                                                        </div>
                                                        <span className="text-xs text-gray-500 min-w-[35px]">
                                                            {progressPercentage.toFixed(0)}%
                                                        </span>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
});

EntityPage.displayName = "EntityPage";

export default EntityPage;
