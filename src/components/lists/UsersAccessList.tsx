import { useState, useEffect, useCallback } from "react";
import { RoleAccess, OrganizationRole } from "@/data/types";
import { ColumnDef } from "@tanstack/react-table";
import { TableComponent } from "../modules/Table";
import { Loader2, Shield } from "lucide-react";
import { Card, CardContent, CardHeader } from "../ui/card";
import { InviteUser } from "../modals/InviteUser";
import { RemoveModal } from "../modals/RemoveModal";
import { useOrg } from "@/providers/org-provider";
import { api } from "@/utils/api";
import { toast } from "@/hooks/use-toast";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface UserAccessListProps {
    access: RoleAccess[];
    inviteUser: (email: string) => Promise<void>;
    removeUser: (userId: string) => Promise<void>;
    onRoleUpdate?: () => void;
}

const UserAccessList: React.FC<UserAccessListProps> = ({
    access,
    removeUser,
    inviteUser,
    onRoleUpdate,
}) => {
    const { orgId } = useOrg();
    const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
    const [roles, setRoles] = useState<OrganizationRole[]>([]);

    const fetchRoles = useCallback(async () => {
        if (!orgId) return;
        try {
            const res = await api.get(`/orgs/${orgId}/roles`);
            setRoles(res.data);
        } catch (err) {
            console.error("Failed to fetch roles:", err);
        }
    }, [orgId]);

    useEffect(() => {
        fetchRoles();
    }, [fetchRoles]);

    const handleRoleChange = async (userId: string, roleId: string | null) => {
        setUpdatingUserId(userId);
        try {
            await api.put(`/orgs/${orgId}/users/${userId}/role`, {
                organizationRoleId: roleId === "none" ? null : roleId,
            });
            toast({
                title: "Success",
                description: "User role updated successfully",
            });
            onRoleUpdate?.();
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.response?.data?.message || "Failed to update user role",
                variant: "destructive",
            });
        } finally {
            setUpdatingUserId(null);
        }
    };

    const columns: ColumnDef<RoleAccess>[] = [
        {
            accessorKey: "user.name",
            header: "Name",
            cell: ({ row }) => row.original.user?.name || "Unknown",
        },
        {
            accessorKey: "user.email",
            header: "Email",
            cell: ({ row }) => row.original.user?.email || "N/A",
        },
        {
            id: "role",
            header: "Role",
            cell: ({ row }) => {
                const isUpdating = updatingUserId === row.original.userId;
                const currentRoleId = row.original.organizationRoleId || null;

                return (
                    <div className="flex items-center gap-2">
                        {isUpdating && <Loader2 className="h-4 w-4 animate-spin" />}
                        <Select
                            value={currentRoleId || "none"}
                            onValueChange={(value) => handleRoleChange(row.original.userId, value)}
                            disabled={isUpdating}
                        >
                            <SelectTrigger className="w-[200px]">
                                <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">
                                    <span className="text-muted-foreground">No Role</span>
                                </SelectItem>
                                {roles.map((role) => (
                                    <SelectItem key={role.id} value={role.id}>
                                        <div className="flex items-center gap-2">
                                            <Shield className="h-3 w-3" />
                                            {role.title}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                );
            },
            enableSorting: false,
        },
        {
            id: "actions",
            header: "Actions",
            cell: ({ row }) => (
                <RemoveModal
                    title="Remove Access"
                    description={`Are you sure you want to remove access for ${
                        row.original.user?.name || "this user"
                    }?`}
                    onRemove={() => removeUser(row.original.userId)}
                />
            ),
            enableSorting: false,
        },
    ];

    return (
        <div className="bg-gray-50 rounded-2xl shadow-none">
            <Card className="border-none w-full shadow-none p-0">
                <CardHeader className="flex flex-row justify-between items-center border-b pb-4">
                    <h2 className="text-xl font-bold text-gray-800">User Access</h2>
                    <InviteUser onInvite={inviteUser} />
                </CardHeader>
                <CardContent className="pt-4">
                    {access.length ? (
                        <TableComponent
                            columns={columns}
                            data={access}
                            allowSelection={false}
                            showFooter={true}
                            allowPagination
                        />
                    ) : (
                        <div className="text-center text-gray-500">No users with access.</div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default UserAccessList;
