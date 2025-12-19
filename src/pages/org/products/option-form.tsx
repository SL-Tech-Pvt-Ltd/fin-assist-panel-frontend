"use client";
import { useState, useEffect } from "react";
import type React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ProductOptions } from "./types";
import { generateSlug } from "./utils";
import { Plus, Trash2, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface OptionsFormProps {
    options: ProductOptions[];
    updateOptions: (options: ProductOptions[]) => void;
}

export function OptionsForm({ options, updateOptions }: OptionsFormProps) {
    const [focusedOptionIndex, setFocusedOptionIndex] = useState<number | null>(
        null
    );
    const [focusedValueIndices, setFocusedValueIndices] = useState<
        Record<number, number>
    >({});

    // Focus the first option name input when component mounts or when a new option is added
    useEffect(() => {
        if (options.length > 0 && focusedOptionIndex === null) {
            setFocusedOptionIndex(0);
        }
    }, [options.length, focusedOptionIndex]);

    const addOption = () => {
        const newOption: ProductOptions = {
            name: "",
            slug: "",
            values: [],
        };
        const newIndex = options.length;
        updateOptions([...options, newOption]);
        setFocusedOptionIndex(newIndex);
    };

    const removeOption = (index: number) => {
        const newOptions = [...options];
        newOptions.splice(index, 1);
        updateOptions(newOptions);

        // Update focused option index
        if (focusedOptionIndex === index) {
            setFocusedOptionIndex(
                index < newOptions.length ? index : newOptions.length - 1
            );
        } else if (focusedOptionIndex !== null && focusedOptionIndex > index) {
            setFocusedOptionIndex(focusedOptionIndex - 1);
        }
    };

    const updateOption = (index: number, data: Partial<ProductOptions>) => {
        const newOptions = [...options];
        newOptions[index] = {
            ...newOptions[index],
            ...data,
        };

        // Generate slug if name changes
        if (data.name) {
            newOptions[index].slug = generateSlug(data.name);
        }

        updateOptions(newOptions);
    };

    const addOptionValue = (optionIndex: number) => {
        const newOptions = [...options];
        const valueIndex = newOptions[optionIndex].values.length;
        newOptions[optionIndex].values.push({
            value: "",
            slug: "",
        });
        updateOptions(newOptions);

        // Focus the new value input
        setFocusedValueIndices({
            ...focusedValueIndices,
            [optionIndex]: valueIndex,
        });
    };

    const updateOptionValue = (
        optionIndex: number,
        valueIndex: number,
        value: string
    ) => {
        const newOptions = [...options];
        newOptions[optionIndex].values[valueIndex].value = value;
        newOptions[optionIndex].values[valueIndex].slug = generateSlug(value);
        updateOptions(newOptions);
    };

    const removeOptionValue = (optionIndex: number, valueIndex: number) => {
        const newOptions = [...options];
        newOptions[optionIndex].values.splice(valueIndex, 1);
        updateOptions(newOptions);

        // Update focused value index
        if (focusedValueIndices[optionIndex] === valueIndex) {
            const newFocusedValueIndices = { ...focusedValueIndices };
            if (valueIndex < newOptions[optionIndex].values.length) {
                newFocusedValueIndices[optionIndex] = valueIndex;
            } else if (newOptions[optionIndex].values.length > 0) {
                newFocusedValueIndices[optionIndex] =
                    newOptions[optionIndex].values.length - 1;
            } else {
                delete newFocusedValueIndices[optionIndex];
            }
            setFocusedValueIndices(newFocusedValueIndices);
        } else if (
            focusedValueIndices[optionIndex] !== undefined &&
            focusedValueIndices[optionIndex] > valueIndex
        ) {
            setFocusedValueIndices({
                ...focusedValueIndices,
                [optionIndex]: focusedValueIndices[optionIndex] - 1,
            });
        }
    };

    // Handle keyboard navigation
    const handleOptionKeyDown = (
        e: React.KeyboardEvent<HTMLInputElement>,
        optionIndex: number
    ) => {
        if (e.key === "Enter") {
            e.preventDefault();
            // If option has no values, add one
            if (options[optionIndex].values.length === 0) {
                addOptionValue(optionIndex);
            } else {
                // Focus the first value input
                setFocusedValueIndices({
                    ...focusedValueIndices,
                    [optionIndex]: 0,
                });
            }
        }
    };

    const handleValueKeyDown = (
        e: React.KeyboardEvent<HTMLInputElement>,
        optionIndex: number,
        valueIndex: number
    ) => {
        if (e.key === "Enter") {
            e.preventDefault();
            // Add a new value
            addOptionValue(optionIndex);
        } else if (
            e.key === "Backspace" &&
            options[optionIndex].values[valueIndex].value === ""
        ) {
            e.preventDefault();
            removeOptionValue(optionIndex, valueIndex);

            // If it was the last value, focus back on the option name
            if (options[optionIndex].values.length === 1) {
                setFocusedOptionIndex(optionIndex);
            }
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-semibold">Product Options</h2>
                <Button
                    onClick={addOption}
                    size="sm"
                    variant="outline"
                    className="gap-1"
                >
                    <Plus className="h-4 w-4" />
                    Add Option
                </Button>
            </div>

            {options.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed rounded-lg">
                    <h3 className="text-lg font-medium">
                        No options added yet
                    </h3>
                    <p className="text-muted-foreground mb-4">
                        Add options like Size, Color, Material, etc.
                    </p>
                    <Button onClick={addOption} variant="secondary">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Your First Option
                    </Button>
                </div>
            ) : (
                <div className="space-y-6">
                    {options.map((option, optionIndex) => (
                        <div key={optionIndex}>
                            <Card className="relative group">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => removeOption(optionIndex)}
                                >
                                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                                </Button>

                                <CardContent className="pt-6">
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label
                                                htmlFor={`option-${optionIndex}`}
                                            >
                                                Option Name
                                            </Label>
                                            <Input
                                                id={`option-${optionIndex}`}
                                                value={option.name}
                                                onChange={(e) =>
                                                    updateOption(optionIndex, {
                                                        name: e.target.value,
                                                    })
                                                }
                                                onKeyDown={(e) =>
                                                    handleOptionKeyDown(
                                                        e,
                                                        optionIndex
                                                    )
                                                }
                                                placeholder="e.g. Size, Color, Material"
                                                autoFocus={
                                                    focusedOptionIndex ===
                                                    optionIndex
                                                }
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center">
                                                <Label>Option Values</Label>
                                                <Button
                                                    onClick={() =>
                                                        addOptionValue(
                                                            optionIndex
                                                        )
                                                    }
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-7 px-2 text-xs"
                                                >
                                                    <Plus className="h-3 w-3 mr-1" />
                                                    Add Value
                                                </Button>
                                            </div>

                                            {option.values.length === 0 ? (
                                                <div className="text-sm text-muted-foreground py-2 border border-dashed rounded-md p-3 text-center">
                                                    No values added yet. Add
                                                    values like Small, Medium,
                                                    Large.
                                                </div>
                                            ) : (
                                                <div className="space-y-2">
                                                    {option.values.map(
                                                        (value, valueIndex) => (
                                                            <div
                                                                key={valueIndex}
                                                                className="flex items-center gap-2"
                                                            >
                                                                <Input
                                                                    value={
                                                                        value.value
                                                                    }
                                                                    onChange={(
                                                                        e
                                                                    ) =>
                                                                        updateOptionValue(
                                                                            optionIndex,
                                                                            valueIndex,
                                                                            e
                                                                                .target
                                                                                .value
                                                                        )
                                                                    }
                                                                    onKeyDown={(
                                                                        e
                                                                    ) =>
                                                                        handleValueKeyDown(
                                                                            e,
                                                                            optionIndex,
                                                                            valueIndex
                                                                        )
                                                                    }
                                                                    placeholder="e.g. Small, Red, Cotton"
                                                                    autoFocus={
                                                                        focusedValueIndices[
                                                                            optionIndex
                                                                        ] ===
                                                                        valueIndex
                                                                    }
                                                                />
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() =>
                                                                        removeOptionValue(
                                                                            optionIndex,
                                                                            valueIndex
                                                                        )
                                                                    }
                                                                    className="h-8 w-8"
                                                                >
                                                                    <X className="h-4 w-4" />
                                                                </Button>
                                                            </div>
                                                        )
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
