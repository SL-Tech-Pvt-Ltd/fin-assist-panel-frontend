import { useCallback, useEffect, useState } from "react";
import { useOrg } from "@/providers/org-provider";
import { api } from "@/utils/api";
import { toast } from "@/hooks/use-toast";
import type { OrganizationRole, Permission } from "@/data/types";
import { useRequirePermissions, usePermissions } from "@/hooks/use-permissions";

import { Loader2, Plus, RefreshCw, Shield, Edit } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";

const AVAILABLE_PERMISSIONS: { value: Permission; label: string; category: string }[] = [
    { value: "ORGANIZATION_UPDATE", label: "Update Organization", category: "Organization" },
    { value: "ORGANIZATION_ADMIN", label: "Admin Organization", category: "Organization" },
    { value: "ACCOUNT_READ", label: "Read Accounts", category: "Account" },
    { value: "ACCOUNT_CREATE", label: "Create Accounts", category: "Account" },
    { value: "ACCOUNT_UPDATE", label: "Update Accounts", category: "Account" },
    { value: "PRODUCT_READ", label: "Read Products", category: "Product" },
    { value: "PRODUCT_CREATE", label: "Create Products", category: "Product" },
    { value: "PRODUCT_UPDATE", label: "Update Products", category: "Product" },
    { value: "ENTITY_READ", label: "Read Entities", category: "Entity" },
    { value: "ENTITY_CREATE", label: "Create Entities", category: "Entity" },
    { value: "ENTITY_UPDATE", label: "Update Entities", category: "Entity" },
    { value: "ORDER_READ", label: "Read Orders", category: "Order" },
    { value: "ORDER_CREATE", label: "Create Orders", category: "Order" },
    { value: "ORDER_UPDATE", label: "Update Orders", category: "Order" },
    { value: "POS_READ", label: "Read POS", category: "POS" },
    { value: "POS_CREATE", label: "Create POS", category: "POS" },
    { value: "POS_UPDATE", label: "Update POS", category: "POS" },
    { value: "EXPENSE_READ", label: "Read Expenses", category: "Expense" },
    { value: "EXPENSE_CREATE", label: "Create Expenses", category: "Expense" },
    { value: "EXPENSE_UPDATE", label: "Update Expenses", category: "Expense" },
];

const groupPermissionsByCategory = () => {
    const groups: Record<string, { value: Permission; label: string }[]> = {};
    AVAILABLE_PERMISSIONS.forEach((perm) => {
        if (!groups[perm.category]) {
            groups[perm.category] = [];
        }
        groups[perm.category].push({ value: perm.value, label: perm.label });
    });
    return groups;
};

// Define permission dependencies (higher permissions require lower ones)
const getPermissionDependencies = (permission: Permission): Permission[] => {
    const parts = permission.split("_");
    const category = parts.slice(0, -1).join("_");
    const level = parts[parts.length - 1];

    const dependencies: Permission[] = [];

    if (level === "CREATE") {
        dependencies.push(`${category}_READ` as Permission);
    } else if (level === "UPDATE") {
        dependencies.push(`${category}_READ` as Permission);
        dependencies.push(`${category}_CREATE` as Permission);
    } else if (level === "ADMIN") {
        dependencies.push(`${category}_READ` as Permission);
        dependencies.push(`${category}_CREATE` as Permission);
        dependencies.push(`${category}_UPDATE` as Permission);
    }

    return dependencies;
};

// Get all permissions that depend on this permission
const getPermissionDependents = (permission: Permission): Permission[] => {
    const parts = permission.split("_");
    const category = parts.slice(0, -1).join("_");
    const level = parts[parts.length - 1];

    const dependents: Permission[] = [];

    if (level === "READ") {
        dependents.push(`${category}_CREATE` as Permission);
        dependents.push(`${category}_UPDATE` as Permission);
        dependents.push(`${category}_ADMIN` as Permission);
    } else if (level === "CREATE") {
        dependents.push(`${category}_UPDATE` as Permission);
        dependents.push(`${category}_ADMIN` as Permission);
    } else if (level === "UPDATE") {
        dependents.push(`${category}_ADMIN` as Permission);
    }

    return dependents.filter((dep) => AVAILABLE_PERMISSIONS.some((p) => p.value === dep));
};

