import { useCallback, useEffect, useMemo, useState } from "react";
import { useOrg } from "@/providers/org-provider";
import { api } from "@/utils/api";
import { toast } from "@/hooks/use-toast";
import { useRequirePermissions } from "@/hooks/use-permissions";

import type { RoleAccess, Invite } from "@/data/types";

import {
    AlertCircle,
    CheckCircle2,
    Loader2,
    RefreshCw,
    Shield,
    UserPlus,
    Users,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

import UserAccessList from "@/components/lists/UsersAccessList";
import UserInviteList from "@/components/lists/UserInviteList";

export default function OrgUsers() {
    useRequirePermissions(["ORGANIZATION_READ", "ORGANIZATION_ADMIN"]);
    // const { hasPermission } = usePermissions();
    const { orgId } = useOrg();
    const [activeTab, setActiveTab] = useState("members");

    const [access, setAccess] = useState<RoleAccess[]>([]);
    const [invites, setInvites] = useState<Invite[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [, setActionInProgress] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        if (!orgId) return;
        setError(null);
        setLoading(true);
        try {
            const res = await api.get(`/orgs/${orgId}/users`);
            setAccess(res.data.access);
            setInvites(res.data.invites);
        } catch (err) {
            setError("Failed to load organization users.");
        } finally {
            setLoading(false);
        }
    }, [orgId]);

    const refreshData = useCallback(async () => {
        if (!orgId) return;
        setRefreshing(true);
        try {
            const res = await api.get(`/orgs/${orgId}/users`);
            setAccess(res.data.access);
            setInvites(res.data.invites);
        } catch {
            toast({ title: "Failed to refresh data", variant: "destructive" });
        } finally {
            setRefreshing(false);
        }
    }, [orgId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleAction = useCallback(
        async (actionFn: () => Promise<void>, successMsg: string, errorMsg: string) => {
            try {
                await actionFn();
                await refreshData();
                toast({ title: successMsg });
            } catch {
                toast({ title: errorMsg, variant: "destructive" });
            } finally {
                setActionInProgress(null);
            }
        },
        [refreshData]
    );

    const inviteUser = useCallback(
        async (email: string): Promise<void> => {
            if (!orgId) return;
            setActionInProgress(`invite-${email}`);
            await handleAction(
                () => api.post(`/orgs/${orgId}/invite`, { email }),
                `Successfully invited ${email}`,
                "Failed to send invitation"
            );
        },
        [orgId, handleAction]
    );

    const removeInvite = useCallback(
        async (inviteId: string): Promise<void> => {
            if (!orgId) return;
            setActionInProgress(`remove-invite-${inviteId}`);
            await handleAction(
                () => api.delete(`/orgs/${orgId}/invite/${inviteId}`),
                "Invite removed",
                "Failed to remove invite"
            );
        },
        [orgId, handleAction]
    );

    const removeUser = useCallback(
        async (userId: string) => {
            if (!orgId) return;
            setActionInProgress(`remove-user-${userId}`);
            return handleAction(
                () => api.delete(`/orgs/${orgId}/users/${userId}`),
                "User removed",
                "Failed to remove user"
            );
        },
        [orgId, handleAction]
    );

    const loadingSkeleton = (
        <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
                <div key={i} className="flex justify-between items-center p-4 border rounded-md">
                    <div className="flex items-center gap-3">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-[200px]" />
                            <Skeleton className="h-3 w-[150px]" />
                        </div>
                    </div>
                    <Skeleton className="h-9 w-[100px]" />
                </div>
            ))}
        </div>
    );

    const tabContent = useMemo(() => {
        if (loading) return loadingSkeleton;

        if (activeTab === "members") {
            return (
                <UserAccessList
                    access={access}
                    removeUser={removeUser}
                    inviteUser={inviteUser}
                    onRoleUpdate={refreshData}
                />
            );
        }

        if (!invites.length) {
            return (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                    <CheckCircle2 className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium">No pending invitations</h3>
                    <p className="text-muted-foreground mt-1 max-w-md">
                        When you invite new team members, they'll appear here until they accept
                    </p>
                </div>
            );
        }

        return <UserInviteList invites={invites} removeInvite={removeInvite} />;
    }, [loading, access, invites, activeTab, removeUser, inviteUser, removeInvite, refreshData]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Organization Users</h1>
                    <p className="text-muted-foreground mt-1">
                        Manage team members and pending invitations
                    </p>
                </div>

                <Button
                    onClick={refreshData}
                    variant="outline"
                    size="sm"
                    disabled={refreshing}
                    className="self-start sm:self-auto"
                >
                    {refreshing ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <RefreshCw className="mr-2 h-4 w-4" />
                    )}
                    Refresh
                </Button>
            </div>

            {error && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <CardTitle className="flex items-center">
                                <Users className="mr-2 h-5 w-5" />
                                Team Management
                            </CardTitle>
                            <CardDescription>
                                Invite new members and manage existing team access
                            </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            <Badge variant="outline" className="font-normal">
                                {access.length} Members
                            </Badge>
                            <Badge variant="outline" className="font-normal">
                                {invites.length} Pending
                            </Badge>
                        </div>
                    </div>
                </CardHeader>

                <CardContent>
                    <Tabs value={activeTab} onValueChange={setActiveTab}>
                        <TabsList className="mb-4 grid w-full grid-cols-2">
                            <TabsTrigger value="members" className="flex items-center gap-2">
                                <Shield className="h-4 w-4" />
                                <span>Members</span>
                            </TabsTrigger>
                            <TabsTrigger value="invites" className="flex items-center gap-2">
                                <UserPlus className="h-4 w-4" />
                                <span>Invitations</span>
                                {invites.length > 0 && (
                                    <Badge variant="secondary" className="ml-1">
                                        {invites.length}
                                    </Badge>
                                )}
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="members">{tabContent}</TabsContent>
                        <TabsContent value="invites">{tabContent}</TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
}
