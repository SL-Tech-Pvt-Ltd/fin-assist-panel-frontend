import { useOrg } from "@/providers/org-provider";
import { Permission } from "@/data/types";

/**
 * Hook to check if user has specific permissions
 * Owners have all permissions by default
 */
export const usePermissions = () => {
    const { isOwner, myPermissions } = useOrg();

    const hasPermission = (permission: Permission | Permission[]): boolean => {
        if (isOwner) return true;

        if (Array.isArray(permission)) {
            return permission.some((p) => myPermissions.includes(p));
        }

        return myPermissions.includes(permission);
    };

    const hasAllPermissions = (permissions: Permission[]): boolean => {
        if (isOwner) return true;
        return permissions.every((p) => myPermissions.includes(p));
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
    const { isOwner, myPermissions } = useOrg();
    console.log(requiredPermissions, options);
    return {
        isOwner,
        myPermissions,
    };
};
