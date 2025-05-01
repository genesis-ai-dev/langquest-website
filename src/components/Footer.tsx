import Link from 'next/link';
import { Globe } from 'lucide-react';
import { Var, T } from 'gt-next';
import GithubIcon from './icons/github-icon';

const Footer = () => {
  return (
    <T id="components.footer.0">
      <footer className="w-full py-6 md:py-0 border-t">
        <div className="container mx-auto flex flex-col items-center justify-between gap-4 md:h-24 md:flex-row">
          <div className="flex gap-2 items-center">
            <Globe className="h-5 w-5 text-accent4" />
            <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
              © <Var>{new Date().getFullYear()}</Var> LangQuest.{' '}
              <Link
                href="https://github.com/genesis-ai-dev/langquest/blob/main/LICENSE"
                target="_blank"
                className="text-muted-foreground hover:text-foreground"
              >
                MIT License
              </Link>
              .
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/terms"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Terms
            </Link>
            <Link
              href="/privacy"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Privacy
            </Link>
            <Link
              href="https://frontierrnd.com"
              target="_blank"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Frontier R&D
            </Link>
            <Link
              href="https://github.com/genesis-ai-dev/langquest"
              aria-label="LangQuest GitHub Repository"
              target="_blank"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              <GithubIcon />
            </Link>
          </div>
        </div>
      </footer>
    </T>
  );
};

export default Footer;
