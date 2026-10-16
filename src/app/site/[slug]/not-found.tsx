import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { AlertCircle } from 'lucide-react';

export default function SiteNotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 text-center">
      <div className="p-4 rounded-full bg-destructive/10 text-destructive mb-6">
        <AlertCircle className="w-12 h-12" />
      </div>
      <h1 className="text-4xl font-extrabold tracking-tight mb-4">Site Not Found</h1>
      <p className="text-xl text-muted-foreground mb-8 max-w-md">
        This site doesn't exist or isn't published yet.
      </p>
      <Link href="/" className={cn(buttonVariants({ variant: 'default', size: 'lg' }))}>
        Go to Loriyum
      </Link>
    </div>
  );
}
