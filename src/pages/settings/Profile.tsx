"use client";

import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { useAuth } from "@/providers/auth-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
    CalendarDays,
    UserIcon,
    Phone,
    MapPin,
    Edit2,
    Save,
    X,
    Camera,
    Upload,
    Building,
    Shield,
    Activity,
    CheckCircle,
} from "lucide-react";
import { api } from "@/utils/api";
import { useToast } from "@/hooks/use-toast";

interface EditProfileFormData {
    name: string;
    phone?: string;
    bio?: string;
    address?: string;
}

export default function ProfilePage() {
    const { user, refetch } = useAuth();
    const { toast } = useToast();
    const [isEditing, setIsEditing] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<EditProfileFormData>({
        defaultValues: {
            name: user?.name || "",
            phone: user?.phone || "",
            bio: user?.bio || "",
            address: user?.address || "",
        },
    });

    if (!user) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center space-y-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="text-muted-foreground">Loading profile...</p>
                </div>
            </div>
        );
    }

    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Validate file type
        const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
        if (!allowedTypes.includes(file.type)) {
            toast({
                title: "Invalid file type",
                description: "Please select a JPG, PNG, GIF, or WebP image file",
                variant: "destructive",
            });
            return;
        }

        // Validate file size (5MB max)
        if (file.size > 5 * 1024 * 1024) {
            toast({
                title: "File too large",
                description: "File size must be less than 5MB",
                variant: "destructive",
            });
            return;
        }

        setIsUploading(true);
        toast({
            title: "Uploading avatar...",
            description: "Please wait while we upload your profile picture",
        });

        try {
            // Upload file to /upload/public endpoint
            const formData = new FormData();
            formData.append("file", file);

            const uploadResponse = await api.post("/upload/public", formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            });

            const avatarUrl = uploadResponse.data.data.url;

            // Update user profile with new avatar URL using PUT /users/:userId
            // Since it's a PUT request, we need to send all user details
            await api.put(`/users/${user.id}`, {
                name: user.name,
                email: user.email,
                phone: user.phone || null,
                bio: user.bio || null,
                address: user.address || null,
                avatar: avatarUrl,
            });

            toast({
                title: "Avatar updated successfully",
                description: "Your profile picture has been updated",
            });

            // Refresh user data
            await refetch();
        } catch (error) {
            console.error("Failed to upload avatar:", error);
            toast({
                title: "Upload failed",
                description: "Failed to upload avatar. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsUploading(false);
        }
    };

    const handleEditToggle = () => {
        if (isEditing) {
            // Reset form when canceling edit
            reset({
                name: user.name || "",
                phone: user.phone || "",
                bio: user.bio || "",
                address: user.address || "",
            });
        }
        setIsEditing(!isEditing);
    };

    const onSubmit = async (data: EditProfileFormData) => {
        setIsSubmitting(true);
        try {
            await api.put(`/users/${user.id}`, data);

            toast({
                title: "Profile updated successfully",
                description: "Your profile information has been saved",
            });

            setIsEditing(false);
            await refetch();
        } catch (error) {
            console.error("Failed to update profile:", error);
            toast({
                title: "Update failed",
                description: "Failed to update profile. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
        });
    };

    const getInitials = (name?: string) => {
        if (!name) return "U";
        return name
            .split(" ")
            .map((word) => word.charAt(0))
            .slice(0, 2)
            .join("")
            .toUpperCase();
    };

    return (
        <div className="p-6 space-y-8 w-full max-w-7xl mx-auto">
            {/* Header */}
            <div className="space-y-2">
                <h1 className="text-4xl font-bold tracking-tight">Profile</h1>
                <p className="text-muted-foreground text-lg">
                    Manage your personal information and account settings
                </p>
            </div>

            <div className="grid gap-8 lg:grid-cols-3">
                {/* Profile Card */}
                <div className="lg:col-span-1">
                    <Card className="border-2">
                        <CardHeader className="text-center pb-4">
                            <div className="relative mx-auto">
                                <div
                                    className="relative group cursor-pointer"
                                    onClick={handleAvatarClick}
                                >
                                    <Avatar className="h-32 w-32 mx-auto border-4 border-white shadow-lg">
                                        <AvatarImage
                                            src={user.avatar || undefined}
                                            alt={user.name}
                                        />
                                        <AvatarFallback className="text-2xl font-bold bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                                            {getInitials(user.name)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                        {isUploading ? (
                                            <Upload className="h-8 w-8 text-white animate-spin" />
                                        ) : (
                                            <Camera className="h-8 w-8 text-white" />
                                        )}
                                    </div>
                                </div>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                                    onChange={handleAvatarUpload}
                                    className="hidden"
                                    disabled={isUploading}
                                />
                            </div>
                            <div className="space-y-2 mt-4">
                                <h2 className="text-2xl font-bold">{user.name}</h2>
                                <p className="text-muted-foreground">{user.email}</p>
                                <Badge variant="secondary" className="text-xs">
                                    ID: {user.id}
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-3">
                                <div className="flex items-center gap-3 text-sm">
                                    <CalendarDays className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                    <div>
                                        <p className="font-medium">Member since</p>
                                        <p className="text-muted-foreground">
                                            {formatDate(user.createdAt)}
                                        </p>
                                    </div>
                                </div>
                                {user.phone && (
                                    <div className="flex items-center gap-3 text-sm">
                                        <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                        <div>
                                            <p className="font-medium">Phone</p>
                                            <p className="text-muted-foreground">{user.phone}</p>
                                        </div>
                                    </div>
                                )}
                                {user.address && (
                                    <div className="flex items-center gap-3 text-sm">
                                        <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                        <div>
                                            <p className="font-medium">Address</p>
                                            <p className="text-muted-foreground">{user.address}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                            {user.bio && (
                                <div className="pt-4 border-t">
                                    <p className="text-sm font-medium mb-2">Bio</p>
                                    <p className="text-sm text-muted-foreground leading-relaxed">
                                        {user.bio}
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Details Cards */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Edit Profile Form */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    <UserIcon className="h-5 w-5" />
                                    Personal Information
                                </CardTitle>
                                <CardDescription>
                                    Update your personal details and profile information
                                </CardDescription>
                            </div>
                            <Button
                                variant={isEditing ? "ghost" : "outline"}
                                size="sm"
                                onClick={handleEditToggle}
                                disabled={isSubmitting}
                            >
                                {isEditing ? (
                                    <>
                                        <X className="h-4 w-4 mr-2" />
                                        Cancel
                                    </>
                                ) : (
                                    <>
                                        <Edit2 className="h-4 w-4 mr-2" />
                                        Edit
                                    </>
                                )}
                            </Button>
                        </CardHeader>
                        <CardContent>
                            {isEditing ? (
                                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label htmlFor="name">Full Name *</Label>
                                            <Input
                                                id="name"
                                                {...register("name", {
                                                    required: "Name is required",
                                                })}
                                                placeholder="Enter your full name"
                                                className={errors.name ? "border-red-500" : ""}
                                            />
                                            {errors.name && (
                                                <p className="text-sm text-red-500">
                                                    {errors.name.message}
                                                </p>
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="phone">Phone Number</Label>
                                            <Input
                                                id="phone"
                                                {...register("phone")}
                                                placeholder="Enter your phone number"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="address">Address</Label>
                                        <Input
                                            id="address"
                                            {...register("address")}
                                            placeholder="Enter your address"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="bio">Bio</Label>
                                        <Textarea
                                            id="bio"
                                            {...register("bio")}
                                            placeholder="Tell us about yourself..."
                                            rows={4}
                                        />
                                    </div>
                                    <div className="flex gap-2 pt-4">
                                        <Button type="submit" disabled={isSubmitting}>
                                            {isSubmitting ? (
                                                <>
                                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                                    Saving...
                                                </>
                                            ) : (
                                                <>
                                                    <Save className="h-4 w-4 mr-2" />
                                                    Save Changes
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </form>
                            ) : (
                                <div className="space-y-4">
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div>
                                            <Label className="text-sm font-medium">Full Name</Label>
                                            <p className="mt-1 text-sm text-muted-foreground">
                                                {user.name || "Not provided"}
                                            </p>
                                        </div>
                                        <div>
                                            <Label className="text-sm font-medium">Email</Label>
                                            <p className="mt-1 text-sm text-muted-foreground">
                                                {user.email}
                                            </p>
                                        </div>
                                        <div>
                                            <Label className="text-sm font-medium">Phone</Label>
                                            <p className="mt-1 text-sm text-muted-foreground">
                                                {user.phone || "Not provided"}
                                            </p>
                                        </div>
                                        <div>
                                            <Label className="text-sm font-medium">Address</Label>
                                            <p className="mt-1 text-sm text-muted-foreground">
                                                {user.address || "Not provided"}
                                            </p>
                                        </div>
                                    </div>
                                    {user.bio && (
                                        <div>
                                            <Label className="text-sm font-medium">Bio</Label>
                                            <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                                                {user.bio}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Account Statistics */}
                    <div className="grid gap-6 md:grid-cols-2">
                        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100/50">
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-blue-800">
                                    <Building className="h-5 w-5" />
                                    Organizations
                                </CardTitle>
                                <CardDescription className="text-blue-600">
                                    Organizations you're part of
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold text-blue-800 mb-2">
                                    {user.organizations?.length || 0}
                                </div>
                                {user.organizations && user.organizations.length > 0 && (
                                    <div className="space-y-1">
                                        {user.organizations.slice(0, 3).map((org) => (
                                            <div
                                                key={org.id}
                                                className="text-sm text-blue-700 font-medium"
                                            >
                                                • {org.name}
                                            </div>
                                        ))}
                                        {user.organizations.length > 3 && (
                                            <div className="text-xs text-blue-600">
                                                +{user.organizations.length - 3} more
                                            </div>
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card className="border-green-200 bg-gradient-to-br from-green-50 to-green-100/50">
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-green-800">
                                    <Shield className="h-5 w-5" />
                                    Permissions
                                </CardTitle>
                                <CardDescription className="text-green-600">
                                    Access levels granted
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold text-green-800 mb-2">
                                    {user.roleAccess?.length || 0}
                                </div>
                                {user.roleAccess && user.roleAccess.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                        {Array.from(new Set(user.roleAccess.map(() => "ACCESS")))
                                            .slice(0, 4)
                                            .map((access) => (
                                                <Badge
                                                    key={access}
                                                    variant="outline"
                                                    className="text-xs text-green-700 border-green-300"
                                                >
                                                    {access}
                                                </Badge>
                                            ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100/50">
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-purple-800">
                                    <Activity className="h-5 w-5" />
                                    Account Status
                                </CardTitle>
                                <CardDescription className="text-purple-600">
                                    Current account state
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="flex items-center gap-2">
                                <CheckCircle className="h-5 w-5 text-green-500" />
                                <span className="font-medium text-green-700">Active</span>
                            </CardContent>
                        </Card>

                        <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-orange-100/50">
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-orange-800">
                                    <CalendarDays className="h-5 w-5" />
                                    Last Updated
                                </CardTitle>
                                <CardDescription className="text-orange-600">
                                    Profile last modified
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="text-sm font-medium text-orange-800">
                                    {formatDate(user.updatedAt)}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
