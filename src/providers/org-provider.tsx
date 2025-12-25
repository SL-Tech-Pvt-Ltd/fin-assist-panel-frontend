import { Entity, Organization, Permission } from "@/data/types";
import React, { createContext, useContext, useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { api } from "@/utils/api";
import { useAuth } from "./auth-provider";

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
    isOwner: boolean;
    myPermissions: Permission[] | null;
    refetch: () => void;

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
    isOwner: false,
    myPermissions: null,
    status: "idle",
    refetch: () => {},
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
    const [buyCart, setBuyCart] = useState<Cart>(() => createInitialState("buy", orgId, null));
    const [sellCart, setSellCart] = useState<Cart>(() => createInitialState("sell", orgId, null));
    const [isOwner, setIsOwner] = useState<boolean>(false);

    const { user } = useAuth();

    const [myPermissions, setMyPermissions] = useState<Permission[] | null>(null);

    useEffect(() => {
        if (user && organization) {
            if (organization.ownerId === user.id || user.isSuperAdmin) {
                setIsOwner(true);
                setMyPermissions([]); // Clear permissions when user is owner
            } else {
                setIsOwner(false); // User is not owner
                const myAccess = user.roleAccess?.find(
                    (ra) => ra.organizationId === organization.id
                );
                if (myAccess && myAccess.organizationRoleId && myAccess.organizationRole) {
                    const myRole = myAccess.organizationRole;
                    if (myRole) {
                        setMyPermissions(myRole.permissions);
                    } else {
                        setMyPermissions([]);
                    }
                } else {
                    setMyPermissions([]);
                }
            }
        }
    }, [user, organization]);

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
            setStatus("loading");
            try {
                if (orgId && user) {
                    await fetchOrganization(orgId);
                }
            } catch (error) {
                setStatus("error");
                console.error("Error fetching organization data:", error);
            } finally {
                setStatus("success");
            }
        };
        fetchData();
    }, [orgId, user]);

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
                isOwner,
                myPermissions,
                organization,
                refetch,
                buyCart,
                updateBuyCart,
                clearBuyCart,
                sellCart,
                updateSellCart,
                clearSellCart,
            }}
        >
            {status === "loading" || myPermissions === null || organization === null ? (
                <div className="flex items-center justify-center h-screen w-screen bg-gray-100">
                    <div className="flex items-center justify-center h-16 w-16 border-4 border-t-4 border-t-blue-500 border-gray-200 rounded-full animate-spin"></div>
                </div>
            ) : status === "error" ? (
                <div className="flex items-center justify-center h-screen w-screen bg-gray-100">
                    <p className="text-red-500">Error fetching organization data</p>
                </div>
            ) : status === "success" ? (
                children
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
