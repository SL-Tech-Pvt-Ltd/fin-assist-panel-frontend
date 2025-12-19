import { Account, Transaction } from "@/data/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
interface AccountDetailsProps {
    type?: "BANK" | "BANK_OD" | "CASH_COUNTER" | "CHEQUE" | "MISC";
    account: Account | null;
    isLoading: boolean;
    error: string;
}

import { ColumnDef } from "@tanstack/react-table";
import { TableComponent } from "./Table";
import { api } from "@/utils/api";
import { AddTransactionDialog } from "../modals/AddTransaction";
import { EditAccountModal } from "../modals/EditAccountModal";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { usePermissions } from "@/hooks/use-permissions";

const chequeColumns: ColumnDef<Transaction>[] = [
    {
        header: "Cheque Number",
        accessorKey: "details.chequeNumber",
    },
    {
        header: "Cheque Date",
        accessorKey: "details.chequeDate",
    },

    {
        header: "Cheque Issuer",
        accessorKey: "details.chequeIssuer",
    },
];

const AccountDetails = ({ account, isLoading, error, type = "BANK" }: AccountDetailsProps) => {
    const [localAccount, setLocalAccount] = useState<Account | null>(account);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const { hasAllPermissions } = usePermissions();
    const paymentColumns: ColumnDef<Transaction>[] = [
        {
            header: "Description",
            accessorKey: "description",
        },
        {
            header: "Amount",
            accessorKey: "amount",
        },
        {
            header: "Order ID",
            accessorKey: "orderId",
            cell: ({ row }) => {
                const orderId = row.original.orderId;
                return orderId ? (
                    <Link
                        to={`/org/${account?.organizationId}/orders/${orderId}`}
                        className="text-blue-500 hover:underline"
                    >
                        {orderId}
                    </Link>
                ) : (
                    "N/A"
                );
            },
        },
        {
            header: "Type",
            accessorKey: "type",
            cell: ({ row }) => {
                const transaction = row.original;
                const type = transaction.type;

                // Handle MISC transactions with subtypes
                if (
                    type === "MISC" &&
                    transaction.details &&
                    typeof transaction.details === "object" &&
                    "transactionSubType" in transaction.details
                ) {
                    const subType = (transaction.details as any).transactionSubType;
                    if (subType === "EXPENSE") {
                        return <span className="text-red-600 font-medium">Expense</span>;
                    } else if (subType === "INCOME") {
                        return <span className="text-green-600 font-medium">Income</span>;
                    }
                }

                // Handle other transaction types
                switch (type) {
                    case "BUY":
                        return <span className="text-red-600">Expense (Buy)</span>;
                    case "SELL":
                        return <span className="text-green-600">Income (Sell)</span>;
                    case "MISC":
                        return <span className="text-gray-600">Miscellaneous</span>;
                    default:
                        return <span>{type}</span>;
                }
            },
        },
        {
            header: "Date",
            accessorKey: "createdAt",
        },
    ];

    useEffect(() => {
        setLocalAccount(account);
    }, [account]);

    const handleAccountUpdate = async () => {
        // Refetch account data after update
        if (account) {
            try {
                const response = await api.get(
                    `/orgs/${account.organizationId}/accounts/${account.id}`
                );
                setLocalAccount(response.data);
            } catch (error) {
                console.error("Error fetching updated account:", error);
            }
        }
    };

    if (isLoading) {
        return <div>Loading...</div>;
    }

    if (error) {
        return <div>{error}</div>;
    }

    if (!account) {
        return <div>No account found</div>;
    }
    if (!localAccount) {
        return <div>No account found</div>;
    }

    const handleAddTransaction = async (
        amount: number,
        description: string,
        type: "BUY" | "SELL" | "MISC" | "TRANSFER",
        details: object = {},
        transferAccountId: string | null = null,
        charge: number | null = null,
        createdAt?: string
    ) => {
        if (type === "TRANSFER" && transferAccountId) {
            await api.post(
                `/orgs/${account.organizationId}/accounts/${transferAccountId}/transactions`,
                {
                    amount,
                    type: "SELL",
                    description: description + "-transfered from " + localAccount.name,
                    details,
                    ...(createdAt && { createdAt }),
                }
            );
            const created = await api.post(
                `/orgs/${account.organizationId}/accounts/${account.id}/transactions`,
                {
                    amount: amount + (charge || 0),
                    type: "BUY",
                    description:
                        description +
                        "-transfered to " +
                        transferAccountId +
                        (charge && charge > 0 ? " with charge " + charge : ""),
                    details,
                    ...(createdAt && { createdAt }),
                }
            );
            setLocalAccount((prev) => {
                if (!prev) return null;
                return {
                    ...prev,
                    balance: prev.balance - (amount + (charge || 0)),
                    transactions: [...(prev.transactions || []), created.data],
                };
            });
        } else {
            const created = await api.post(
                `/orgs/${account.organizationId}/accounts/${account.id}/transactions`,
                {
                    amount,
                    type,
                    description,
                    details,
                    ...(createdAt && { createdAt }),
                }
            );

            setLocalAccount((prev) => {
                if (!prev) return null;
                return {
                    ...prev,
                    balance:
                        prev.balance + (type === "BUY" ? -amount : type === "SELL" ? amount : 0),
                    transactions: [...(prev.transactions || []), created.data],
                };
            });
        }
    };

    return (
        <div className="mt-8">
            <div className="bg-gray-100 p-6 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-gray-800">Account Details</h2>
                    {(localAccount.type === "BANK" || localAccount.type === "BANK_OD") &&
                        hasAllPermissions(["ACCOUNT_UPDATE"]) && (
                            <Button
                                onClick={() => setIsEditModalOpen(true)}
                                variant="outline"
                                size="sm"
                            >
                                Edit Account
                            </Button>
                        )}
                </div>
                <div className="flex items-center justify-between mt-4">
                    <div>
                        <p className="text-sm text-gray-500">Account Name</p>
                        <p className="text-lg font-semibold text-gray-800">{localAccount.name}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">Balance</p>
                        <p className="text-lg font-semibold text-gray-800">
                            {localAccount.balance.toFixed(4)}
                        </p>
                    </div>
                    {type === "BANK" && (
                        <>
                            <div>
                                <p className="text-sm text-gray-500">Account Number</p>
                                <p className="text-lg font-semibold text-gray-800">
                                    {localAccount.details?.accountNumber}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Bank Name</p>
                                <p className="text-lg font-semibold text-gray-800">
                                    {localAccount.details?.bankName}
                                </p>
                            </div>
                            {/* interest rate and accumulated interest */}
                            <div>
                                <p className="text-sm text-gray-500">Interest Rate</p>
                                <p className="text-lg font-semibold text-gray-800">
                                    {localAccount.interestRate
                                        ? `${localAccount.interestRate}%`
                                        : "N/A"}
                                </p>
                            </div>
                            {localAccount.type === "BANK_OD" ? (
                                <div>
                                    <p className="text-sm text-gray-500">Overdraft Limit</p>
                                    <p className="text-lg font-semibold text-gray-800">
                                        {localAccount.limit ? localAccount.limit.toFixed(2) : "N/A"}
                                    </p>
                                </div>
                            ) : (
                                <div>
                                    <p className="text-sm text-gray-500">Accumulated Interest</p>
                                    <p className="text-lg font-semibold text-gray-800">
                                        {localAccount.accumulatedInterest
                                            ? localAccount.accumulatedInterest.toFixed(4)
                                            : "N/A"}
                                    </p>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
            <div className="mt-4 border border-gray-500 rounded-xl p-6">
                <Tabs defaultValue="all">
                    <TabsList className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-4">
                            <TabsTrigger value="all">All Transactions</TabsTrigger>
                            <TabsTrigger value="buy">Expenses & Purchases</TabsTrigger>
                            <TabsTrigger value="sell">Income & Sales</TabsTrigger>
                            <TabsTrigger value="others">Other Transactions</TabsTrigger>
                        </div>
                        {hasAllPermissions(["ACCOUNT_UPDATE"]) && (
                            <AddTransactionDialog
                                account={localAccount}
                                accounts={[]}
                                onAddTransaction={handleAddTransaction}
                            />
                        )}
                    </TabsList>
                    <TabsContent value="all" defaultChecked>
                        <div>
                            {localAccount.transactions && localAccount.transactions.length > 0 ? (
                                <TableComponent
                                    title="All Payments"
                                    columns={
                                        type === "CHEQUE"
                                            ? [...paymentColumns, ...chequeColumns]
                                            : paymentColumns
                                    }
                                    data={localAccount.transactions.sort(
                                        (a, b) =>
                                            new Date(b.createdAt).getTime() -
                                            new Date(a.createdAt).getTime()
                                    )}
                                    showFooter={true}
                                    allowPagination={true}
                                />
                            ) : (
                                <p className="bg-white rounded-lg p-2">No payments found.</p>
                            )}
                        </div>
                    </TabsContent>
                    <TabsContent value="buy">
                        <div>
                            {localAccount.transactions &&
                            localAccount.transactions.filter((t) => t.orderId && t.type === "BUY")
                                .length > 0 ? (
                                <TableComponent
                                    title="Expenses & Purchase Payments"
                                    columns={
                                        type === "CHEQUE"
                                            ? [...paymentColumns, ...chequeColumns]
                                            : paymentColumns
                                    }
                                    data={localAccount.transactions.filter((t) => {
                                        // Include BUY transactions and MISC transactions with EXPENSE subtype
                                        if (t.type === "BUY" && t.orderId) return true;
                                        if (
                                            t.type === "MISC" &&
                                            t.orderId === null &&
                                            t.details &&
                                            typeof t.details === "object" &&
                                            "transactionSubType" in t.details &&
                                            t.details.transactionSubType === "EXPENSE"
                                        )
                                            return true;
                                        if ((t.type as string).endsWith("(PURCHASE)") && t.orderId)
                                            return true;
                                        return false;
                                    })}
                                    showFooter={true}
                                    allowPagination={true}
                                />
                            ) : (
                                <p className="bg-white rounded-lg p-2">
                                    No expense or purchase payments found.
                                </p>
                            )}
                        </div>
                    </TabsContent>
                    <TabsContent value="sell">
                        <div>
                            {localAccount.transactions &&
                            localAccount.transactions.filter((t) => {
                                // Include SELL transactions and MISC transactions with INCOME subtype
                                if (t.type === "SELL" && t.orderId) return true;
                                if (
                                    t.type === "MISC" &&
                                    t.orderId === null &&
                                    t.details &&
                                    typeof t.details === "object" &&
                                    "transactionSubType" in t.details &&
                                    t.details.transactionSubType === "INCOME"
                                )
                                    return true;
                                if ((t.type as string).endsWith("(SALE)") && t.orderId) return true;
                                return false;
                            }).length > 0 ? (
                                <TableComponent
                                    title="Income & Sale Payments"
                                    columns={
                                        type === "CHEQUE"
                                            ? [...paymentColumns, ...chequeColumns]
                                            : paymentColumns
                                    }
                                    data={localAccount.transactions.filter((t) => {
                                        // Include SELL transactions and MISC transactions with INCOME subtype
                                        if (t.type === "SELL" && t.orderId) return true;
                                        if (
                                            t.type === "MISC" &&
                                            t.orderId === null &&
                                            t.details &&
                                            typeof t.details === "object" &&
                                            "transactionSubType" in t.details &&
                                            t.details.transactionSubType === "INCOME"
                                        )
                                            return true;
                                        if ((t.type as string).endsWith("(SALE)") && t.orderId)
                                            return true;
                                        return false;
                                    })}
                                    showFooter={true}
                                    allowPagination={true}
                                />
                            ) : (
                                <p className="bg-white rounded-lg p-2">
                                    No income or sale payments found.
                                </p>
                            )}
                        </div>
                    </TabsContent>
                    <TabsContent value="others">
                        <div>
                            {localAccount.transactions &&
                            localAccount.transactions.filter((t) => !t.orderId).length > 0 ? (
                                <TableComponent
                                    title="Other Payments"
                                    allowSearch={false}
                                    allowExport={false}
                                    allowPagination={true}
                                    // columns={[
                                    //     ...paymentColumns,
                                    //     {
                                    //         header: "Description",
                                    //         accessorKey: "description",
                                    //     },
                                    // ]}
                                    columns={
                                        type === "CHEQUE"
                                            ? [...paymentColumns, ...chequeColumns]
                                            : paymentColumns
                                    }
                                    data={localAccount.transactions.filter((t) => !t.orderId)}
                                    showFooter={true}
                                />
                            ) : (
                                <p className="bg-white rounded-lg p-2">No other payments found.</p>
                            )}
                        </div>
                    </TabsContent>
                </Tabs>
            </div>

            <EditAccountModal
                account={localAccount}
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                onSuccess={handleAccountUpdate}
            />
        </div>
    );
};

export default AccountDetails;
