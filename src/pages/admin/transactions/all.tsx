import { Order } from "@/data/types";
import { useEffect, useState } from "react";
import { api } from "@/utils/api";
import { useOrg } from "@/providers/org-provider";
import { OrderList } from "@/components/lists/Orders";
import { TableSkeleton } from "@/components/modules/TableSkeleton";
import { useRequirePermissions } from "@/hooks/use-permissions";

export default function AllTransactionPage() {
    useRequirePermissions("ORDER_READ");
    const { orgId } = useOrg();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get(`orgs/${orgId}/orders`).then((data) => {
            setOrders(data.data);
            setLoading(false);
        });
    }, [orgId]);

    return (
        <section className="container mx-auto px-6 py-8 max-w-7xl">
            <h1 className="text-lg font-semibold text-gray-700 mb-8">Orders</h1>

            {loading ? <TableSkeleton rows={5} columns={4} /> : <OrderList orders={orders} />}
        </section>
    );
}
