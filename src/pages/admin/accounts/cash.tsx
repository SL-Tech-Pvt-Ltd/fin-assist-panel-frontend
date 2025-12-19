import { useEffect, useState, useCallback } from "react";
import { useOrg } from "@/providers/org-provider";
import { api } from "@/utils/api";
import { Account } from "@/data/types";
import AccountDetails from "@/components/modules/AccountDetails";
import CreateAccountForm from "@/components/forms/CreateAccountForm";
import { useRequirePermissions, usePermissions } from "@/hooks/use-permissions";

export default function CASHACCOUNTS() {
    useRequirePermissions("ACCOUNT_READ");
    const { hasPermission } = usePermissions();
    const { orgId } = useOrg();
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);

    // Fetch accounts from API
    const fetchAccounts = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const { data } = await api.get<Account[]>(`orgs/${orgId}/accounts`);
            const filteredAccounts = data.filter((acc) => acc.type === "CASH_COUNTER");
            setAccounts(filteredAccounts);
            if (filteredAccounts.length > 0) {
                setSelectedAccount(filteredAccounts[0]);
            }
        } catch (err) {
            setError("Failed to fetch bank accounts. Please try again.");
        } finally {
            setLoading(false);
        }
    }, [orgId]);

    useEffect(() => {
        fetchAccounts();
    }, [fetchAccounts]);

    // Create a new account
    const onSubmit = async (account: Account) => {
        try {
            const created = await api.post(`orgs/${orgId}/accounts`, account);
            setAccounts((prev) => [...prev, created.data]);
        } catch {
            setError("Failed to create account. Please try again.");
        }
    };

    return (
        <div className="container px-6">
            {/* Header Section */}
            <div className="flex items-center justify-between border-b pb-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Cash Accounts</h2>
                    <p className="text-sm text-gray-500">View and manage your Cash accounts</p>
                </div>
                {hasPermission("ACCOUNT_CREATE") && accounts.length === 0 && (
                    <CreateAccountForm type="CASH_COUNTER" onSubmit={onSubmit} disableType={true} />
                )}
            </div>

            {/* Loading State */}
            {loading ? (
                <div className="flex justify-center items-center h-40">
                    <p className="text-gray-500">Loading Cash accounts...</p>
                </div>
            ) : error ? (
                <p className="text-center text-red-500">{error}</p>
            ) : accounts.length === 0 ? (
                <p className="text-center text-gray-500 mt-6">No Cash accounts found.</p>
            ) : (
                <>
                    {/* Account List */}
                    {/* <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                        {accounts.slice(1).map((account) => (
                            <div
                                className={`bg-white border-2 rounded-xl p-6 w-full max-w-sm cursor-pointer transition-all duration-300 ${
                                    selectedAccount?.id === account.id ? "border-blue-500" : ""
                                }`}
                                key={account.id}
                                onClick={() => setSelectedAccount(account)}
                            >
                                <div className="flex flex-col space-y-4">
                                    <div className="flex gap-3 items-center justify-between">
                                        <div className="flex items-center space-x-3">
                                            <FaUniversity className="text-blue-600 text-2xl" />
                                            <h3 className="text-xl font-semibold text-gray-800">
                                                {account.name}
                                            </h3>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div> */}

                    {/* Account Details */}
                    {selectedAccount && (
                        <div className="">
                            <AccountDetails
                                type="CASH_COUNTER"
                                account={selectedAccount}
                                isLoading={loading}
                                error={error || ""}
                            />
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
