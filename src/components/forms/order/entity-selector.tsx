"use client";

import { useState, useMemo } from "react";
import { Check, ChevronsUpDown, UserPlus } from "lucide-react";
import type { Entity } from "@/data/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import AddEntity from "@/components/modals/AddEntity";

interface EntitySelectorProps {
    entities: Entity[];
    selectedEntity?: Entity | null;
    onSelectEntity: (entity: Entity | null) => void;
    onAddEntity: (entity: Partial<Entity>) => Promise<void>;
    error?: string | null;
    type?: "merchant" | "vendor" | "both";
}

export function EntitySelector({
    entities,
    selectedEntity,
    onSelectEntity,
    onAddEntity,
    error,
    type = "both",
}: EntitySelectorProps) {
    const [open, setOpen] = useState(false);
    const [searchValue, setSearchValue] = useState("");

    // Filter entities based on search value
    const filteredEntities = useMemo(() => {
        if (!searchValue) return entities;
        return entities.filter(
            (entity) =>
                entity.name.toLowerCase().includes(searchValue.toLowerCase()) ||
                entity.email?.toLowerCase().includes(searchValue.toLowerCase()) ||
                entity.phone?.toLowerCase().includes(searchValue.toLowerCase())
        );
    }, [entities, searchValue]);

    const handleSelectEntity = (entityId: string) => {
        const entity = entities.find((e) => e.id === entityId);
        if (entity) {
            onSelectEntity(entity);
            setOpen(false);
            setSearchValue("");
        }
    };

    const handleClear = () => {
        onSelectEntity(null);
    };

    return (
        <Card className="bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 shadow-sm">
            <CardHeader className="border-b border-gray-200 pb-4">
                <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center">
                        <UserPlus className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <CardTitle className="text-lg font-semibold text-gray-800">
                            Entity Information
                        </CardTitle>
                        <p className="text-sm text-gray-500 mt-0.5">
                            Select{" "}
                            {type === "vendor"
                                ? "vendor"
                                : type === "merchant"
                                ? "customer"
                                : "party"}
                        </p>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Entity Selection */}
                    <div className="space-y-2">
                        <Label htmlFor="entity" className="text-sm font-medium text-gray-700">
                            Search Entity/Party *
                        </Label>
                        <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                                <Popover open={open} onOpenChange={setOpen}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            role="combobox"
                                            aria-expanded={open}
                                            className="w-full justify-between bg-white hover:bg-gray-50 border-gray-300 h-11"
                                        >
                                            {selectedEntity ? (
                                                <div className="flex items-center gap-2 truncate">
                                                    <span className="font-medium truncate">
                                                        {selectedEntity.name}
                                                    </span>
                                                    {selectedEntity.email && (
                                                        <span className="text-xs text-muted-foreground">
                                                            ({selectedEntity.email})
                                                        </span>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground">
                                                    Select entity...
                                                </span>
                                            )}
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[400px] p-0" align="start">
                                        <Command>
                                            <CommandInput
                                                placeholder="Search entities..."
                                                value={searchValue}
                                                onValueChange={setSearchValue}
                                            />
                                            <CommandList>
                                                <CommandEmpty>No entities found.</CommandEmpty>
                                                <CommandGroup>
                                                    {filteredEntities.map((entity) => (
                                                        <CommandItem
                                                            key={entity.id}
                                                            value={entity.id}
                                                            onSelect={() =>
                                                                handleSelectEntity(entity.id)
                                                            }
                                                            className="cursor-pointer"
                                                        >
                                                            <div className="flex items-center justify-between w-full">
                                                                <div className="flex flex-col">
                                                                    <span className="font-medium">
                                                                        {entity.name}
                                                                    </span>
                                                                    {entity.email && (
                                                                        <span className="text-sm text-muted-foreground">
                                                                            {entity.email}
                                                                        </span>
                                                                    )}
                                                                    {entity.phone && (
                                                                        <span className="text-sm text-muted-foreground">
                                                                            {entity.phone}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <Check
                                                                    className={cn(
                                                                        "ml-auto h-4 w-4",
                                                                        selectedEntity?.id ===
                                                                            entity.id
                                                                            ? "opacity-100"
                                                                            : "opacity-0"
                                                                    )}
                                                                />
                                                            </div>
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                            </div>

                            <AddEntity addEntity={onAddEntity} text="Add" type={type} />

                            {selectedEntity && (
                                <Button
                                    variant="outline"
                                    size="default"
                                    onClick={handleClear}
                                    className="h-11"
                                >
                                    Clear
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Email */}
                    <div className="space-y-2">
                        <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                            Email
                        </Label>
                        <Input
                            id="email"
                            placeholder="No email provided"
                            className="bg-white border-gray-300 h-11"
                            value={selectedEntity?.email || ""}
                            readOnly
                        />
                    </div>

                    {/* Phone */}
                    <div className="space-y-2">
                        <Label htmlFor="phone" className="text-sm font-medium text-gray-700">
                            Phone Number
                        </Label>
                        <Input
                            id="phone"
                            placeholder="No phone provided"
                            className="bg-white border-gray-300 h-11"
                            value={selectedEntity?.phone || ""}
                            readOnly
                        />
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <Label htmlFor="description" className="text-sm font-medium text-gray-700">
                            Description
                        </Label>
                        <Input
                            id="description"
                            placeholder="No description provided"
                            className="bg-white border-gray-300 h-11"
                            value={selectedEntity?.description || ""}
                            readOnly
                        />
                    </div>
                </div>

                {error && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-red-600 text-sm font-medium">{error}</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
