import { Account, Entity, Organization, Product, OrganizationRole } from "@/data/types";
import React, { createContext, useContext, useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { api } from "@/utils/api";

interface OrderProduct {
    productId: string;
    variantId: string;
    rate: number;
    quantity: number;
    description: string;
}

interface OrderCharge {
    id: string;
    amount: number;
    label: string;
    isVat?: boolean;
    type: "fixed" | "percentage";
    percentage: number;
    bearedByEntity: boolean;
}

interface OrderPayment {
    amount: number;
    accountId: string;
    details: object;
}
interface Cart {
    entity: Entity | null;
    tax: number;
    description: string;
    products: OrderProduct[];
    discount: number;
    charges: OrderCharge[];
    payments: OrderPayment[];
}
interface OrgContextData {
    orgId: string;
    status: "idle" | "loading" | "error" | "success";
    organization: Organization | null;
    refetch: () => void;

    products: Product[];
    updateProduct: (productId: string, updatedData: Partial<Product>) => void;
    refetchProductId: (productId: string) => void;
    refetchProducts: () => void;

    accounts: Account[];
    updateAccount: (accountId: string, updatedData: Partial<Account>) => void;
    refetchAccountId: (accountId: string) => void;
    refetchAccounts: () => void;

    roles: OrganizationRole[];
    updateRole: (roleId: string, updatedData: Partial<OrganizationRole>) => void;
    refetchRoleId: (roleId: string) => void;
    refetchRoles: () => void;

    buyCart: Cart;
    updateBuyCart: (cart: Partial<Cart>) => void;
    clearBuyCart: () => void;

    sellCart: Cart;
    updateSellCart: (cart: Partial<Cart>) => void;
    clearSellCart: () => void;
}

const OrgContext = createContext<OrgContextData>({
    orgId: "",
    organization: null,
    status: "idle",
    refetch: () => {},
    products: [],
    updateProduct: () => {},
    refetchProducts: () => {},
    refetchProductId: () => {},
    accounts: [],
    updateAccount: () => {},
    refetchAccountId: () => {},
    refetchAccounts: () => {},
    roles: [],
    updateRole: () => {},
    refetchRoleId: () => {},
    refetchRoles: () => {},
    buyCart: {
        entity: null,
        tax: 0,
        description: "",
        products: [],
        discount: 0,
        charges: [],
        payments: [],
    },
    updateBuyCart: () => {},
    clearBuyCart: () => {},
    sellCart: {
        entity: null,
        tax: 0,
        description: "",
        products: [],
        discount: 0,
        charges: [],
        payments: [],
    },
    updateSellCart: () => {},
    clearSellCart: () => {},
});

const createInitialState = (type: string, orgId: string, defaultEntity: Entity | null): Cart => {
    // Try to get saved state from localStorage
    const savedState = localStorage.getItem(`CART-${orgId}-${type}`);
    if (savedState) {
        try {
            const parsed = JSON.parse(savedState);
            return {
                entity: defaultEntity || parsed.entity || null,
                products: parsed.products || [
                    { productId: "", variantId: "", rate: 0, quantity: 1 },
                ],
                description: parsed.description || "",
                discount: parsed.discount || 0,
                charges: parsed.charges || [],
                payments: parsed.payments || [],
                tax: parsed.tax || 0,
            };
        } catch (error) {
            console.error("Failed to parse saved state:", error);
        }
    }

    return {
        entity: defaultEntity,
        description: "",
        products: [{ productId: "", variantId: "", rate: 0, quantity: 1, description: "" }],
        discount: 0,
        charges: [],
        payments: [],
        tax: 0,
    };
};

interface OrgProviderProps {
    children: React.ReactNode;
}

export const OrgProvider: React.FC<OrgProviderProps> = ({ children }) => {
    const { orgId } = useParams<{ orgId: string }>() as { orgId: string };
    const [status, setStatus] = useState<"loading" | "error" | "success">("loading");
    const [organization, setOrganization] = useState<Organization | null>(null);
    const [products, setProducts] = useState<Product[]>([]);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [roles, setRoles] = useState<OrganizationRole[]>([]);
    const [buyCart, setBuyCart] = useState<Cart>(() => createInitialState("buy", orgId, null));
    const [sellCart, setSellCart] = useState<Cart>(() => createInitialState("sell", orgId, null));

    // Persist buyCart to localStorage
    useEffect(() => {
        if (orgId) {
            localStorage.setItem(`CART-${orgId}-buy`, JSON.stringify(buyCart));
        }
    }, [buyCart, orgId]);

    // Persist sellCart to localStorage
    useEffect(() => {
        if (orgId) {
            localStorage.setItem(`CART-${orgId}-sell`, JSON.stringify(sellCart));
        }
    }, [sellCart, orgId]);

    const refetchProducts = async () => {
        try {
            const data = await (await api.get(`/orgs/${orgId}/products`)).data;
            setProducts(data);
        } catch (error) {
            console.error("Error fetching products:", error);
        }
    };

    const refetchProductId = async (productId: string) => {
        try {
            const data = await (await api.get(`/orgs/${orgId}/products/${productId}`)).data;
            setProducts((prev) => {
                const exists = prev.some((p) => p.id === productId);
                if (exists) {
                    return prev.map((p) => (p.id === productId ? data : p));
                } else {
                    return [...prev, data];
                }
            });
        } catch (error) {
            console.error("Error fetching product:", error);
        }
    };

    const updateProduct = (productId: string, updatedData: Partial<Product>) => {
        setProducts((prev) => prev.map((p) => (p.id === productId ? { ...p, ...updatedData } : p)));
    };

    const refetchAccounts = async () => {
        try {
            const data = await (await api.get(`/orgs/${orgId}/accounts`)).data;
            setAccounts(data);
        } catch (error) {
            console.error("Error fetching accounts:", error);
        }
    };

    const refetchAccountId = async (accountId: string) => {
        try {
            const data = await (await api.get(`/orgs/${orgId}/accounts/${accountId}`)).data;
            setAccounts((prev) => {
                const exists = prev.some((a) => a.id === accountId);
                if (exists) {
                    return prev.map((a) => (a.id === accountId ? data : a));
                } else {
                    return [...prev, data];
                }
            });
        } catch (error) {
            console.error("Error fetching account:", error);
        }
    };

    const updateAccount = (accountId: string, updatedData: Partial<Account>) => {
        setAccounts((prev) => prev.map((a) => (a.id === accountId ? { ...a, ...updatedData } : a)));
    };

    const refetchRoles = async () => {
        try {
            const data = await (await api.get(`/orgs/${orgId}/roles`)).data;
            setRoles(data);
        } catch (error) {
            console.error("Error fetching roles:", error);
        }
    };

    const refetchRoleId = async (roleId: string) => {
        try {
            const data = await (await api.get(`/orgs/${orgId}/roles/${roleId}`)).data;
            setRoles((prev) => {
                const exists = prev.some((r) => r.id === roleId);
                if (exists) {
                    return prev.map((r) => (r.id === roleId ? data : r));
                } else {
                    return [...prev, data];
                }
            });
        } catch (error) {
            console.error("Error fetching role:", error);
        }
    };

    const updateRole = (roleId: string, updatedData: Partial<OrganizationRole>) => {
        setRoles((prev) => prev.map((r) => (r.id === roleId ? { ...r, ...updatedData } : r)));
    };

    const fetchOrganization = async (orgId: string) => {
        try {
            setStatus("loading");
            const data = await (await api.get(`/orgs/${orgId}`)).data;
            setOrganization(data);
        } catch (error) {
            console.error("Error fetching organization:", error);
        } finally {
            setStatus("success");
        }
    };

    useEffect(() => {
        const fetchData = async () => {
            if (orgId) {
                await fetchOrganization(orgId);
                await refetchProducts();
                await refetchAccounts();
                await refetchRoles();
            }
        };
        fetchData();
    }, [orgId]);

    const refetch = async () => {
        if (orgId) {
            await fetchOrganization(orgId);
        }
    };

    const updateBuyCart = (cart: Partial<Cart>) => {
        setBuyCart((prev) => ({ ...prev, ...cart }));
    };

    const clearBuyCart = () => {
        setBuyCart({
            entity: null,
            discount: 0,
            description: "",
            tax: 0,
            payments: [],
            charges: [],
            products: [],
        });
    };

    const updateSellCart = (cart: Partial<Cart>) => {
        setSellCart((prev) => ({ ...prev, ...cart }));
    };

    const clearSellCart = () => {
        setSellCart({
            entity: null,
            discount: 0,
            description: "",
            tax: 0,
            payments: [],
            charges: [],
            products: [],
        });
    };

    return (
        <OrgContext.Provider
            value={{
                orgId,
                status,
                organization,
                refetch,
                products,
                updateProduct,
                refetchProducts,
                refetchProductId,
                accounts,
                updateAccount,
                refetchAccountId,
                refetchAccounts,
                roles,
                updateRole,
                refetchRoleId,
                refetchRoles,
                buyCart,
                updateBuyCart,
                clearBuyCart,
                sellCart,
                updateSellCart,
                clearSellCart,
            }}
        >
            {children}
            {status === "loading" ? (
                <div className="flex items-center justify-center h-screen w-screen bg-gray-100">
                    <div className="flex items-center justify-center h-16 w-16 border-4 border-gray-200 rounded-full animate-spin"></div>
                </div>
            ) : status === "error" ? (
                <div className="flex items-center justify-center h-screen w-screen bg-gray-100">
                    <p className="text-red-500">Error fetching organization data</p>
                </div>
            ) : null}
        </OrgContext.Provider>
    );
};

// useOrg hook
export const useOrg = () => {
    const context = useContext(OrgContext);
    if (!context) {
        throw new Error("useOrg must be used within an OrgProvider");
    }
    return context;
};
