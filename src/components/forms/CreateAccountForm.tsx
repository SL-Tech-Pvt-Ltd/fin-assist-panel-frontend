"use client";

import type React from "react";
import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { FaUser, FaMoneyBillWave, FaCalendarAlt } from "react-icons/fa";
import type { Account, AccountType } from "@/data/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

interface CreateAccountFormProps {
    type?: AccountType;
    ref?: React.RefObject<HTMLButtonElement>;
    onSubmit: (account: Account) => Promise<void>;
    avoidCashCounter?: boolean;
    disableType?: boolean;
}

const CreateAccountForm: React.FC<CreateAccountFormProps> = ({
    onSubmit,
    type,
    ref,
    avoidCashCounter,
    disableType = false,
}) => {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [formState, setFormState] = useState<"idle" | "submitting" | "success" | "error">("idle");
    const { toast } = useToast();
    const {
        register,
        handleSubmit,
        control,
        watch,
        reset,
        formState: { errors },
    } = useForm<Account>({ defaultValues: { type: type, interestRate: 0 } });

    const accountTypes: AccountType[] = ["BANK", "BANK_OD", "CHEQUE", "MISC"];
    const accountType = watch("type");

    const submitForm = async (data: Account) => {
        setFormState("submitting");
        try {
            await onSubmit(data);
            setFormState("success");
            toast({
                title: "Account created",
                description: "Your account has been successfully created.",
            });
            setIsDialogOpen(false);
            reset();
        } catch (error) {
            setFormState("error");
            toast({
                title: "Error",
                description: "Failed to create account. Please try again.",
                variant: "destructive",
            });
        } finally {
            setFormState("idle");
        }
    };

    return (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild ref={ref}>
                <Button>Create New Account</Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Create New Account</DialogTitle>
                </DialogHeader>
                <form
                    onSubmit={handleSubmit(submitForm)}
                    className="space-y-4 w-full max-w-2xl mx-auto bg-card rounded-lg"
                >
                    <div className="space-y-2">
                        <Label htmlFor="name">Account Name</Label>
                        <div className="relative">
                            <FaUser className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                            <Input
                                id="name"
                                className="pl-10"
                                {...register("name", {
                                    required: "Account name is required",
                                })}
                            />
                        </div>
                        {errors.name && (
                            <p className="text-sm text-destructive">{errors.name.message}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="balance">Balance</Label>
                        <div className="relative">
                            <FaMoneyBillWave className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                            <Input
                                id="balance"
                                type="number"
                                step="0.01"
                                className="pl-10"
                                {...register("balance", {
                                    required: "Balance is required",
                                    min: {
                                        value: 0,
                                        message: "Balance must be positive",
                                    },
                                })}
                            />
                        </div>
                        {errors.balance && (
                            <p className="text-sm text-destructive">{errors.balance.message}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="type">Account Type</Label>
                        <Controller
                            name="type"
                            control={control}
                            rules={{ required: "Account type is required" }}
                            render={({ field }) => (
                                <Select
                                    onValueChange={field.onChange}
                                    defaultValue={field.value}
                                    disabled={disableType}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Account Type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {accountTypes.map((type) => (
                                            <SelectItem key={type} value={type}>
                                                {type.replace("_", " ")}
                                            </SelectItem>
                                        ))}
                                        {!avoidCashCounter && (
                                            <SelectItem key="CASH_COUNTER" value="CASH_COUNTER">
                                                Cash Counter
                                            </SelectItem>
                                        )}
                                    </SelectContent>
                                </Select>
                            )}
                        />
                        {errors.type && (
                            <p className="text-sm text-destructive">{errors.type.message}</p>
                        )}
                    </div>

                    {(accountType === "BANK" || accountType === "BANK_OD") && (
                        <>
                            <div className="space-y-2">
                                <Label htmlFor="details.bankName">Bank Name</Label>
                                <Input
                                    id="details.bankName"
                                    {...register("details.bankName", {
                                        required: "Bank name is required",
                                    })}
                                />
                                {errors.details?.bankName && (
                                    <p className="text-sm text-destructive">
                                        {errors.details.bankName.message}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="details.accountNumber">Account Number</Label>
                                <Input
                                    id="details.accountNumber"
                                    {...register("details.accountNumber", {
                                        required: "Account number is required",
                                    })}
                                />
                                {errors.details?.accountNumber && (
                                    <p className="text-sm text-destructive">
                                        {errors.details.accountNumber.message}
                                    </p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="details.interestRate">Interest Rate</Label>
                                <Input
                                    id="details.interestRate"
                                    type="number"
                                    step="0.01"
                                    {...register("interestRate", {
                                        required: "Interest rate is required",
                                        min: {
                                            value: 0,
                                            message: "Interest rate must be positive",
                                        },
                                    })}
                                />
                                {errors.interestRate && (
                                    <p className="text-sm text-destructive">
                                        {errors.interestRate.message}
                                    </p>
                                )}
                            </div>
                        </>
                    )}
                    {accountType === "BANK" && (
                        <div className="space-y-2">
                            <Label htmlFor="details.ifscCode">Interest Till Date</Label>
                            <Input
                                id="details.ifscCode"
                                {...register("accumulatedInterest", {
                                    required: "IFSC code is required",
                                })}
                            />
                            {errors.accumulatedInterest && (
                                <p className="text-sm text-destructive">
                                    {errors.accumulatedInterest.message}
                                </p>
                            )}
                        </div>
                    )}
                    {accountType === "BANK_OD" && (
                        <div className="space-y-2">
                            <Label htmlFor="limit">OD Limit</Label>
                            <Input
                                id="limit"
                                {...register("limit", {
                                    required: "IFSC code is required",
                                })}
                            />
                            {errors.limit && (
                                <p className="text-sm text-destructive">{errors.limit.message}</p>
                            )}
                        </div>
                    )}

                    {accountType === "CHEQUE" && (
                        <div className="space-y-2">
                            <Label htmlFor="details.chequeDate">Cheque Date</Label>
                            <div className="relative">
                                <FaCalendarAlt className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    id="details.chequeDate"
                                    type="date"
                                    className="pl-10"
                                    {...register("details.chequeDate")}
                                />
                            </div>
                        </div>
                    )}

                    <Button type="submit" disabled={formState === "submitting"} className="w-full">
                        {formState === "submitting" ? (
                            <>
                                <svg
                                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                >
                                    <circle
                                        className="opacity-25"
                                        cx="12"
                                        cy="12"
                                        r="10"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                    ></circle>
                                    <path
                                        className="opacity-75"
                                        fill="currentColor"
                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                    ></path>
                                </svg>
                                Creating...
                            </>
                        ) : (
                            "Create Account"
                        )}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default CreateAccountForm;
