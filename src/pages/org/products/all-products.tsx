import { Link, useParams } from "react-router-dom";
import { Product, Organization } from "@/data/types";
import { useEffect } from "react";
import { api } from "@/utils/api";
import { useState } from "react";
import { ProductList } from "@/components/lists/ProductList";
import { TableSkeleton } from "@/components/modules/TableSkeleton";
import { exportProductStockToExcel } from "@/utils/reportExports";
import { Download } from "lucide-react";
import { useRequirePermissions, usePermissions } from "@/hooks/use-permissions";

const OrgProducts = () => {
    useRequirePermissions("PRODUCT_READ");
    const { hasPermission } = usePermissions();
    const { orgId } = useParams<{ orgId: string }>() as { orgId: string };
    const [products, setProducts] = useState<Product[]>([]);
    const [organization, setOrganization] = useState<Organization | null>(null);
    const [loading, setLoading] = useState(false);
    const [exportLoading, setExportLoading] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [productsRes, orgRes] = await Promise.all([
                    api.get(`orgs/${orgId}/products`),
                    api.get(`orgs/${orgId}`),
                ]);
                setProducts(productsRes.data);
                setOrganization(orgRes.data);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [orgId]);

    const handleExportToExcel = async () => {
        if (!products.length) {
            alert("No products data to export");
            return;
        }

        setExportLoading(true);
        try {
            // Show user what's happening
            console.log("Starting comprehensive product stock export...");

            // Fetch detailed product data with variants and stock information
            const detailedProducts = await Promise.all(
                products.map(async (product, index) => {
                    try {
                        console.log(
                            `Fetching details for product ${index + 1}/${products.length}: ${
                                product.name
                            }`
                        );
                        const { data } = await api.get(`orgs/${orgId}/products/${product.id}`);
                        return data;
                    } catch (error) {
                        console.error(`Error fetching details for product ${product.id}:`, error);
                        return product; // Return original product if detailed fetch fails
                    }
                })
            );

            const timestamp = new Date().toISOString().split("T")[0];
            const fileName = `${
                organization?.name?.replace(/[^a-zA-Z0-9]/g, "-") || "Organization"
            }-comprehensive-stock-analysis-${timestamp}.xlsx`;

            exportProductStockToExcel(detailedProducts, organization, fileName);
        } catch (error) {
            console.error("Export error:", error);
            alert("Error exporting data. Please try again.");
        } finally {
            setExportLoading(false);
        }
    };

    // const handleProductCreated = (newProduct: Product) => {
    //     setProducts((prevProducts) => [...prevProducts, newProduct]);
    // };

    return (
        <div className="">
            <div className="flex justify-between items-center mb-6">
                <div className="">
                    <h1 className="text-2xl font-bold">Products</h1>
                    <p className="text-gray-600">Manage your products here</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={handleExportToExcel}
                        disabled={exportLoading || loading || products.length === 0}
                        className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm hover:shadow-md"
                        title="Export comprehensive stock analysis with FIFO details, aging analysis, alerts, and business insights"
                    >
                        <Download size={18} />
                        <span className="font-medium">
                            {exportLoading ? "Generating Report..." : "📊 Stock Analysis"}
                        </span>
                        {!exportLoading && products.length > 0 && (
                            <span className="text-emerald-100 text-sm">
                                ({products.length} products)
                            </span>
                        )}
                    </button>
                    {hasPermission("PRODUCT_CREATE") && (
                        <Link
                            to={`/org/${orgId}/products/create`}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-sm hover:shadow-md"
                        >
                            <span className="font-medium">Create Product</span>
                        </Link>
                    )}
                </div>
            </div>
            {loading ? (
                <TableSkeleton rows={5} columns={4} />
            ) : (
                <ProductList products={products} isLoading={loading} error="" />
            )}
        </div>
    );
};

export default OrgProducts;
