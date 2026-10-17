'use client';

import { useState } from 'react';
import { 
  Layout, User, Wrench, FolderKanban, Briefcase, 
  GraduationCap, Trophy, Mail, Share2, Sparkles, 
  Gift, CreditCard, HelpCircle, Quote,
  ArrowUp, ArrowDown, ChevronDown, ChevronUp, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

type Section = {
  id: string;
  type: string;
  title: string;
  content: Record<string, unknown>;
  orderIndex: number;
  isVisible: boolean;
};

type Website = {
  id: string;
  title: string;
  type: string;
  slug: string;
};

const getIconForType = (type: string) => {
  switch (type) {
    case 'hero': return Layout;
    case 'about': return User;
    case 'skills': return Wrench;
    case 'projects': return FolderKanban;
    case 'experience': return Briefcase;
    case 'education': return GraduationCap;
    case 'achievements': return Trophy;
    case 'contact': return Mail;
    case 'socials': return Share2;
    case 'features': return Sparkles;
    case 'benefits': return Gift;
    case 'pricing': return CreditCard;
    case 'faq': return HelpCircle;
    case 'testimonials': return Quote;
    default: return Layout;
  }
};

export function ContentEditor({ website, sections: initialSections }: { website: Website, sections: Section[] }) {
  const [sections, setSections] = useState<Section[]>(initialSections);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [reordering, setReordering] = useState(false);

  const handleUpdateSection = (id: string, updates: Partial<Section>) => {
    setSections(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const updateContent = (id: string, key: string, value: string) => {
    setSections(prev => prev.map(s => {
      if (s.id === id) {
        return { ...s, content: { ...(s.content || {}), [key]: value } };
      }
      return s;
    }));
  };

  const handleSave = async (section: Section) => {
    setLoading(section.id);
    try {
      const res = await fetch(`/api/sections/${section.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: section.title,
          content: section.content,
          isVisible: section.isVisible,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save section');
      }
      toast.success('Section saved successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to save section');
    } finally {
      setLoading(null);
    }
  };

  const moveSection = async (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === sections.length - 1) return;

    const newSections = [...sections];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    
    const temp = newSections[index];
    newSections[index] = newSections[swapIndex];
    newSections[swapIndex] = temp;

    newSections.forEach((s, i) => { s.orderIndex = i; });
    setSections(newSections);

    setReordering(true);
    try {
      const res = await fetch('/api/sections/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          websiteId: website.id,
          sectionIds: newSections.map(s => s.id)
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Failed to reorder sections');
      }
      toast.success('Sections reordered');
    } catch (error: any) {
      toast.error(error.message || 'Failed to reorder sections');
      setSections(sections);
    } finally {
      setReordering(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col gap-2 border-b pb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight">{website.title}</h1>
          <Badge variant="secondary">{website.type}</Badge>
        </div>
        <p className="text-muted-foreground font-mono text-sm">/{website.slug}</p>
      </div>

      <div className="space-y-4">
        {sections.map((section, index) => {
          const Icon = getIconForType(section.type);
          const isExpanded = expanded === section.id;
          const content = section.content || {};

          return (
            <Card key={section.id} className="overflow-hidden">
              <CardHeader className="p-4 flex flex-row items-center justify-between space-y-0 bg-muted/30">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-primary/10 rounded-md text-primary">
                    <Icon size={20} />
                  </div>
                  <div className="flex flex-col">
                    <Input 
                      value={section.title}
                      onChange={(e) => handleUpdateSection(section.id, { title: e.target.value })}
                      className="h-8 border-transparent hover:border-input focus-visible:border-input bg-transparent font-medium text-lg px-2 -ml-2 w-full max-w-[250px]"
                    />
                    <span className="text-xs text-muted-foreground capitalize ml-2">{section.type} section</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 mr-4">
                    <Label htmlFor={`visible-${section.id}`} className="text-xs">Visible</Label>
                    <Switch 
                      id={`visible-${section.id}`}
                      checked={section.isVisible}
                      onCheckedChange={(checked) => handleUpdateSection(section.id, { isVisible: checked })}
                    />
                  </div>

                  <div className="flex items-center gap-1 mr-2">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      disabled={index === 0 || reordering}
                      onClick={() => moveSection(index, 'up')}
                    >
                      <ArrowUp size={16} />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      disabled={index === sections.length - 1 || reordering}
                      onClick={() => moveSection(index, 'down')}
                    >
                      <ArrowDown size={16} />
                    </Button>
                  </div>

                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setExpanded(isExpanded ? null : section.id)}
                  >
                    {isExpanded ? <ChevronUp size={16} className="mr-1" /> : <ChevronDown size={16} className="mr-1" />}
                    {isExpanded ? 'Collapse' : 'Edit'}
                  </Button>
                </div>
              </CardHeader>

              {isExpanded && (
                <CardContent className="p-6 border-t bg-card">
                  <div className="space-y-4">
                    {section.type === 'hero' && (
                      <>
                        <div className="space-y-2">
                          <Label>Headline</Label>
                          <Input 
                            value={(content.headline as string) || ''}
                            onChange={(e) => updateContent(section.id, 'headline', e.target.value)}
                            placeholder="Welcome to my site"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Subheadline</Label>
                          <Textarea 
                            value={(content.subheadline as string) || ''}
                            onChange={(e) => updateContent(section.id, 'subheadline', e.target.value)}
                            placeholder="A brief description about what you do"
                          />
                        </div>
                      </>
                    )}

                    {section.type === 'about' && (
                      <div className="space-y-2">
                        <Label>Bio</Label>
                        <Textarea 
                          value={(content.bio as string) || ''}
                          onChange={(e) => updateContent(section.id, 'bio', e.target.value)}
                          placeholder="Tell us about yourself..."
                          rows={4}
                        />
                      </div>
                    )}

                    {section.type === 'skills' && (
                      <div className="space-y-2">
                        <Label>Skills (comma-separated)</Label>
                        <Textarea 
                          value={(content.skills as string) || ''}
                          onChange={(e) => updateContent(section.id, 'skills', e.target.value)}
                          placeholder="React, TypeScript, Node.js..."
                        />
                      </div>
                    )}
                    
                    {section.type === 'projects' && (
                      <div className="space-y-2">
                        <Label>Description</Label>
                        <Textarea 
                          value={(content.description as string) || ''}
                          onChange={(e) => updateContent(section.id, 'description', e.target.value)}
                          placeholder="Here are some of my recent projects..."
                        />
                      </div>
                    )}

                    {!['hero', 'about', 'skills', 'projects'].includes(section.type) && (
                      <div className="space-y-2">
                        <Label>Content</Label>
                        <Textarea 
                          value={(content.text as string) || ''}
                          onChange={(e) => updateContent(section.id, 'text', e.target.value)}
                          placeholder="Enter content for this section..."
                          rows={4}
                        />
                      </div>
                    )}

                    <div className="flex justify-end pt-4">
                      <Button 
                        onClick={() => handleSave(section)}
                        disabled={loading === section.id}
                      >
                        {loading === section.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Changes
                      </Button>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
