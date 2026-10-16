'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Globe, ExternalLink, Loader2, Calendar } from 'lucide-react';
import { toast } from 'sonner';

interface WebsiteManagerProps {
  website: {
    id: string;
    title: string;
    type: string;
    slug: string;
    isPublished: boolean | null;
    createdAt: Date | null;
    updatedAt: Date | null;
  };
}

export function WebsiteManager({ website }: WebsiteManagerProps) {
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState(false);

  const togglePublish = async () => {
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/websites/${website.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isPublished: !website.isPublished }),
      });

      if (!res.ok) {
        throw new Error('Failed to update website status');
      }

      toast.success(`Website ${!website.isPublished ? 'published' : 'unpublished'} successfully`);
      router.refresh();
    } catch (error) {
      toast.error('Failed to update website status');
      console.error(error);
    } finally {
      setIsUpdating(false);
    }
  };

  const siteUrl = typeof window !== 'undefined' ? `${window.location.origin}/site/${website.slug}` : '';

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-2xl flex items-center gap-2">
                {website.title}
                <Badge variant="secondary" className="capitalize">
                  {website.type}
                </Badge>
              </CardTitle>
              <CardDescription className="mt-2 flex items-center gap-4">
                <span className="flex items-center gap-1 text-sm">
                  <Globe className="h-4 w-4" /> /{website.slug}
                </span>
                {website.createdAt && (
                  <span className="flex items-center gap-1 text-sm">
                    <Calendar className="h-4 w-4" /> Created {new Date(website.createdAt).toLocaleDateString()}
                  </span>
                )}
              </CardDescription>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Button
                variant={website.isPublished ? 'destructive' : 'default'}
                onClick={togglePublish}
                disabled={isUpdating}
                className={!website.isPublished ? "bg-green-600 hover:bg-green-700 text-white" : ""}
              >
                {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {!isUpdating && <Globe className="mr-2 h-4 w-4" />}
                {website.isPublished ? 'Unpublish Website' : 'Publish Website'}
              </Button>
              {website.isPublished && siteUrl && (
                <a
                  href={siteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1"
                >
                  <ExternalLink className="h-3 w-3" /> Visit Live Site
                </a>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Live Preview</CardTitle>
          <CardDescription>Preview how your website looks to visitors.</CardDescription>
        </CardHeader>
        <CardContent>
          {website.isPublished ? (
            <iframe
              src={`/site/${website.slug}`}
              className="w-full h-[600px] rounded-md border bg-background"
              title="Website Preview"
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-[600px] rounded-md border border-dashed bg-muted/20 text-muted-foreground">
              <Globe className="h-12 w-12 mb-4 text-muted-foreground/50" />
              <p>Publish your website to preview it here</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
