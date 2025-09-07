import { SignUpForm } from "@/components/signup-form";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/config/siteConfig";
import { ChevronLeft } from "lucide-react";
import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Sign Up - " + siteConfig.name,
  description: siteConfig.description,
};

export default function Page() {

  return (
    <>
      <Button asChild variant="ghost" className="fixed top-10 left-10">
        <Link href="/" >
          <ChevronLeft />
          Home
        </Link>
      </Button>

      <div className="bg-background flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
        <div className="w-full max-w-sm">
          <SignUpForm />
        </div>
      </div>
    </>
  );
}
