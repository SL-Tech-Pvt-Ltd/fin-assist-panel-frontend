import { useForm } from "react-hook-form";
import { useState, useEffect } from "react";

// Define a DTO for the form to avoid circular reference issues

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
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

// Define a DTO for the form to avoid circular reference issues
type OrganizationFormDTO = {
    id?: string;
    name: string;
    description?: string | null;
    contact?: string | null;
    pan?: string | null;
    domain?: string | null;
    depreciationRate?: number | null;
    vatStatus?: "always" | "never" | "conditional" | null;
};

interface EditOrgModalProps {
    onSubmit?: (data: OrganizationFormDTO) => void;
    orgData?: Partial<OrganizationFormDTO>;
}

export default function EditOrgModal({ onSubmit, orgData }: EditOrgModalProps) {
    const { toast } = useToast();
    const [isOpen, setIsOpen] = useState(false);

    const {
        register,
        handleSubmit,
        reset,
        setValue,
        formState: { errors, isSubmitting },
    } = useForm<OrganizationFormDTO>({
        defaultValues: orgData,
    });

    // Reset form when orgData changes
    useEffect(() => {
        reset(orgData);
    }, [orgData, reset]);

    const onFormSubmit = async (data: OrganizationFormDTO) => {
        try {
            // Ensure depreciationRate is properly converted to number if provided
            const formattedData = {
                ...data,
                depreciationRate:
                    data.depreciationRate !== undefined && data.depreciationRate !== null
                        ? Number(data.depreciationRate)
                        : null,
            };

            await onSubmit?.(formattedData);
            toast({
                title: "Success",
                description: "Organization updated successfully!",
            });
            setIsOpen(false);
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to update organization.",
                variant: "destructive",
            });
        }
    };

    return (
        <>
            <Button onClick={() => setIsOpen(true)} className="border border-white">
                Edit
            </Button>
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Edit Organization Info</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
                        {[
                            {
                                id: "name",
                                label: "Organization Name",
                                required: true,
                                type: "text",
                            },
                            { id: "description", label: "Address", required: false, type: "text" },
                            { id: "contact", label: "Contact Number", required: true, type: "tel" },
                            { id: "pan", label: "PAN Number", required: false, type: "text" },
                            { id: "domain", label: "Domain", required: false, type: "url" },
                        ].map(({ id, label, required, type }) => (
                            <div key={id} className="space-y-2">
                                <Label htmlFor={id}>{label}</Label>
                                <Input
                                    id={id}
                                    type={type}
                                    placeholder={`Enter ${label.toLowerCase()}`}
                                    {...register(
                                        id as keyof OrganizationFormDTO,
                                        required
                                            ? {
                                                  required: `${label} is required`,

                                                  ...(id === "contact" && {
                                                      pattern: {
                                                          value: /^[0-9]{10}$/,
                                                          message:
                                                              "Please enter a valid 10-digit contact number",
                                                      },
                                                  }),
                                                  ...(id === "domain" &&
                                                      type === "url" && {
                                                          pattern: {
                                                              value: /^https?:\/\/.+/,
                                                              message:
                                                                  "Please enter a valid URL starting with http:// or https://",
                                                          },
                                                      }),
                                              }
                                            : {}
                                    )}
                                />
                                {errors[id as keyof OrganizationFormDTO] && (
                                    <p className="text-sm text-red-500">
                                        {errors[id as keyof OrganizationFormDTO]?.message}
                                    </p>
                                )}
                            </div>
                        ))}
                        {/* depreciation rate, number */}
                        <div className="space-y-2">
                            <Label htmlFor="depreciationRate">Inventory Increment Rate (%)</Label>
                            <Input
                                id="depreciationRate"
                                type="number"
                                step="0.01"
                                min="0"
                                max="100"
                                placeholder="e.g., 10.5"
                                {...register("depreciationRate", {
                                    valueAsNumber: true,
                                    min: {
                                        value: 0,
                                        message: "Depreciation rate must be at least 0%",
                                    },
                                    max: {
                                        value: 100,
                                        message: "Depreciation rate cannot exceed 100%",
                                    },
                                    validate: (value) => {
                                        if (value !== undefined && value !== null && isNaN(value)) {
                                            return "Please enter a valid number";
                                        }
                                        return true;
                                    },
                                })}
                            />
                            {errors.depreciationRate && (
                                <p className="text-sm text-red-500">
                                    {errors.depreciationRate.message}
                                </p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="vatStatus">VAT Status</Label>
                            <Select
                                onValueChange={(value) => {
                                    setValue(
                                        "vatStatus",
                                        value as "always" | "never" | "conditional"
                                    );
                                }}
                                defaultValue={orgData?.vatStatus || "conditional"}
                            >
                                <SelectTrigger id="vatStatus">
                                    <SelectValue placeholder="Select VAT status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="conditional">Conditional</SelectItem>
                                    <SelectItem value="always">Always</SelectItem>
                                    <SelectItem value="never">Never</SelectItem>
                                </SelectContent>
                            </Select>
                            {errors.vatStatus && (
                                <p className="text-sm text-red-500">{errors.vatStatus.message}</p>
                            )}
                        </div>

                        <DialogFooter className="gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsOpen(false)}
                                disabled={isSubmitting}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? "Saving..." : "Save Changes"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}
