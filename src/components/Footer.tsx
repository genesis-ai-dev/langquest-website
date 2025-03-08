import { GitBranch } from 'lucide-react';
import Link from 'next/link';
import { Globe } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="w-full py-6 md:py-0 border-t">
      <div className="container mx-auto flex flex-col items-center justify-between gap-4 md:h-24 md:flex-row">
        <div className="flex gap-2 items-center">
          <Globe className="h-5 w-5 text-accent1" />
          <span className="font-semibold">LangQuest</span>
        </div>
        <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
          © {new Date().getFullYear()} LangQuest.{' '}
          <Link
            href="https://github.com/genesis-ai-dev/langquest/blob/main/LICENSE"
            target="_blank"
            className="text-muted-foreground hover:text-foreground"
          >
            MIT License
          </Link>
          .
        </p>
        <div className="flex items-center gap-4">
          <a
            href="/data-policy"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Open Data Policy
          </a>
          <a
            href="https://frontierrnd.com"
            target="_blank"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Frontier R&D
          </a>
          <a
            href="https://github.com/genesis-ai-dev/langquest"
            target="_blank"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            <div className="flex items-center gap-2">
              <GitBranch className="h-5 w-5" />
              Source Code
            </div>
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
