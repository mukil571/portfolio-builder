"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { User, Building2, ArrowRight, Loader2, Check } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type WebsiteType = "portfolio" | "product" | null;

export default function OnboardingPage() {
  const router = useRouter();
  const { data: session } = useSession();
  
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedType, setSelectedType] = useState<WebsiteType>(null);
  
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [slug, setSlug] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize name if session exists and moving to step 2 for portfolio
  const handleTypeSelect = (type: WebsiteType) => {
    setSelectedType(type);
    if (type === "portfolio" && session?.user?.name) {
      setName(session.user.name);
      setSlug(session.user.name.toLowerCase().replace(/[^a-z0-9]/g, "-"));
    } else {
      setName("");
      setSlug("");
    }
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
    setSlug(val.toLowerCase().replace(/[^a-z0-9]/g, "-"));
  };
  
  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !slug) {
      toast.error("Please fill in all required fields");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const response = await fetch("/api/websites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: name,
          type: selectedType,
          slug,
          description,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to create website");
      }
      
      toast.success("Website created successfully!");
      router.push("/dashboard/content");
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl py-12">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Let&apos;s set up your website</h1>
        <p className="mt-2 text-muted-foreground">
          {step === 1 ? "What are you building today?" : "Tell us a bit more about it"}
        </p>
      </div>

      {step === 1 && (
        <div className="grid gap-6 sm:grid-cols-2">
          <Card 
            className={cn(
              "cursor-pointer transition-all hover:border-primary",
              selectedType === "portfolio" ? "border-primary ring-1 ring-primary" : ""
            )}
            onClick={() => handleTypeSelect("portfolio")}
          >
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <User className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Personal Portfolio</CardTitle>
              <CardDescription className="pt-2">
                For students, developers, designers, freelancers, and professionals
              </CardDescription>
            </CardHeader>
          </Card>

          <Card 
            className={cn(
              "cursor-pointer transition-all hover:border-primary",
              selectedType === "product" ? "border-primary ring-1 ring-primary" : ""
            )}
            onClick={() => handleTypeSelect("product")}
          >
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Product / Business</CardTitle>
              <CardDescription className="pt-2">
                For startups, SaaS products, small businesses, and services
              </CardDescription>
            </CardHeader>
          </Card>
          
          <div className="col-span-full mt-4 flex justify-end">
            <Button 
              disabled={!selectedType} 
              onClick={() => setStep(2)}
              className="w-full sm:w-auto"
            >
              Continue <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <Card>
          <form onSubmit={onSubmit}>
            <CardContent className="space-y-6 pt-6">
              <div className="space-y-2">
                <Label htmlFor="name">
                  {selectedType === "portfolio" ? "Your Name" : "Product/Company Name"}
                </Label>
                <Input 
                  id="name" 
                  value={name} 
                  onChange={handleNameChange}
                  placeholder={selectedType === "portfolio" ? "John Doe" : "Acme Corp"}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">
                  {selectedType === "portfolio" ? "Short Intro/Tagline" : "Short Description"}
                </Label>
                <Textarea 
                  id="description" 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={selectedType === "portfolio" ? "I'm a full-stack developer based in NY." : "The best tool for managing your tasks."}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">Website Slug (URL)</Label>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-muted-foreground">loriyum.com/</span>
                  <Input 
                    id="slug" 
                    value={slug} 
                    onChange={handleSlugChange}
                    required
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Letters, numbers, and hyphens only.
                </p>
              </div>
            </CardContent>
            
            <div className="flex items-center justify-between border-t p-6 bg-muted/20">
              <Button type="button" variant="ghost" onClick={() => setStep(1)} disabled={isSubmitting}>
                Back
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Create Website
                  </>
                )}
              </Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}
