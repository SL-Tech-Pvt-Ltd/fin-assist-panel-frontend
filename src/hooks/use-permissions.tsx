import { useOrg } from "@/providers/org-provider";
import { Permission } from "@/data/types";
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

/**
 * Hook to check if user has specific permissions
 * Owners have all permissions by default
 */
export const usePermissions = () => {
    const { isOwner, myPermissions } = useOrg();

    const hasPermission = (permission: Permission | Permission[]): boolean => {
        if (isOwner) return true;

        if (Array.isArray(permission)) {
            return permission.some((p) => myPermissions?.includes(p));
        }

        return myPermissions?.includes(permission) || false;
    };

    const hasAllPermissions = (permissions: Permission[]): boolean => {
        if (isOwner) return true;
        return permissions.every((p) => myPermissions?.includes(p));
    };

    return {
        isOwner,
        myPermissions,
        hasPermission,
        hasAllPermissions,
    };
};

/**
 * Hook to check permissions without redirect
 * Use for pages where backend handles access control
 * Sidebar already filters links based on permissions
 */
export const useRequirePermissions = (
    requiredPermissions: Permission | Permission[],
    options?: {
        requireAll?: boolean;
        redirectTo?: string;
        showToast?: boolean;
    }
) => {
    const { isOwner, myPermissions, orgId, status } = useOrg();
    const navigate = useNavigate();
    const hasChecked = useRef(false);

    useEffect(() => {
        // Only check permissions once the data is loaded and we haven't checked yet
        if (status !== "success" || hasChecked.current) {
            return;
        }

        hasChecked.current = true;

        // Owner always has access
        if (isOwner) {
            return;
        }

        const hasPermission = (permission: Permission | Permission[]): boolean => {
            if (Array.isArray(permission)) {
                return permission.some((p) => myPermissions?.includes(p));
            }
            return myPermissions?.includes(permission) || false;
        };

        const hasAllPermissions = (permissions: Permission[]): boolean => {
            return permissions.every((p) => myPermissions?.includes(p));
        };

        const hasAccess = options?.requireAll
            ? hasAllPermissions(
                  Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions]
              )
            : hasPermission(requiredPermissions);

        if (!hasAccess) {
            navigate(options?.redirectTo || `/org/${orgId}/dashboard`, { replace: true });
        }
    }, [status, isOwner, myPermissions, requiredPermissions, options, orgId, navigate]);

    return {
        isOwner,
        myPermissions,
    };
};
