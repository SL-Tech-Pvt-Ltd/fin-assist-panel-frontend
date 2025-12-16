import { Link } from "react-router-dom";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building, ChevronRight, Shield } from "lucide-react";
import { RoleAccess } from "@/data/types";

interface PermissionsCardProps {
    orgId: string;
    permissions: RoleAccess[];
}

export function PermissionsCard({ orgId, permissions }: PermissionsCardProps) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-2xl font-semibold">
                    <Building className="h-6 w-6 inline-block mr-2 text-primary" />
                    {permissions[0].organization?.name || `Organization ID: ${orgId}`}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex flex-wrap gap-2">
                    {permissions.map((perm) => (
                        <Badge key={perm.id} variant="secondary">
                            <Shield className="h-3 w-3 mr-1" />
                            {"ACCESS"}
                        </Badge>
                    ))}
                </div>
            </CardContent>
            <CardFooter>
                <Link
                    to={`/org/${orgId}/dashboard`}
                    className="flex items-center text-primary hover:underline"
                >
                    <span className="text-sm font-medium mr-2">Go to Dashboard</span>
                    <ChevronRight className="h-4 w-4" />
                </Link>
            </CardFooter>
        </Card>
    );
}
