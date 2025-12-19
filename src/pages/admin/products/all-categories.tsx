import CategoryList from "@/components/lists/CategoryList";
import AddCategory from "@/components/modals/AddCategory";
import { TableSkeleton } from "@/components/modules/TableSkeleton";
import { Category } from "@/data/types";
import { api } from "@/utils/api";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useRequirePermissions, usePermissions } from "@/hooks/use-permissions";

const OrgCategories = () => {
    useRequirePermissions("PRODUCT_READ");
    const { hasPermission } = usePermissions();
    const { orgId } = useParams<{ orgId: string }>() as { orgId: string };
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(false);
    const [, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                setLoading(true);
                const { data } = await api.get(`/orgs/${orgId}/category`);
                setCategories(data);
                setError(null);
            } catch (err) {
                setError("An error occurred while fetching categories");
            } finally {
                setLoading(false);
            }
        };

        fetchCategories();
    }, [orgId]);

    const addCategory = async (name: string, description: string) => {
        const newCategory = await api.post(`/orgs/${orgId}/category`, {
            name,
            description,
        });
        setCategories((prev) => [...prev, newCategory.data]);
        setError(null);
    };

    const handleRetry = async () => {
        setLoading(true);
        try {
            const { data } = await api.get(`/orgs/${orgId}/category`);
            setCategories(data);
            setError(null);
        } catch (err) {
            setError("An error occurred while fetching categories");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="">
            <div className="flex justify-between items-center mb-6">
                <div className="">
                    <h2 className="text-2xl font-bold text-gray-800">Categories</h2>
                    <p className="text-gray-600">Manage your categories here</p>
                </div>
                {hasPermission("PRODUCT_CREATE") && <AddCategory onAddCategory={addCategory} />}
            </div>
            {loading ? (
                <TableSkeleton rows={5} columns={4} />
            ) : (
                <div className="mb-4">
                    <CategoryList categories={categories} loading={loading} onRetry={handleRetry} />
                </div>
            )}
        </div>
    );
};

export default OrgCategories;
