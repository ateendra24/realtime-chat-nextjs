import React, { useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { SignOutButton, useUser } from '@clerk/nextjs'
import { Button } from './ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "./ui/dropdown-menu"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "./ui/dialog"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Edit, ChevronDown, LogOut, CheckCircle, XCircle, Camera, Upload, Lock, Eye, EyeOff } from "lucide-react"
import { toast } from "sonner"

function UserFooter() {
    const { user } = useUser();
    const [showProfileEdit, setShowProfileEdit] = useState(false);
    const [showPasswordChange, setShowPasswordChange] = useState(false);
    const [editedName, setEditedName] = useState(user?.fullName || '');
    const [editedUsername, setEditedUsername] = useState(user?.username || '');
    const [saving, setSaving] = useState(false);
    const [changingPassword, setChangingPassword] = useState(false);
    const [passwordData, setPasswordData] = useState({
        newPassword: '',
        confirmPassword: ''
    });
    const [passwordErrors, setPasswordErrors] = useState<{
        new?: string;
        confirm?: string;
        general?: string
    }>({});
    const [showPasswords, setShowPasswords] = useState({
        new: false,
        confirm: false
    });
    const [errors, setErrors] = useState<{ username?: string; general?: string; avatar?: string }>({});
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    // Update state when user data loads
    React.useEffect(() => {
        if (user) {
            setEditedName(user.fullName || '');
            setEditedUsername(user.username || '');
        }
    }, [user]);

    // Cleanup preview URL on unmount
    React.useEffect(() => {
        return () => {
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }
        };
    }, [previewUrl]);

    // Check if user has a password (not signed in through Google OAuth)
    const hasPassword = user?.passwordEnabled || false;

    const handleSaveProfile = async () => {
        if (!editedUsername.trim()) {
            setErrors({ username: "Username is required" });
            return;
        }

        setSaving(true);
        setErrors({});

        try {
            const response = await fetch('/api/users/update', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username: editedUsername.trim(),
                    fullName: editedName.trim() || null,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                if (response.status === 409) {
                    setErrors({ username: "Username is already taken" });
                } else {
                    setErrors({ general: data.error || "Failed to update profile" });
                }
                return;
            }

            // Success
            toast.success("Profile updated successfully!");
            setShowProfileEdit(false);

            // Reload user data to reflect changes
            await user?.reload();

        } catch (error) {
            console.error('Error saving profile:', error);
            setErrors({ general: "Failed to update profile. Please try again." });
        } finally {
            setSaving(false);
        }
    };

    const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            setErrors(prev => ({ ...prev, avatar: "Please upload a JPEG, PNG, or WebP image." }));
            return;
        }

        // Validate file size (5MB)
        const maxSize = 5 * 1024 * 1024;
        if (file.size > maxSize) {
            setErrors(prev => ({ ...prev, avatar: "File too large. Please upload an image smaller than 5MB." }));
            return;
        }

        // Clear any previous avatar errors
        setErrors(prev => ({ ...prev, avatar: undefined }));

        // Create preview URL
        const previewUrl = URL.createObjectURL(file);
        setPreviewUrl(previewUrl);

        // Upload avatar
        setUploadingAvatar(true);
        try {
            const formData = new FormData();
            formData.append('avatar', file);

            const response = await fetch('/api/users/avatar', {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();

            if (!response.ok) {
                setErrors(prev => ({ ...prev, avatar: data.error || "Failed to upload avatar" }));
                setPreviewUrl(null);
                return;
            }

            // Success
            toast.success("Avatar updated successfully!");

            // Reload user data to reflect changes
            await user?.reload();

        } catch (error) {
            console.error('Error uploading avatar:', error);
            setErrors(prev => ({ ...prev, avatar: "Failed to upload avatar. Please try again." }));
            setPreviewUrl(null);
        } finally {
            setUploadingAvatar(false);
            // Reset file input
            event.target.value = '';
        }
    };

    const handlePasswordChange = async () => {
        setPasswordErrors({});

        // Validate passwords
        if (!passwordData.newPassword) {
            setPasswordErrors({ new: "New password is required" });
            return;
        }

        if (passwordData.newPassword.length < 8) {
            setPasswordErrors({ new: "Password must be at least 8 characters long" });
            return;
        }

        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setPasswordErrors({ confirm: "Passwords do not match" });
            return;
        }

        setChangingPassword(true);

        try {
            const response = await fetch('/api/users/change-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    newPassword: passwordData.newPassword,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                setPasswordErrors({ general: data.error || "Failed to change password" });
                return;
            }

            // Success
            toast.success("Password changed successfully!");
            setShowPasswordChange(false);
            setPasswordData({
                newPassword: '',
                confirmPassword: ''
            });
            setShowPasswords({
                new: false,
                confirm: false
            });

        } catch (error) {
            console.error('Error changing password:', error);
            setPasswordErrors({ general: "Failed to change password. Please try again." });
        } finally {
            setChangingPassword(false);
        }
    };

    return (
        <>
            <div className="bg-secondary border w-full flex justify-between space-x-2 rounded-full">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <div className="flex items-center gap-4 cursor-pointer hover:bg-muted/50 rounded-full p-2 transition-colors flex-1">
                            <Avatar className="w-8 h-8">
                                <AvatarImage src={user?.imageUrl} alt={user?.fullName || user?.username || "User"} />
                                <AvatarFallback>
                                    {user?.fullName?.[0] || user?.username?.[0] || 'U'}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                                <p className="text-sm font-medium">{user?.fullName || user?.username}</p>
                                <p className="text-xs text-muted-foreground">@{user?.username}</p>
                            </div>
                            <ChevronDown className="h-4 w-4 text-muted-foreground mr-2" />
                        </div>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56 rounded-2xl bg-card">
                        <DropdownMenuLabel>My Account</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className='cursor-pointer rounded-xl' onClick={() => {
                            setShowProfileEdit(true);
                            // Reset form data when opening
                            setEditedName(user?.fullName || '');
                            setEditedUsername(user?.username || '');
                            setErrors({});
                            setPreviewUrl(null);
                        }}>
                            <Edit className="mr-2 h-4 w-4" />
                            <span>Edit Profile</span>
                        </DropdownMenuItem>
                        {hasPassword && (
                            <DropdownMenuItem className='cursor-pointer rounded-xl' onClick={() => {
                                setShowPasswordChange(true);
                                setPasswordData({
                                    newPassword: '',
                                    confirmPassword: ''
                                });
                                setPasswordErrors({});
                                setShowPasswords({
                                    new: false,
                                    confirm: false
                                });
                            }}>
                                <Lock className="mr-2 h-4 w-4" />
                                <span>Change Password</span>
                            </DropdownMenuItem>
                        )}
                        <DropdownMenuItem className='cursor-pointer hover:bg-destructive! hover:text-destructive-foreground!  rounded-xl'>
                            <LogOut className="mr-2 h-4 w-4 hover:text-destructive-foreground!" />
                            <SignOutButton>
                                <div className="w-full text-left">
                                    Sign Out
                                </div>
                            </SignOutButton>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Profile Edit Dialog */}
            <Dialog open={showProfileEdit} onOpenChange={setShowProfileEdit}>
                <DialogContent className="sm:max-w-md rounded-2xl">
                    <DialogHeader>
                        <DialogTitle>Edit Profile</DialogTitle>
                        <DialogDescription>
                            Update your profile information and username.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="flex flex-col items-center space-y-4">
                            <div className="relative group">
                                <Avatar className="w-20 h-20">
                                    <AvatarImage
                                        src={previewUrl || user?.imageUrl}
                                        alt={user?.fullName || user?.username || "User"}
                                    />
                                    <AvatarFallback className="text-lg">
                                        {user?.fullName?.[0] || user?.username?.[0] || 'U'}
                                    </AvatarFallback>
                                </Avatar>

                                {/* Upload overlay */}
                                <div className="absolute inset-0 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                                    {uploadingAvatar ? (
                                        <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <Camera className="h-6 w-6 text-white" />
                                    )}
                                </div>

                                {/* Hidden file input */}
                                <input
                                    type="file"
                                    accept="image/jpeg,image/jpg,image/png,image/webp"
                                    onChange={handleAvatarUpload}
                                    disabled={uploadingAvatar}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                                />
                            </div>

                            <div className="text-center">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={uploadingAvatar}
                                    className="relative overflow-hidden cursor-pointer"
                                >
                                    {uploadingAvatar ? (
                                        <span className="flex items-center gap-2">
                                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                            Uploading...
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-2">
                                            <Upload className="h-4 w-4" />
                                            Change Avatar
                                        </span>
                                    )}
                                    <input
                                        type="file"
                                        accept="image/jpeg,image/jpg,image/png,image/webp"
                                        onChange={handleAvatarUpload}
                                        disabled={uploadingAvatar}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                                    />
                                </Button>
                                <p className="text-xs text-muted-foreground mt-2">
                                    JPG, PNG, or WebP (Max 5MB)
                                </p>
                                {errors.avatar && (
                                    <p className="text-xs text-red-500 flex items-center justify-center gap-1 mt-1">
                                        <XCircle className="h-3 w-3" />
                                        {errors.avatar}
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="fullName">Full Name</Label>
                            <Input
                                id="fullName"
                                value={editedName}
                                onChange={(e) => setEditedName(e.target.value)}
                                placeholder="Enter your full name"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="username">Username</Label>
                            <Input
                                id="username"
                                value={editedUsername}
                                onChange={(e) => {
                                    setEditedUsername(e.target.value);
                                    if (errors.username) {
                                        setErrors(prev => ({ ...prev, username: undefined }));
                                    }
                                }}
                                placeholder="Enter your username"
                                className={errors.username ? "border-red-500" : ""}
                            />
                            {errors.username && (
                                <p className="text-xs text-red-500 flex items-center gap-1">
                                    <XCircle className="h-3 w-3" />
                                    {errors.username}
                                </p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label>Email</Label>
                            <Input
                                value={user?.emailAddresses[0]?.emailAddress || ''}
                                disabled
                                className="bg-muted"
                            />
                            <p className="text-xs text-muted-foreground">Email cannot be changed.</p>
                        </div>

                        {errors.general && (
                            <div className="p-3 rounded-md bg-red-50 border border-red-200">
                                <p className="text-sm text-red-600 flex items-center gap-2">
                                    <XCircle className="h-4 w-4" />
                                    {errors.general}
                                </p>
                            </div>
                        )}

                        <div className="flex justify-end space-x-2">
                            <Button
                                variant="outline"
                                className="cursor-pointer"
                                onClick={() => {
                                    setShowProfileEdit(false);
                                    setErrors({});
                                    setEditedName(user?.fullName || '');
                                    setEditedUsername(user?.username || '');
                                    setPreviewUrl(null);
                                }}
                                disabled={saving || uploadingAvatar}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleSaveProfile}
                                className="cursor-pointer"
                                disabled={saving || uploadingAvatar || !editedUsername.trim()}
                            >
                                {saving ? (
                                    <span className="flex items-center gap-2">
                                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                        Saving...
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-2">
                                        <CheckCircle className="h-4 w-4" />
                                        Save Changes
                                    </span>
                                )}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Password Change Dialog */}
            <Dialog open={showPasswordChange} onOpenChange={setShowPasswordChange}>
                <DialogContent className="sm:max-w-[425px] rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Lock className="h-5 w-5" />
                            Change Password
                        </DialogTitle>
                        <DialogDescription>
                            Enter your current password and a new password to update your account security.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="newPassword">New Password</Label>
                            <div className="relative">
                                <Input
                                    id="newPassword"
                                    type={showPasswords.new ? "text" : "password"}
                                    value={passwordData.newPassword}
                                    onChange={(e) => {
                                        setPasswordData(prev => ({ ...prev, newPassword: e.target.value }));
                                        if (passwordErrors.new) {
                                            setPasswordErrors(prev => ({ ...prev, new: undefined }));
                                        }
                                    }}
                                    placeholder="Enter your new password"
                                    className={passwordErrors.new ? "border-red-500 pr-10" : "pr-10"}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                            {passwordErrors.new && (
                                <p className="text-xs text-red-500 flex items-center gap-1">
                                    <XCircle className="h-3 w-3" />
                                    {passwordErrors.new}
                                </p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword">Confirm New Password</Label>
                            <div className="relative">
                                <Input
                                    id="confirmPassword"
                                    type={showPasswords.confirm ? "text" : "password"}
                                    value={passwordData.confirmPassword}
                                    onChange={(e) => {
                                        setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }));
                                        if (passwordErrors.confirm) {
                                            setPasswordErrors(prev => ({ ...prev, confirm: undefined }));
                                        }
                                    }}
                                    placeholder="Confirm your new password"
                                    className={passwordErrors.confirm ? "border-red-500 pr-10" : "pr-10"}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                            {passwordErrors.confirm && (
                                <p className="text-xs text-red-500 flex items-center gap-1">
                                    <XCircle className="h-3 w-3" />
                                    {passwordErrors.confirm}
                                </p>
                            )}
                        </div>

                        {passwordErrors.general && (
                            <div className="p-3 rounded-md bg-red-50 border border-red-200">
                                <p className="text-sm text-red-700 flex items-center gap-2">
                                    <XCircle className="h-4 w-4" />
                                    {passwordErrors.general}
                                </p>
                            </div>
                        )}

                        <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 gap-2 pt-4">
                            <Button
                                variant="outline"
                                className="cursor-pointer"
                                onClick={() => {
                                    setShowPasswordChange(false);
                                    setPasswordErrors({});
                                    setPasswordData({
                                        newPassword: '',
                                        confirmPassword: ''
                                    });
                                    setShowPasswords({
                                        new: false,
                                        confirm: false
                                    });
                                }}
                                disabled={changingPassword}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handlePasswordChange}
                                className="cursor-pointer"
                                disabled={changingPassword || !passwordData.newPassword || !passwordData.confirmPassword}
                            >
                                {changingPassword ? (
                                    <span className="flex items-center gap-2">
                                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                        Changing...
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-2">
                                        <CheckCircle className="h-4 w-4" />
                                        Change Password
                                    </span>
                                )}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    )
}

export default UserFooter
