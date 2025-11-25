"use client";

import { useState, useEffect } from "react";
import { useSignUp } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, GalleryVerticalEnd } from "lucide-react";

// Format field names for display
const formatFieldName = (field: string): string => {
    return field
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
};

export default function ContinueSignInPage() {
    const router = useRouter();
    const { isLoaded, signUp, setActive } = useSignUp();
    const [formData, setFormData] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        // Redirect if not in sign-up flow
        if (isLoaded && !signUp) {
            router.push("/sign-in");
        }
    }, [isLoaded, signUp, router]);

    if (!isLoaded) {
        return (
            <div className="bg-background flex min-h-svh flex-col items-center justify-center gap-4">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p className="text-sm text-muted-foreground">Loading...</p>
            </div>
        );
    }

    // Protect the page from users who are not in the sign-up flow
    if (!signUp) {
        return null;
    }

    const status = signUp.status;
    const missingFields = signUp.missingFields ?? [];

    const handleChange = (field: string, value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        setError(""); // Clear error when user types
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");

        try {
            // Update the SignUp object with the missing fields
            const res = await signUp.update(formData);

            if (res?.status === "complete") {
                await setActive({
                    session: res.createdSessionId,
                });
                router.push("/chat");
            } else if (res?.status === "missing_requirements") {
                setError("Please fill in all required fields");
            }
        } catch (err) {
            console.error("Continue sign-in error:", err);
            const error = err as { errors?: Array<{ message: string }> };
            if (error?.errors?.[0]?.message) {
                setError(error.errors[0].message);
            } else {
                setError("An error occurred. Please try again.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    if (status === "missing_requirements") {
        return (
            <div className="bg-background flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
                <div className="w-full max-w-sm">
                    <div className="flex flex-col gap-6">
                        <div className="flex flex-col items-center gap-2">
                            <div className="flex size-8 items-center justify-center rounded-md">
                                <GalleryVerticalEnd className="size-6" />
                            </div>
                            <h1 className="text-xl font-bold">Complete Your Profile</h1>
                            <div className="text-center text-sm text-muted-foreground">
                                Please provide the following information to continue
                            </div>
                        </div>

                        {error && (
                            <Alert variant="destructive">
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        <form onSubmit={handleSubmit}>
                            <div className="flex flex-col gap-4">
                                {missingFields.map((field) => (
                                    <div key={field} className="grid gap-2">
                                        <Label htmlFor={field}>
                                            {formatFieldName(field)}
                                        </Label>
                                        <Input
                                            id={field}
                                            name={field}
                                            type={field.includes("password") ? "password" : "text"}
                                            placeholder={`Enter your ${formatFieldName(field).toLowerCase()}`}
                                            value={formData[field] || ""}
                                            onChange={(e) => handleChange(field, e.target.value)}
                                            required
                                            disabled={isLoading}
                                            autoFocus={field === missingFields[0]}
                                            minLength={field === "username" ? 3 : undefined}
                                        />
                                    </div>
                                ))}

                                {/* Required for sign-up flows - Clerk's bot protection */}
                                <div id="clerk-captcha" className="hidden" />

                                <Button
                                    type="submit"
                                    className="w-full cursor-pointer"
                                    disabled={isLoading || Object.keys(formData).length < missingFields.length}
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Completing...
                                        </>
                                    ) : (
                                        "Complete Sign In"
                                    )}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        );
    }

    // If no missing requirements, redirect to chat
    if (status === "complete") {
        router.push("/chat");
        return (
            <div className="bg-background flex min-h-svh flex-col items-center justify-center gap-4">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p className="text-sm text-muted-foreground">Redirecting...</p>
            </div>
        );
    }

    // Default loading state
    return (
        <div className="bg-background flex min-h-svh flex-col items-center justify-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-sm text-muted-foreground">Processing...</p>
            {/* Required for sign-up flows */}
            <div id="clerk-captcha" className="hidden" />
        </div>
    );
}