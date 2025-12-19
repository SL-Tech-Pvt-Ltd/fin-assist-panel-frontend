"use client";

import { useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    CheckCircle,
    Plus,
    ShoppingCart,
    TrendingUp,
    ArrowLeft,
    Package,
} from "lucide-react";

export default function ProductSuccessPage() {
    const navigate = useNavigate();
    const { orgId } = useParams();
    const [searchParams] = useSearchParams();
    const productName = searchParams.get("productName") || "Product";
    const productId = searchParams.get("productId");

    useEffect(() => {
        // Scroll to top on mount
        window.scrollTo(0, 0);
    }, []);

    const handleCreateAnother = () => {
        navigate(`/org/${orgId}/products/create`);
    };

    const handleBuyProduct = () => {
        navigate(`/org/${orgId}/orders/buy`);
    };

    const handleSellProduct = () => {
        navigate(`/org/${orgId}/orders/sell`);
    };

    const handleViewProduct = () => {
        if (productId) {
            navigate(`/org/${orgId}/products/${productId}`);
        }
    };

    const handleViewAllProducts = () => {
        navigate(`/org/${orgId}/products`);
    };

    const handleBackToDashboard = () => {
        navigate(`/org/${orgId}/dashboard`);
    };

    return (
        <div className="max-w-4xl mx-auto py-8 px-4">
            {/* Success Header */}
            <div className="text-center mb-8">
                <div className="mb-4">
                    <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
                </div>
                <h1 className="text-3xl font-bold text-green-700 mb-2">
                    Product Created Successfully!
                </h1>
                <p className="text-lg text-muted-foreground mb-4">
                    <span className="font-semibold">{productName}</span> has
                    been created and is now available in your inventory.
                </p>
            </div>

            {/* Action Cards */}
            <div className="grid gap-6 md:grid-cols-2 mb-8">
                {/* Quick Actions Card */}
                <Card className="border-2 border-green-200 bg-green-50/50">
                    <CardContent className="p-6">
                        <h2 className="text-xl font-semibold mb-4 flex items-center">
                            <Package className="h-5 w-5 mr-2 text-green-600" />
                            Product Actions
                        </h2>
                        <div className="space-y-3">
                            <Button
                                onClick={handleCreateAnother}
                                className="w-full justify-start"
                                variant="outline"
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                Create Another Product
                            </Button>

                            {productId && (
                                <Button
                                    onClick={handleViewProduct}
                                    className="w-full justify-start"
                                    variant="outline"
                                >
                                    <Package className="h-4 w-4 mr-2" />
                                    View Product Details
                                </Button>
                            )}

                            <Button
                                onClick={handleViewAllProducts}
                                className="w-full justify-start"
                                variant="outline"
                            >
                                <Package className="h-4 w-4 mr-2" />
                                View All Products
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Transaction Actions Card */}
                <Card className="border-2 border-blue-200 bg-blue-50/50">
                    <CardContent className="p-6">
                        <h2 className="text-xl font-semibold mb-4 flex items-center">
                            <TrendingUp className="h-5 w-5 mr-2 text-blue-600" />
                            Transaction Actions
                        </h2>
                        <div className="space-y-3">
                            <Button
                                onClick={handleBuyProduct}
                                className="w-full justify-start bg-blue-600 hover:bg-blue-700"
                            >
                                <ShoppingCart className="h-4 w-4 mr-2" />
                                Create Buy Order
                            </Button>

                            <Button
                                onClick={handleSellProduct}
                                className="w-full justify-start bg-green-600 hover:bg-green-700"
                            >
                                <TrendingUp className="h-4 w-4 mr-2" />
                                Create Sell Order
                            </Button>
                        </div>

                        <div className="mt-4 p-3 bg-white/50 rounded-lg border">
                            <p className="text-sm text-muted-foreground">
                                Ready to start trading? Create buy or sell
                                orders for your new product.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Navigation */}
            <div className="flex justify-center">
                <Button
                    onClick={handleBackToDashboard}
                    variant="outline"
                    className="min-w-[200px]"
                >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Dashboard
                </Button>
            </div>
        </div>
    );
}