interface RoleWithMembers extends OrganizationRole {
    memberCount?: number;
}

export default function OrgRoles() {
    useRequirePermissions(["ORGANIZATION_ADMIN"]);
    const { hasPermission } = usePermissions();
    const { orgId } = useOrg();
    const [rolesWithMembers, setRolesWithMembers] = useState<RoleWithMembers[]>([]);

    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingRole, setEditingRole] = useState<OrganizationRole | null>(null);
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        permissions: [] as Permission[],
    });
    const [submitting, setSubmitting] = useState(false);

    const fetchMemberCounts = useCallback(async () => {
        if (!orgId) return;
        try {
            const res = await api.get(`/orgs/${orgId}/roles`);
            setRolesWithMembers(res.data);
        } catch (err) {
            console.error("Failed to fetch role member counts:", err);
        }
    }, [orgId]);

    useEffect(() => {
        fetchMemberCounts();
    }, [fetchMemberCounts]);

    const handleRefresh = async () => {
        await fetchMemberCounts();
    };

    const handleOpenDialog = (role?: OrganizationRole) => {
        if (role) {
            setEditingRole(role);
            setFormData({
                title: role.title,
                description: role.description || "",
                permissions: role.permissions,
            });
        } else {
            setEditingRole(null);
            setFormData({
                title: "",
                description: "",
                permissions: [],
            });
        }
        setDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setDialogOpen(false);
        setEditingRole(null);
        setFormData({
            title: "",
            description: "",
            permissions: [],
        });
    };

    const handlePermissionToggle = (permission: Permission) => {
        setFormData((prev) => {
            const isCurrentlySelected = prev.permissions.includes(permission);
            let newPermissions = [...prev.permissions];

            if (isCurrentlySelected) {
                // Deselecting: remove this permission and all that depend on it
                const dependents = getPermissionDependents(permission);
                newPermissions = newPermissions.filter(
                    (p) => p !== permission && !dependents.includes(p)
                );
            } else {
                // Special case: if selecting ORGANIZATION_ADMIN, select all permissions
                if (permission === "ORGANIZATION_ADMIN") {
                    newPermissions = AVAILABLE_PERMISSIONS.map((p) => p.value);
                } else {
                    // Selecting: add this permission and all its dependencies
                    const dependencies = getPermissionDependencies(permission);
                    const toAdd = [permission, ...dependencies];

                    toAdd.forEach((perm) => {
                        if (!newPermissions.includes(perm)) {
                            newPermissions.push(perm);
                        }
                    });
                }
            }

            return {
                ...prev,
                permissions: newPermissions,
            };
        });
    };

    const handleSubmit = async () => {
        if (!formData.title.trim()) {
            toast({
                title: "Validation Error",
                description: "Role title is required",
                variant: "destructive",
            });
            return;
        }

        setSubmitting(true);
        try {
            if (editingRole) {
                await api.put(`/orgs/${orgId}/roles/${editingRole.id}`, formData);
                toast({
                    title: "Success",
                    description: "Role updated successfully",
                });
            } else {
                await api.post(`/orgs/${orgId}/roles`, formData);
                toast({
                    title: "Success",
                    description: "Role created successfully",
                });
            }
            handleCloseDialog();
            await fetchMemberCounts();
        } catch (err: any) {
            toast({
                title: "Error",
                description: err.response?.data?.message || "Failed to save role",
                variant: "destructive",
            });
        } finally {
            setSubmitting(false);
        }
    };

    const permissionGroups = groupPermissionsByCategory();

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Roles & Permissions</h1>
                    <p className="text-muted-foreground">
                        Manage organization roles and their permissions
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleRefresh}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh
                    </Button>
                    {hasPermission("ORGANIZATION_ADMIN") && (
                        <Button size="sm" onClick={() => handleOpenDialog()}>
                            <Plus className="h-4 w-4 mr-2" />
                            Create Role
                        </Button>
                    )}
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {rolesWithMembers.map((role) => (
                    <Card key={role.id} className="hover:shadow-md transition-shadow">
                        <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-2">
                                    <Shield className="h-5 w-5 text-primary" />
                                    <CardTitle className="text-lg">{role.title}</CardTitle>
                                </div>
                                {hasPermission("ORGANIZATION_ADMIN") && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleOpenDialog(role)}
                                    >
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                            {role.description && (
                                <CardDescription className="line-clamp-2">
                                    {role.description}
                                </CardDescription>
                            )}
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                <div>
                                    <div className="text-sm font-medium mb-2">
                                        Permissions ({role.permissions.length})
                                    </div>
                                    <div className="flex flex-wrap gap-1">
                                        {role.permissions.slice(0, 3).map((perm) => (
                                            <Badge
                                                key={perm}
                                                variant="secondary"
                                                className="text-xs"
                                            >
                                                {perm.replace(/_/g, " ")}
                                            </Badge>
                                        ))}
                                        {role.permissions.length > 3 && (
                                            <Badge variant="outline" className="text-xs">
                                                +{role.permissions.length - 3} more
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}

                {rolesWithMembers.length === 0 && (
                    <Card className="col-span-full">
                        <CardContent className="flex flex-col items-center justify-center py-12">
                            <Shield className="h-12 w-12 text-muted-foreground mb-4" />
                            <p className="text-lg font-medium">No roles yet</p>
                            <p className="text-sm text-muted-foreground mb-4">
                                Create your first role to get started
                            </p>
                            <Button onClick={() => handleOpenDialog()}>
                                <Plus className="h-4 w-4 mr-2" />
                                Create Role
                            </Button>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Create/Edit Role Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh]">
                    <DialogHeader>
                        <DialogTitle>{editingRole ? "Edit Role" : "Create New Role"}</DialogTitle>
                        <DialogDescription>
                            {editingRole
                                ? "Update the role details and permissions"
                                : "Create a new role with specific permissions"}
                        </DialogDescription>
                    </DialogHeader>

                    <ScrollArea className="max-h-[60vh] pr-4">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="title">Role Title *</Label>
                                <Input
                                    id="title"
                                    placeholder="e.g., Manager, Accountant, Sales Rep"
                                    value={formData.title}
                                    onChange={(e) =>
                                        setFormData((prev) => ({ ...prev, title: e.target.value }))
                                    }
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description">Description</Label>
                                <Textarea
                                    id="description"
                                    placeholder="Describe the role and its responsibilities"
                                    value={formData.description}
                                    onChange={(e) =>
                                        setFormData((prev) => ({
                                            ...prev,
                                            description: e.target.value,
                                        }))
                                    }
                                    rows={3}
                                />
                            </div>

                            <div className="space-y-3">
                                <Label>Permissions ({formData.permissions.length} selected)</Label>
                                <div className="border rounded-lg p-4 space-y-4">
                                    {Object.entries(permissionGroups).map(([category, perms]) => (
                                        <div key={category} className="space-y-2">
                                            <div className="font-medium text-sm text-muted-foreground">
                                                {category}
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                {perms.map((perm) => (
                                                    <div
                                                        key={perm.value}
                                                        className="flex items-center space-x-2"
                                                    >
                                                        <Checkbox
                                                            id={perm.value}
                                                            checked={formData.permissions.includes(
                                                                perm.value
                                                            )}
                                                            onCheckedChange={() =>
                                                                handlePermissionToggle(perm.value)
                                                            }
                                                        />
                                                        <Label
                                                            htmlFor={perm.value}
                                                            className="text-sm font-normal cursor-pointer"
                                                        >
                                                            {perm.label}
                                                        </Label>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </ScrollArea>

                    <DialogFooter>
                        <Button variant="outline" onClick={handleCloseDialog} disabled={submitting}>
                            Cancel
                        </Button>
                        <Button onClick={handleSubmit} disabled={submitting}>
                            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            {editingRole ? "Update Role" : "Create Role"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
