import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Eye, Edit, Lock, MoreHorizontal } from "lucide-react";
// import { useRequirePermissions, usePermissions } from "@/hooks/use-permissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { useOrg } from "@/providers/org-provider";
import { api } from "@/utils/api";
import { toast } from "@/hooks/use-toast";
import { POSRegister, CreatePOSRegisterData, ClosePOSRegisterData } from "@/data/pos-types";

export default function POSRegistersPage() {
    // useRequirePermissions("POS_READ");
    // const { hasPermission } = usePermissions();
    const { orgId, myPermissions, isOwner } = useOrg();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [registers, setRegisters] = useState<POSRegister[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [filter, setFilter] = useState<"all" | "open" | "closed">("all");

    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [showCloseDialog, setShowCloseDialog] = useState(false);
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [selectedRegister, setSelectedRegister] = useState<POSRegister | null>(null);

    const [createFormData, setCreateFormData] = useState<CreatePOSRegisterData>({
        title: "",
        openingBalance: 0,
        description: "",
    });
    const [closeFormData, setCloseFormData] = useState<ClosePOSRegisterData>({
        actualClosingBalance: 0,
    });
    const [editFormData, setEditFormData] = useState({ title: "", description: "" });
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (orgId) loadRegisters();
    }, [orgId]);

    const loadRegisters = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/orgs/${orgId}/pos-registers`);
            setRegisters(response.data || []);
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to load registers",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleCreateRegister = async () => {
        if (!createFormData.title.trim()) {
            toast({ title: "Error", description: "Title is required", variant: "destructive" });
            return;
        }
        try {
            setIsSubmitting(true);
            await api.post(`/orgs/${orgId}/pos-registers`, createFormData);
            toast({ title: "Success", description: "Register created" });
            setShowCreateDialog(false);
            setCreateFormData({ title: "", openingBalance: 0, description: "" });
            loadRegisters();
        } catch {
            toast({
                title: "Error",
                description: "Failed to create register",
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCloseRegister = async () => {
        if (!selectedRegister) return;
        try {
            setIsSubmitting(true);
            await api.post(
                `/orgs/${orgId}/pos-registers/${selectedRegister.id}/close`,
                closeFormData
            );
            toast({ title: "Success", description: "Register closed" });
            setShowCloseDialog(false);
            setSelectedRegister(null);
            loadRegisters();
        } catch {
            toast({
                title: "Error",
                description: "Failed to close register",
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdateRegister = async () => {
        if (!selectedRegister) return;
        try {
            setIsSubmitting(true);
            await api.put(`/orgs/${orgId}/pos-registers/${selectedRegister.id}`, editFormData);
            toast({ title: "Success", description: "Register updated" });
            setShowEditDialog(false);
            setSelectedRegister(null);
            loadRegisters();
        } catch {
            toast({
                title: "Error",
                description: "Failed to update register",
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const openCloseDialog = (register: POSRegister) => {
        setSelectedRegister(register);
        setCloseFormData({ actualClosingBalance: register.expectedClosingBalance });
        setShowCloseDialog(true);
    };

    const openEditDialog = (register: POSRegister) => {
        setSelectedRegister(register);
        setEditFormData({ title: register.title, description: register.description || "" });
        setShowEditDialog(true);
    };

    const formatCurrency = (amount: number | undefined | null) => {
        return `Rs ${(amount ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const filteredRegisters = registers.filter((r) => {
        const matchesSearch =
            r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.description?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFilter =
            filter === "all" ||
            (filter === "open" && !r.isClosed) ||
            (filter === "closed" && r.isClosed);
        return matchesSearch && matchesFilter;
    });

    const openCount = registers.filter((r) => !r.isClosed).length;

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-semibold">POS Registers</h1>
                    <p className="text-sm text-muted-foreground">
                        {openCount} open · {registers.length - openCount} closed
                    </p>
                </div>
                {isOwner || myPermissions.includes("POS_CREATE") ? (
                    <Button onClick={() => setShowCreateDialog(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        New Register
                    </Button>
                ) : null}
            </div>

            {/* Filters */}
            <div className="flex gap-3 items-center">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9"
                    />
                </div>
                <div className="flex gap-1 bg-muted p-1 rounded-lg">
                    {(["all", "open", "closed"] as const).map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                                filter === f
                                    ? "bg-background shadow-sm font-medium"
                                    : "text-muted-foreground hover:text-foreground"
                            }`}
                        >
                            {f.charAt(0).toUpperCase() + f.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Table */}
            <div className="border rounded-lg">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Register</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Opening</TableHead>
                            <TableHead className="text-right">Current</TableHead>
                            <TableHead>Opened</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell
                                    colSpan={6}
                                    className="text-center py-8 text-muted-foreground"
                                >
                                    Loading...
                                </TableCell>
                            </TableRow>
                        ) : filteredRegisters.length === 0 ? (
                            <TableRow>
                                <TableCell
                                    colSpan={6}
                                    className="text-center py-8 text-muted-foreground"
                                >
                                    No registers found
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredRegisters.map((register) => (
                                <TableRow
                                    key={register.id}
                                    className="cursor-pointer hover:bg-muted/50"
                                    onClick={() => {
                                        if (isOwner || myPermissions.includes("POS_UPDATE")) {
                                            navigate(`/org/${orgId}/pos/${register.id}`);
                                        }
                                    }}
                                >
                                    <TableCell>
                                        <div className="font-medium">{register.title}</div>
                                        {register.description && (
                                            <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                                                {register.description}
                                            </div>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            variant={register.isClosed ? "secondary" : "default"}
                                        >
                                            {register.isClosed ? "Closed" : "Open"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right font-mono text-sm">
                                        {formatCurrency(register.openingBalance)}
                                    </TableCell>
                                    <TableCell className="text-right font-mono text-sm">
                                        <span
                                            className={!register.isClosed ? "text-green-600" : ""}
                                        >
                                            {formatCurrency(register.expectedClosingBalance)}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {formatDate(register.createdAt)}
                                    </TableCell>
                                    <TableCell>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger
                                                asChild
                                                onClick={(e) => e.stopPropagation()}
                                                disabled={
                                                    !(
                                                        isOwner ||
                                                        myPermissions.includes("POS_UPDATE")
                                                    )
                                                }
                                            >
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8"
                                                >
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        navigate(
                                                            `/org/${orgId}/pos/${register.id}`
                                                        );
                                                    }}
                                                >
                                                    <Eye className="h-4 w-4 mr-2" />
                                                    View
                                                </DropdownMenuItem>
                                                {!register.isClosed && (
                                                    <>
                                                        <DropdownMenuItem
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                openEditDialog(register);
                                                            }}
                                                        >
                                                            <Edit className="h-4 w-4 mr-2" />
                                                            Edit
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                openCloseDialog(register);
                                                            }}
                                                        >
                                                            <Lock className="h-4 w-4 mr-2" />
                                                            Close
                                                        </DropdownMenuItem>
                                                    </>
                                                )}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Create Dialog */}
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Open New Register</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="title">Title</Label>
                            <Input
                                id="title"
                                placeholder="e.g., Counter 1"
                                value={createFormData.title}
                                onChange={(e) =>
                                    setCreateFormData({ ...createFormData, title: e.target.value })
                                }
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="openingBalance">Opening Balance</Label>
                            <Input
                                id="openingBalance"
                                type="number"
                                placeholder="0.00"
                                value={createFormData.openingBalance || ""}
                                onChange={(e) =>
                                    setCreateFormData({
                                        ...createFormData,
                                        openingBalance: parseFloat(e.target.value) || 0,
                                    })
                                }
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="description">Description (optional)</Label>
                            <Textarea
                                id="description"
                                placeholder="Notes..."
                                value={createFormData.description}
                                onChange={(e) =>
                                    setCreateFormData({
                                        ...createFormData,
                                        description: e.target.value,
                                    })
                                }
                                rows={2}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleCreateRegister} disabled={isSubmitting}>
                            {isSubmitting ? "Creating..." : "Create"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Close Dialog */}
            <Dialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Close Register</DialogTitle>
                    </DialogHeader>
                    {selectedRegister && (
                        <div className="space-y-4">
                            <div className="bg-muted p-3 rounded-lg text-sm space-y-1">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Register</span>
                                    <span className="font-medium">{selectedRegister.title}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Expected</span>
                                    <span className="font-medium text-green-600">
                                        {formatCurrency(selectedRegister.expectedClosingBalance)}
                                    </span>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="actualClosingBalance">Actual Balance</Label>
                                <Input
                                    id="actualClosingBalance"
                                    type="number"
                                    value={closeFormData.actualClosingBalance || ""}
                                    onChange={(e) =>
                                        setCloseFormData({
                                            actualClosingBalance: parseFloat(e.target.value) || 0,
                                        })
                                    }
                                />
                            </div>
                            {closeFormData.actualClosingBalance !==
                                selectedRegister.expectedClosingBalance && (
                                <div
                                    className={`text-sm p-2 rounded ${
                                        closeFormData.actualClosingBalance <
                                        selectedRegister.expectedClosingBalance
                                            ? "bg-red-50 text-red-600"
                                            : "bg-green-50 text-green-600"
                                    }`}
                                >
                                    Difference:{" "}
                                    {formatCurrency(
                                        Math.abs(
                                            closeFormData.actualClosingBalance -
                                                selectedRegister.expectedClosingBalance
                                        )
                                    )}{" "}
                                    {closeFormData.actualClosingBalance <
                                    selectedRegister.expectedClosingBalance
                                        ? "(short)"
                                        : "(over)"}
                                </div>
                            )}
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowCloseDialog(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleCloseRegister} disabled={isSubmitting}>
                            {isSubmitting ? "Closing..." : "Close Register"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Dialog */}
            <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Edit Register</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-title">Title</Label>
                            <Input
                                id="edit-title"
                                value={editFormData.title}
                                onChange={(e) =>
                                    setEditFormData({ ...editFormData, title: e.target.value })
                                }
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-description">Description</Label>
                            <Textarea
                                id="edit-description"
                                value={editFormData.description}
                                onChange={(e) =>
                                    setEditFormData({
                                        ...editFormData,
                                        description: e.target.value,
                                    })
                                }
                                rows={2}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleUpdateRegister} disabled={isSubmitting}>
                            {isSubmitting ? "Saving..." : "Save"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
