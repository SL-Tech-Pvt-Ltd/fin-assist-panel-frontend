import { api } from "@/utils/api";
import { useState, useEffect } from "react";
import { Entity } from "@/data/types";
import { useParams, Link } from "react-router-dom";
import { TableComponent } from "@/components/modules/Table";
import { ColumnDef } from "@tanstack/react-table";
import { RemoveModal } from "@/components/modals/RemoveModal";
import AddEntity from "@/components/modals/AddEntity";
import { TableSkeleton } from "@/components/modules/TableSkeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRequirePermissions, usePermissions } from "@/hooks/use-permissions";

const EntityInfo = () => {
    useRequirePermissions("ENTITY_READ");
    const { hasPermission } = usePermissions();
    const { orgId } = useParams<{ orgId: string }>() as { orgId: string };
    const [entities, setEntities] = useState<Entity[]>([]);
    const [loading, setLoading] = useState(false);

    // const { isOwner, myPermissions } = useOrg();

    useEffect(() => {
        if (orgId) {
            setLoading(true);
            api.get(`/orgs/${orgId}/entities`)
                .then((res) => {
                    setEntities(res.data ?? []);
                })
                .catch((error) => {
                    console.error("Failed to fetch entities:", error);
                })
                .finally(() => {
                    setLoading(false);
                });
        }
    }, [orgId]);

    const handleDelete = async (id: string) => {
        await api.delete(`/orgs/${orgId}/entities/${id}`);
        setEntities(entities.filter((entity) => entity.id !== id));
    };

    const addEntity = async (entity: Partial<Entity>) => {
        const createdEntity = await api.post(`/orgs/${orgId}/entities`, entity);
        setEntities([...entities, createdEntity.data]);
    };

    const updateEntity = async (id: string, entity: Partial<Entity>) => {
        await api.put(`/orgs/${orgId}/entities/${id}`, entity);
        setEntities(entities.map((e) => (e.id === id ? { ...e, ...entity } : e)));
    };

    const renderEntityTable = (filteredEntities: Entity[]) => {
        const columns: ColumnDef<Entity>[] = [
            {
                accessorKey: "name",
                header: "Name",
                cell: (props) => (
                    <Link
                        to={`/org/${props.row.original.organizationId}/entity/${props.row.original.id}`}
                        className="text-blue-600 hover:underline"
                    >
                        {props.row.original.name}
                    </Link>
                ),
            },
            {
                accessorKey: "phone",
                header: "Phone",
            },
            {
                accessorKey: "email",
                header: "Email",
            },
            {
                accessorKey: "description",
                header: "Description",
            },
            {
                accessorKey: "id",
                header: "Actions",
                cell: (props) => (
                    <div className="flex space-x-2">
                        {hasPermission("ENTITY_UPDATE") && (
                            <>
                                <RemoveModal
                                    title="Remove Entity"
                                    description="Are you sure you want to remove this entity?"
                                    onRemove={() => handleDelete(props.row.original.id)}
                                />
                                <AddEntity
                                    addEntity={(entity: Partial<Entity>) =>
                                        updateEntity(props.row.original.id, entity)
                                    }
                                    entity={props.row.original}
                                    text="Edit"
                                />
                            </>
                        )}
                    </div>
                ),
                enableSorting: false,
            },
        ];

        return (
            <TableComponent
                columns={columns}
                data={filteredEntities}
                allowExport={false}
                showFooter
                allowPagination
                allowSearch
            />
        );
    };

    return (
        <div className="w-full mx-auto">
            <div className="flex flex-row items-center justify-between">
                <h2 className="text-3xl font-bold">Entity/Party</h2>
                {hasPermission("ENTITY_CREATE") && <AddEntity addEntity={addEntity} />}
            </div>

            <div className=" mt-8">
                {loading ? (
                    <TableSkeleton rows={5} columns={4} />
                ) : (
                    <Tabs defaultValue="all" className="w-full">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="all">All Entities/Parties</TabsTrigger>
                            <TabsTrigger value="merchant">Merchant Entities/Parties</TabsTrigger>
                            <TabsTrigger value="vendor">Vendor Entities/Parties</TabsTrigger>
                        </TabsList>

                        <TabsContent value="all" className="mt-6">
                            {renderEntityTable(entities)}
                        </TabsContent>

                        <TabsContent value="merchant" className="mt-6">
                            {renderEntityTable(entities.filter((entity) => entity.isMerchant))}
                        </TabsContent>

                        <TabsContent value="vendor" className="mt-6">
                            {renderEntityTable(entities.filter((entity) => entity.isVendor))}
                        </TabsContent>
                    </Tabs>
                )}
            </div>
        </div>
    );
};

export default EntityInfo;
