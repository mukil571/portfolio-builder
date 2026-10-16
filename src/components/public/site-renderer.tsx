'use client';

import React from 'react';
import Link from 'next/link';
import {
  Layout,
  User,
  Wrench,
  FolderKanban,
  Briefcase,
  GraduationCap,
  Trophy,
  Mail,
  Share2,
  Sparkles,
  Gift,
  CreditCard,
  HelpCircle,
  Quote
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

type ContentSectionType = 'hero' | 'about' | 'skills' | 'projects' | 'experience' | 'education' | 'achievements' | 'contact' | 'socials' | 'features' | 'benefits' | 'pricing' | 'faq' | 'testimonials';

interface PublicSiteRendererProps {
  site: {
    id: string;
    title: string;
    type: string;
    slug: string;
    themeConfig: unknown;
  };
  sections: Array<{
    id: string;
    type: string;
    title: string;
    content: Record<string, unknown> | null;
    orderIndex: number;
  }>;
}

const SECTION_ICONS: Record<ContentSectionType, React.ElementType> = {
  hero: Layout,
  about: User,
  skills: Wrench,
  projects: FolderKanban,
  experience: Briefcase,
  education: GraduationCap,
  achievements: Trophy,
  contact: Mail,
  socials: Share2,
  features: Sparkles,
  benefits: Gift,
  pricing: CreditCard,
  faq: HelpCircle,
  testimonials: Quote,
};

export function PublicSiteRenderer({ site, sections }: PublicSiteRendererProps) {
  const renderHero = (content: any) => (
    <div className="py-20 md:py-32 bg-gradient-to-br from-primary/5 to-primary/10 flex flex-col items-center justify-center text-center px-4">
      <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-4">
        {content?.headline || site.title}
      </h1>
      {content?.subheadline && (
        <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl">
          {content.subheadline}
        </p>
      )}
    </div>
  );

  const renderAbout = (content: any) => (
    <Card className="border-none shadow-none bg-transparent">
      <CardContent className="pt-6 text-center text-lg leading-relaxed text-muted-foreground">
        {content?.bio || 'No bio provided.'}
      </CardContent>
    </Card>
  );

  const renderSkills = (content: any) => {
    const skillsList = (content?.skills as string)?.split(',').map((s) => s.trim()).filter(Boolean) || [];
    return (
      <div className="flex flex-wrap justify-center gap-2">
        {skillsList.map((skill, i) => (
          <span key={i} className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium">
            {skill}
          </span>
        ))}
      </div>
    );
  };

  const renderGenericContent = (content: any) => (
    <Card>
      <CardContent className="pt-6 text-center">
        {content?.description || content?.text || 'No content provided.'}
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <main className="flex-grow">
        {sections.map((section, index) => {
          const isEven = index % 2 === 0;
          const sectionType = section.type as ContentSectionType;
          
          if (sectionType === 'hero') {
            return (
              <section key={section.id} className="w-full">
                {renderHero(section.content)}
              </section>
            );
          }

          const Icon = SECTION_ICONS[sectionType] || Layout;

          return (
            <section
              key={section.id}
              className={cn("py-12 md:py-16 w-full", !isEven && "bg-muted/30")}
            >
              <div className="max-w-4xl mx-auto px-4">
                <div className="flex flex-col items-center mb-8">
                  <div className="p-3 rounded-full bg-primary/10 text-primary mb-4">
                    <Icon className="w-6 h-6" />
                  </div>
                  <h2 className="text-2xl font-bold text-center">{section.title}</h2>
                </div>

                {sectionType === 'about' && renderAbout(section.content)}
                {sectionType === 'skills' && renderSkills(section.content)}
                {['projects', 'experience', 'education', 'achievements', 'contact', 'socials', 'features', 'benefits', 'pricing', 'faq', 'testimonials'].includes(sectionType) && renderGenericContent(section.content)}
              </div>
            </section>
          );
        })}
      </main>

      <footer className="py-6 border-t border-border flex justify-center items-center">
        <p className="text-sm text-muted-foreground flex items-center gap-1">
          Built with
          <Link href="/" className="font-semibold text-primary hover:underline">
            Loriyum
          </Link>
        </p>
      </footer>
    </div>
  );
}
