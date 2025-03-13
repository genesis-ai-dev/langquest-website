import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BreadcrumbItem {
  label: string;
  href?: string;
  isActive?: boolean;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  onNavigate?: (href: string) => void;
}

export function Breadcrumbs({ items, onNavigate }: BreadcrumbsProps) {
  const handleClick = (href: string) => {
    if (onNavigate) {
      onNavigate(href);
    }
  };

  return (
    <nav
      aria-label="Breadcrumb"
      className="flex items-center gap-1 text-sm text-muted-foreground"
    >
      {items.map((item, index) => (
        <div key={index} className="flex items-center">
          {index > 0 && (
            <ChevronRight className="h-4 w-4 mx-1 text-muted-foreground" />
          )}

          {item.href && !item.isActive ? (
            <Button
              variant="link"
              className="p-0 h-auto font-medium hover:text-primary"
              onClick={() => item.href && handleClick(item.href)}
            >
              {item.label}
            </Button>
          ) : (
            <span
              className={`${item.isActive ? 'font-medium text-foreground' : ''}`}
            >
              {item.label}
            </span>
          )}
        </div>
      ))}
    </nav>
  );
}
