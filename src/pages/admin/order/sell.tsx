import { useOrg } from "@/providers/org-provider";
import { useState, useEffect } from "react";
import { Account, Entity, Product } from "@/data/types";
import { api } from "@/utils/api";
import BuyProductForm from "@/components/forms/BuyOrderForm";
export const SellOrderPage = () => {
    const { orgId } = useOrg();
    const [products, setProducts] = useState<Product[]>([]);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [entities, setEntities] = useState<Entity[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!orgId) return;

        const fetchAllData = async () => {
            setLoading(true);
            setError(null);
            try {
                const [products, accounts, entities] = await Promise.all([
                    api.get(`/orgs/${orgId}/products`),
                    api.get(`/orgs/${orgId}/accounts`),
                    api.get(`/orgs/${orgId}/entities`),
                ]).then((responses) =>
                    responses.map((response) => response.data)
                );
                setProducts(products);
                setAccounts(accounts);
                setEntities(entities);
            } catch (err) {
                console.error("Error fetching data:", err);
                setError("Failed to load data. Please try again.");
            } finally {
                setLoading(false);
            }
        };

        fetchAllData();
    }, [orgId]);

    const onCreateOrder = async (data: object) => {
        try {
            const order = await api.post(`/orgs/${orgId}/orders`, data);
            console.log("Order created successfully:", order);
            return order.data;
        } catch (err) {
            console.error("Error creating order:", err);
        }
    };

    if (loading) {
        return <p className="text-center text-gray-600">Loading...</p>;
    }

    if (error) {
        return <p className="text-center text-red-500">{error}</p>;
    }
    const addEntity = async (entity: Partial<Entity>) => {
        try {
            const res = await api.post(`/orgs/${orgId}/entities`, entity);
            setEntities((prev) => [...prev, res.data]);
            return res.data;
        } catch (error) {
            console.error("Error adding entity:", error);
            throw error;
        }
    };

    return (
        <section className="container ">
            <BuyProductForm
                products={products}
                accounts={accounts}
                entities={entities.filter((e) => e.isMerchant)}
                onSubmit={onCreateOrder}
                addEntity={addEntity}
                defaultEntity={entities.find((e) => e.isDefault)}
                type="SELL"
            />
        </section>
    );
};

export default SellOrderPage;
