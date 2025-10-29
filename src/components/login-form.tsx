"use client";

import { useState, useEffect } from "react";
import { useSignIn } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { GalleryVerticalEnd, Eye, EyeOff, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { siteConfig } from "@/config/siteConfig";

export function LoginForm({
    className,
    ...props
}: React.ComponentProps<"div">) {
    const { isLoaded, signIn, setActive } = useSignIn();
    const [emailOrUsername, setEmailOrUsername] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const router = useRouter();

    // Ensure CAPTCHA element exists for Clerk
    useEffect(() => {
        if (typeof window !== 'undefined' && !document.getElementById('clerk-captcha')) {
            const captchaDiv = document.createElement('div');
            captchaDiv.id = 'clerk-captcha';
            captchaDiv.style.display = 'none';
            document.body.appendChild(captchaDiv);
        }
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!isLoaded) {
            return;
        }

        setIsLoading(true);
        setError("");

        try {
            const signInAttempt = await signIn.create({
                identifier: emailOrUsername,
                password,
            });

            if (signInAttempt.status === "complete") {
                await setActive({ session: signInAttempt.createdSessionId });
                router.push("/chat");
            } else {
                setError("Invalid email or password");
            }
        } catch (err: unknown) {
            console.error("Sign in error:", err);

            // Provide more specific error messages
            if (err && typeof err === 'object' && 'errors' in err) {
                const errors = (err as { errors: Array<{ code: string; message: string }> }).errors;
                if (errors?.[0]?.code === "form_identifier_not_found") {
                    setError("No account found with this email or username");
                } else if (errors?.[0]?.code === "form_password_incorrect") {
                    setError("Incorrect password");
                } else if (errors?.[0]?.code === "form_identifier_invalid") {
                    setError("Please enter a valid email or username");
                } else {
                    setError(errors?.[0]?.message || "Invalid email/username or password");
                }
            } else {
                setError("An error occurred during sign in");
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        if (!isLoaded) {
            return;
        }

        setIsLoading(true);
        setError("");

        try {
            await signIn.authenticateWithRedirect({
                strategy: "oauth_google",
                redirectUrl: window.location.origin + "/sso-callback",
                redirectUrlComplete: window.location.origin + "/chat",
            });
        } catch (err: unknown) {
            console.error("Google sign in error:", err);
            if (err && typeof err === 'object' && 'errors' in err) {
                const errors = (err as { errors: Array<{ message: string }> }).errors;
                setError(errors?.[0]?.message || "An error occurred during Google sign in");
            } else {
                setError("An error occurred during Google sign in");
            }
            setIsLoading(false);
        }
    };

    return (
        <div className={cn("flex flex-col gap-6", className)} {...props}>
            <form onSubmit={handleSubmit}>
                <div className="flex flex-col gap-6">
                    <div className="flex flex-col items-center gap-2">
                        <h1 className="text-xl font-bold">Welcome to {siteConfig.name}</h1>
                        <div className="text-center text-sm">
                            Don&apos;t have an account?{" "}
                            <Link href="/sign-up" className="underline underline-offset-4">
                                Sign up
                            </Link>
                        </div>
                    </div>

                    {error && (
                        <Alert className="bg-destructive">
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    <div className="flex flex-col gap-6">
                        <div className="grid gap-3">
                            <Label htmlFor="emailOrUsername">Email or Username</Label>
                            <Input
                                id="emailOrUsername"
                                name="emailOrUsername"
                                type="text"
                                placeholder="Enter your email or username"
                                value={emailOrUsername}
                                onChange={(e) => setEmailOrUsername(e.target.value)}
                                required
                                disabled={isLoading}
                            />
                            <p className="text-xs text-muted-foreground">
                                You can sign in with either your email address or username
                            </p>
                        </div>
                        <div className="grid gap-3">
                            <Label htmlFor="password">Password</Label>
                            <div className="relative">
                                <Input
                                    id="password"
                                    name="password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Enter your password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    disabled={isLoading}
                                    className="pr-10"
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                    onClick={() => setShowPassword(!showPassword)}
                                    disabled={isLoading}
                                >
                                    {showPassword ? (
                                        <EyeOff className="h-4 w-4" />
                                    ) : (
                                        <Eye className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>
                        </div>
                        <Button type="submit" className="w-full cursor-pointer" disabled={isLoading}>
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Signing in...
                                </>
                            ) : (
                                "Sign in"
                            )}
                        </Button>
                    </div>

                    <div className="after:border-border relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t">
                        <span className="bg-background text-muted-foreground relative z-10 px-2">
                            Or continue with
                        </span>
                    </div>

                    <Button
                        variant="outline"
                        type="button"
                        className="w-full cursor-pointer"
                        onClick={handleGoogleSignIn}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="mr-2 h-4 w-4">
                                <path
                                    d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                                    fill="currentColor"
                                />
                            </svg>
                        )}
                        Continue with Google
                    </Button>
                </div>
            </form>
            <div className="text-muted-foreground text-center text-xs text-balance">
                By clicking continue, you agree to our{" "}
                <a href="#" className="underline underline-offset-4 hover:text-primary">
                    Terms of Service
                </a>{" "}
                and{" "}
                <a href="#" className="underline underline-offset-4 hover:text-primary">
                    Privacy Policy
                </a>
                .
            </div>
        </div>
    );
}
