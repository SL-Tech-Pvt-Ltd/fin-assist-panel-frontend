import { Organization, Permission } from "@/data/types";
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { useParams } from "react-router-dom";
import { api } from "@/utils/api";
import { useAuth } from "./auth-provider";

interface OrgContextData {
    orgId: string;
    status: "idle" | "loading" | "error" | "success";
    organization: Organization | null;
    isOwner: boolean;
    myPermissions: Permission[];
    refetch: () => Promise<void>;
}

const OrgContext = createContext<OrgContextData | undefined>(undefined);

interface OrgProviderProps {
    children: React.ReactNode;
}

export const OrgProvider: React.FC<OrgProviderProps> = ({ children }) => {
    const { orgId } = useParams<{ orgId: string }>() as { orgId: string };
    const { user } = useAuth();

    const [state, setState] = useState<{
        status: "idle" | "loading" | "error" | "success";
        organization: Organization | null;
    }>({
        status: "idle",
        organization: null,
    });

    // Memoized calculations for ownership and permissions
    const { isOwner, myPermissions } = useMemo(() => {
        if (!user || !state.organization) {
            return { isOwner: false, myPermissions: [] };
        }

        const isUserOwner = state.organization.ownerId === user.id || user.isSuperAdmin;

        if (isUserOwner) {
            return { isOwner: true, myPermissions: [] };
        }

        const userAccess = user.roleAccess?.find((ra) => ra.organizationId === orgId);

        const permissions = userAccess?.organizationRole?.permissions ?? [];

        return { isOwner: false, myPermissions: permissions };
    }, [user, state.organization]);

    const fetchOrganization = useCallback(async (id: string) => {
        setState((prev) => ({ ...prev, status: "loading" }));

        try {
            const { data } = await api.get(`/orgs/${id}`);
            setState({ status: "success", organization: data });
        } catch (error) {
            console.error("Error fetching organization:", error);
            setState({ status: "error", organization: null });
        }
    }, []);

    useEffect(() => {
        if (orgId && user) {
            fetchOrganization(orgId);
        }
    }, [orgId, user, fetchOrganization]);

    const refetch = useCallback(async () => {
        if (orgId) {
            await fetchOrganization(orgId);
        }
    }, [orgId, fetchOrganization]);

    const contextValue = useMemo(
        () => ({
            orgId,
            status: state.status,
            organization: state.organization,
            isOwner,
            myPermissions,
            refetch,
        }),
        [orgId, state, isOwner, myPermissions, refetch]
    );

    // Render loading state
    if (state.status === "loading" || !state.organization) {
        return (
            <div className="flex items-center justify-center h-screen w-screen bg-gray-100">
                <div className="h-16 w-16 border-4 border-t-blue-500 border-gray-200 rounded-full animate-spin" />
            </div>
        );
    }

    // Render error state
    if (state.status === "error") {
        return (
            <div className="flex items-center justify-center h-screen w-screen bg-gray-100">
                <p className="text-red-500">Error fetching organization data</p>
            </div>
        );
    }

    return <OrgContext.Provider value={contextValue}>{children}</OrgContext.Provider>;
};

export const useOrg = () => {
    const context = useContext(OrgContext);
    if (!context) {
        throw new Error("useOrg must be used within an OrgProvider");
    }
    return context;
};
