import { Category } from "@/data/types";
import { TableComponent } from "../modules/Table";
import { ColumnDef } from "@tanstack/react-table";
import { RemoveModal } from "../modals/RemoveModal";
import { api } from "@/utils/api";
import { useOrg } from "@/providers/org-provider";
import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ProductList } from "./ProductList";
import { Eye, Package, TrendingUp, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
interface CategoryListProps {
    categories: Category[];
    loading: boolean;
    error?: Error | null;
    onRetry: () => void;
    canManage?: boolean;
}

const CategoryList: React.FC<CategoryListProps> = ({
    categories,
    loading,
    error,
    onRetry,
    canManage = false,
}) => {
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
    const [isUpdateRateDialogOpen, setIsUpdateRateDialogOpen] = useState(false);
    const [updateRateCategory, setUpdateRateCategory] = useState<Category | null>(null);
    const [percentage, setPercentage] = useState<string>("");
    const [isUpdatingRates, setIsUpdatingRates] = useState(false);

    if (loading) {
        return <div>Loading...</div>;
    }
    const { orgId } = useOrg();

    if (error) {
        return (
            <div>
                <div>Failed to load categories: {error.message}</div>
                <button onClick={onRetry}>Retry</button>
            </div>
        );
    }

    const handleCategoryClick = (category: Category) => {
        setSelectedCategory(category);
        setIsSheetOpen(true);
    };

    const handleUpdateRateClick = (category: Category) => {
        setUpdateRateCategory(category);
        setPercentage("");
        setIsUpdateRateDialogOpen(true);
    };

    const handleUpdateSellingRates = async () => {
        if (!updateRateCategory || !percentage) {
            toast({
                title: "Error",
                description: "Please enter a valid percentage",
                variant: "destructive",
            });
            return;
        }

        const numericPercentage = parseFloat(percentage);
        if (isNaN(numericPercentage)) {
            toast({
                title: "Error",
                description: "Please enter a valid number",
                variant: "destructive",
            });
            return;
        }

        setIsUpdatingRates(true);
        try {
            const response = await api.put(
                `/orgs/${orgId}/categories/${updateRateCategory.id}/selling-rates`,
                { percentage: numericPercentage }
            );

            toast({
                title: "Success",
                description: response.data.message,
            });

            setIsUpdateRateDialogOpen(false);
            setPercentage("");
            onRetry(); // Refresh the data
        } catch (error: any) {
            console.error("Failed to update selling rates:", error);
            toast({
                title: "Error",
                description: error.response?.data?.error || "Failed to update selling rates",
                variant: "destructive",
            });
        } finally {
            setIsUpdatingRates(false);
        }
    };
    const handleDelete = async (id: string) => {
        try {
            await api.delete(`/orgs/${orgId}/category/${id}`);
            onRetry();
        } catch (error) {
            console.error("Failed to delete category:", error);
        }
    };
    const columns: ColumnDef<Category>[] = [
        {
            accessorKey: "name",
            header: "Name",
            cell: (props) => (
                <Button
                    variant="link"
                    onClick={() => handleCategoryClick(props.row.original)}
                    className="p-0 h-auto font-normal text-blue-600 hover:text-blue-800"
                >
                    <Eye className="w-4 h-4 mr-1" />
                    {props.row.original.name.slice(0, 40)}
                </Button>
            ),
        },
        {
            accessorKey: "description",
            header: "Description",
            enableSorting: false,
        },
        {
            accessorKey: "createdAt",
            header: "Created At",
            cell: (props) =>
                new Date(props.row.original.createdAt).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                }),
        },
        {
            accessorKey: "updatedAt",
            header: "Updated At",
            cell: (props) =>
                new Date(props.row.original.updatedAt).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                }),
            enableSorting: false,
        },
        {
            accessorKey: "id",
            header: "Actions",
            cell: (props) =>
                canManage && (
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUpdateRateClick(props.row.original)}
                            className="h-8 px-2"
                        >
                            <TrendingUp className="w-3 h-3 mr-1" />
                            Update Rates
                        </Button>
                        <RemoveModal
                            title="Remove Category"
                            onRemove={() => handleDelete(props.row.original.id)}
                            description="Are you sure you want to remove this category?"
                        />
                    </div>
                ),
            enableSorting: false,
        },
    ];
    return (
        <>
            <TableComponent
                columns={columns}
                data={categories}
                allowPagination={true}
                allowSearch={true}
                allowSelection={false}
                showFooter={true}
            />

            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                <SheetContent side="right" className="w-[800px] sm:max-w-[800px]">
                    <SheetHeader>
                        <SheetTitle className="flex items-center gap-2">
                            <Package className="w-5 h-5" />
                            Products in "{selectedCategory?.name}"
                        </SheetTitle>
                    </SheetHeader>

                    <div className="mt-6">
                        {!selectedCategory ? (
                            <div className="text-center py-8">
                                <p className="text-gray-500">No category selected</p>
                            </div>
                        ) : selectedCategory.products && selectedCategory.products.length > 0 ? (
                            <div className="h-[calc(100vh-180px)] overflow-auto">
                                <ProductList
                                    products={selectedCategory.products}
                                    isLoading={false}
                                    error=""
                                />
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                <p className="text-gray-500 mb-4">
                                    No products found in this category
                                </p>
                                <Link to={`/org/${orgId}/products/create`}>
                                    <Button>Create New Product</Button>
                                </Link>
                            </div>
                        )}
                    </div>
                </SheetContent>
            </Sheet>

            {/* Update Selling Rates Dialog */}
            <Dialog open={isUpdateRateDialogOpen} onOpenChange={setIsUpdateRateDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <TrendingUp className="w-5 h-5" />
                            Update Selling Rates
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Category</Label>
                            <div className="p-2 bg-gray-100 rounded border">
                                {updateRateCategory?.name}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="percentage">Percentage Increase (%)</Label>
                            <Input
                                id="percentage"
                                type="number"
                                placeholder="e.g., 10 for 10% increase"
                                value={percentage}
                                onChange={(e) => setPercentage(e.target.value)}
                                min="-100"
                                step="0.01"
                            />
                            <p className="text-sm text-gray-600">
                                This will update the selling price of all products in this category
                                based on their latest purchase price from stock.
                                {percentage && !isNaN(parseFloat(percentage)) && (
                                    <span className="font-medium">
                                        {parseFloat(percentage) > 0
                                            ? `Prices will increase by ${percentage}%`
                                            : `Prices will decrease by ${Math.abs(
                                                  parseFloat(percentage)
                                              )}%`}
                                    </span>
                                )}
                            </p>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setIsUpdateRateDialogOpen(false);
                                setPercentage("");
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleUpdateSellingRates}
                            disabled={isUpdatingRates || !percentage}
                        >
                            {isUpdatingRates && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Update Rates
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default CategoryList;
