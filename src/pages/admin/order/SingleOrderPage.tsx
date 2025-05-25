"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import type { Order, OrderItem, Transaction, Entity, Account } from "@/data/types";
import { useOrg } from "@/providers/org-provider";
import { api } from "@/utils/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
    TableFooter,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Printer, RefreshCw, ArrowLeft } from "lucide-react";
import AddPaymentDialog from "@/components/modals/AddPaymentDialog";
import { useToast } from "@/hooks/use-toast";

const SingleOrderPage = () => {
    const { orgId } = useOrg();
    const { orderId } = useParams<{ orderId: string }>();
    const navigate = useNavigate();
    const { toast } = useToast();

    const [order, setOrder] = useState<Order | null>(null);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [refreshing, setRefreshing] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const printContentRef = useRef<HTMLDivElement>(null);

    const fetchOrder = useCallback(async () => {
        if (!orgId || !orderId) return;

        try {
            setRefreshing(true);
            const response = await api.get(`/orgs/${orgId}/orders/${orderId}`);
            setOrder(response.data);
            setError(null);
        } catch (err) {
            setError("Failed to fetch order data");
            toast({
                title: "Error",
                description: "Failed to fetch order data",
                variant: "destructive",
            });
            setOrder(null);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [orgId, orderId, toast]);

    const fetchAccounts = useCallback(async () => {
        if (!orgId) return;

        try {
            const response = await api.get(`/orgs/${orgId}/accounts`);
            setAccounts(response.data);
        } catch (err) {
            console.error("Failed to fetch accounts", err);
            toast({
                title: "Error",
                description: "Failed to fetch accounts",
                variant: "destructive",
            });
        }
    }, [orgId, toast]);

    useEffect(() => {
        if (!orgId || !orderId) return;

        const loadData = async () => {
            setLoading(true);
            await Promise.all([fetchOrder(), fetchAccounts()]);
        };

        loadData();
    }, [orgId, orderId, fetchOrder, fetchAccounts]);

    const handlePrint = () => {
        if (printContentRef.current) {
            const printWindow = window.open("", "_blank");
            if (printWindow) {
                const styles = Array.from(document.styleSheets)
                    .map((styleSheet) => {
                        try {
                            return Array.from(styleSheet.cssRules)
                                .map((rule) => rule.cssText)
                                .join("\n");
                        } catch (e) {
                            return "";
                        }
                    })
                    .join("\n");

                printWindow.document.write(`
          <html>
            <head>
              <title>Order #${order?.orderNumber} - Invoice</title>
              <style>${styles}</style>
              <style>
                @media print {
                  @page { margin: 20mm; }
                  body { 
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                  }
                  .card {
                    border: 1px solid #e2e8f0;
                    border-radius: 0.375rem;
                    box-shadow: none;
                    break-inside: avoid;
                    page-break-inside: avoid;
                    margin-bottom: 1rem;
                  }
                  table { width: 100%; border-collapse: collapse; }
                  th, td { 
                    border: 1px solid #e2e8f0;
                    padding: 0.5rem;
                    text-align: left;
                  }
                  th { background-color: #f7fafc !important; }
                }
              </style>
            </head>
            <body>
              <div class="container mx-auto p-6">
                ${printContentRef.current.innerHTML}
              </div>
            </body>
          </html>
        `);
                printWindow.document.close();
                setTimeout(() => {
                    printWindow.print();
                }, 500);
            }
        }
    };

    const handleAddPayment = async (amount: number, accountId: string, details: object) => {
        try {
            setRefreshing(true);
            await api.post(`/orgs/${orgId}/orders/${orderId}/transactions`, {
                amount,
                accountId,
                details,
            });
            await fetchOrder();
            toast({
                title: "Success",
                description: "Payment added successfully",
            });
        } catch (err) {
            toast({
                title: "Error",
                description: "Failed to add payment",
                variant: "destructive",
            });
        } finally {
            setRefreshing(false);
        }
    };

    const handleRefresh = () => {
        fetchOrder();
    };

    const handleGoBack = () => {
        navigate(`/org/${orgId}/orders/view`);
    };

    if (loading) {
        return (
            <div className="container mx-auto p-6 space-y-4">
                <div className="flex justify-between items-center">
                    <Skeleton className="h-10 w-40" />
                    <Skeleton className="h-10 w-32" />
                </div>
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-64 w-full" />
            </div>
        );
    }

    if (error || !order) {
        return (
            <div className="container mx-auto p-6">
                <Alert variant="destructive">
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>
                        {error || "Order not found. Please try again later."}
                    </AlertDescription>
                </Alert>
                <div className="mt-4">
                    <Button variant="outline" onClick={handleGoBack}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex justify-between items-center print:hidden">
                <Breadcrumb>
                    <BreadcrumbList>
                        <BreadcrumbItem>
                            <BreadcrumbLink href={`/org/${orgId}/orders/view`}>
                                Orders
                            </BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            <BreadcrumbLink>Order #{order.orderNumber}</BreadcrumbLink>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>
                <div className="flex gap-4">
                    <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
                        <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                        Refresh
                    </Button>
                    <Button variant="outline" onClick={handlePrint}>
                        <Printer className="mr-2 h-4 w-4" /> Print Invoice
                    </Button>
                    {order.paymentStatus !== "PAID" && (
                        <AddPaymentDialog
                            remainingAmount={
                                order.totalAmount -
                                (order.transactions?.reduce(
                                    (sum, transaction) => sum + transaction.amount,
                                    0
                                ) || 0)
                            }
                            type={order.type}
                            accounts={accounts}
                            onAddPayment={handleAddPayment}
                        />
                    )}
                </div>
            </div>

            <div className="space-y-6 print:space-y-4" ref={printContentRef}>
                <OrderHeader order={order} />

                {order.entity && <EntityDetails entity={order.entity} />}

                {order.items && order.items.length > 0 && <OrderItems items={order.items} />}

                {order.transactions && order.transactions.length > 0 && (
                    <OrderTransactions transactions={order.transactions} />
                )}

                <OrderSummary order={order} />
            </div>
        </div>
    );
};

const OrderHeader = ({ order }: { order: Order }) => (
    <Card>
        <CardHeader className="bg-muted/50">
            <div className="flex justify-between items-center">
                <CardTitle className="text-2xl font-bold">Order #{order.orderNumber}</CardTitle>
                <Badge
                    variant={order.paymentStatus === "PAID" ? "outline" : "destructive"}
                    className="px-3 py-1 text-lg"
                >
                    {order.paymentStatus}
                </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
                Created: {new Date(order.createdAt).toLocaleDateString()} at{" "}
                {new Date(order.createdAt).toLocaleTimeString()}
            </p>
        </CardHeader>
        <CardContent className="pt-4">
            <div className="flex justify-end">
                <p className="text-xl font-semibold">Total: ${order.totalAmount.toFixed(2)}</p>
            </div>
        </CardContent>
    </Card>
);

const EntityDetails = ({ entity }: { entity: Entity }) => (
    <Card>
        <CardHeader className="bg-muted/50">
            <CardTitle>Customer Details</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <p className="font-medium text-sm text-muted-foreground">Name</p>
                    <p>{entity.name}</p>
                </div>
                <div>
                    <p className="font-medium text-sm text-muted-foreground">Phone</p>
                    <p>{entity.phone}</p>
                </div>
                {entity.email && (
                    <div>
                        <p className="font-medium text-sm text-muted-foreground">Email</p>
                        <p>{entity.email}</p>
                    </div>
                )}
                {entity.description && (
                    <div className="col-span-2">
                        <p className="font-medium text-sm text-muted-foreground">Description</p>
                        <p>{entity.description}</p>
                    </div>
                )}
            </div>
        </CardContent>
    </Card>
);

const OrderItems = ({ items }: { items: OrderItem[] }) => {
    const totalAmount = items.reduce((sum, item) => sum + item.quantity * item.price, 0);

    return (
        <Card>
            <CardHeader className="bg-muted/50">
                <CardTitle>Order Items</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Product</TableHead>
                            <TableHead className="text-right">Quantity</TableHead>
                            <TableHead className="text-right">Price</TableHead>
                            <TableHead className="text-right">Subtotal</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {items.map((item, index) => (
                            <TableRow key={item.id || index} className="hover:bg-muted/50">
                                <TableCell className="font-medium">{item.name}</TableCell>
                                <TableCell className="text-right">{item.quantity}</TableCell>
                                <TableCell className="text-right">
                                    ${item.price.toFixed(2)}
                                </TableCell>
                                <TableCell className="text-right">
                                    ${(item.quantity * item.price).toFixed(2)}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                    <TableFooter>
                        <TableRow>
                            <TableCell colSpan={3} className="text-right font-medium">
                                Total
                            </TableCell>
                            <TableCell className="text-right font-medium">
                                ${totalAmount.toFixed(2)}
                            </TableCell>
                        </TableRow>
                    </TableFooter>
                </Table>
            </CardContent>
        </Card>
    );
};

const OrderTransactions = ({ transactions }: { transactions: Transaction[] }) => {
    const totalAmount = transactions.reduce((sum, transaction) => sum + transaction.amount, 0);

    return (
        <Card>
            <CardHeader className="bg-muted/50">
                <CardTitle>Payment History</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Account</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {transactions.map((transaction) => (
                            <TableRow key={transaction.id} className="hover:bg-muted/50">
                                <TableCell>
                                    {new Date(transaction.createdAt).toLocaleDateString()}
                                </TableCell>
                                <TableCell>{transaction.account?.name || "N/A"}</TableCell>
                                <TableCell>{transaction.account?.type || "N/A"}</TableCell>
                                <TableCell className="text-right">
                                    ${transaction.amount.toFixed(2)}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                    <TableFooter>
                        <TableRow>
                            <TableCell colSpan={3} className="text-right font-medium">
                                Total Paid
                            </TableCell>
                            <TableCell className="text-right font-medium">
                                ${totalAmount.toFixed(2)}
                            </TableCell>
                        </TableRow>
                    </TableFooter>
                </Table>
            </CardContent>
        </Card>
    );
};

const OrderSummary = ({ order }: { order: Order }) => {
    const totalPaid =
        order.transactions?.reduce((sum, transaction) => sum + transaction.amount, 0) || 0;
    const remainingToPay = order.totalAmount - totalPaid;

    return (
        <Card>
            <CardHeader className="bg-muted/50">
                <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Subtotal:</span>
                            <span>${order.baseAmount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Discount:</span>
                            <span>-${order.discount.toFixed(2)}</span>
                        </div>
                        {/* <div className="flex justify-between">
                            <span className="text-muted-foreground">Tax:</span>
                            <span>${order.tax.toFixed(2)}</span>
                        </div> */}
                        {order.charges && order.charges.length > 0 && (
                            <>
                                {order.charges.map((charge) => (
                                    <div key={charge.id} className="flex justify-between">
                                        <span className="text-muted-foreground">
                                            {charge.label}:
                                        </span>
                                        <span>${charge.amount.toFixed(2)}</span>
                                    </div>
                                ))}
                            </>
                        )}
                        <div className="flex justify-between font-medium">
                            <span>Total Amount:</span>
                            <span>${order.totalAmount.toFixed(2)}</span>
                        </div>
                    </div>
                    <div className="space-y-2 border-l pl-4">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Total Paid:</span>
                            <span>${totalPaid.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between font-medium">
                            <span>Remaining to Pay:</span>
                            <span
                                className={
                                    remainingToPay > 0 ? "text-destructive" : "text-green-600"
                                }
                            >
                                ${remainingToPay.toFixed(2)}
                            </span>
                        </div>
                        {order.paymentStatus === "PAID" && (
                            <div className="mt-2 p-2 bg-green-50 text-green-700 rounded-md text-center">
                                This order has been fully paid
                            </div>
                        )}
                        {order.paymentStatus !== "PAID" && remainingToPay > 0 && (
                            <div className="mt-2 p-2 bg-amber-50 text-amber-700 rounded-md text-center">
                                Payment pending
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default SingleOrderPage;
