import { Entity } from "@/data/types";
import { TableComponent } from "../modules/Table";
import { ColumnDef } from "@tanstack/react-table";
import { RemoveModal } from "../modals/RemoveModal";
import AddEntity from "../modals/AddEntity";
import { Link } from "react-router-dom";
interface EntityListProps {
    entities: Entity[];
    loading: boolean;
    error: Error | null;
    onDelete: (id: string) => Promise<void>;
    onEdit: (id: string, entity: Partial<Entity>) => Promise<void>;
}

export const EntityList = ({
    entities,
    loading,
    onDelete,
    onEdit,
}: EntityListProps) => {
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
            header: "Delete",
            cell: (props) => (
                <RemoveModal
                    title="Remove Entity"
                    description="Are you sure you want to remove this entity?"
                    onRemove={() => onDelete(props.row.original.id)}
                />
            ),
            enableSorting: false,
        },
        {
            accessorKey: "id",
            header: "Edit",
            cell: (props) => (
                <AddEntity
                    addEntity={(entity: Partial<Entity>) =>
                        onEdit(props.row.original.id, entity)
                    }
                    entity={props.row.original}
                    text="Edit"
                />
            ),
            enableSorting: false,
        },
    ];
    if (loading) {
        return <div>Loading...</div>;
    }

    return (
        <TableComponent
            columns={columns}
            data={entities}
            allowExport={false}
            showFooter
            allowPagination
            allowSearch
        />
    );
};
