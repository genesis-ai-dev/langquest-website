import WebPageWrapper from '@/components/WebPageWrapper';
import { Link } from '@/i18n/navigation';
import type { ReactNode } from 'react';

// Support for LangQuest Next (genesis-ai-dev/langquest-next), the Support
// URL its App Store listing gives. Keep the answers true to the app: it has
// no password reset screen yet, so a forgotten password goes to email.

const CONTACT = 'admin@frontierrnd.com';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-4 mt-12">
      <h2 className="text-2xl font-bold tracking-tighter sm:text-3xl">
        {title}
      </h2>
      <div className="prose prose-gray dark:prose-invert space-y-4">
        {children}
      </div>
    </div>
  );
}

function Mail() {
  return (
    <a href={`mailto:${CONTACT}`} className="text-primary hover:underline">
      {CONTACT}
    </a>
  );
}

export default function LangQuestNextSupport() {
  return (
    <WebPageWrapper>
      <div className="container mx-auto px-4 md:px-6 py-12">
        <div className="max-w-3xl mx-auto space-y-12">
          <div className="space-y-4 mt-12">
            <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl">
              LangQuest Next Support
            </h1>
            <p className="text-lg text-muted-foreground">
              Help for the LangQuest Next mobile app, provided by Frontier
              R&amp;D.
            </p>
          </div>

          <Section title="Get Help">
            <p>Email us with your question or problem:</p>
            <div className="my-8 p-6 border rounded-lg bg-muted/50">
              <a
                href={`mailto:${CONTACT}?subject=${encodeURIComponent('LangQuest Next support')}`}
                className="text-primary font-medium text-lg hover:underline flex items-center justify-center"
              >
                {CONTACT}
              </a>
            </div>
            <p>
              Write from the email address you sign in with, and tell us your
              phone model and what you were doing when the problem happened. We
              aim to reply within a few business days.
            </p>
          </Section>

          <Section title="Common Questions">
            <h3 className="text-xl font-bold">
              I forgot my password or can&apos;t sign in
            </h3>
            <p>
              Email <Mail /> from the address you sign in with and we will help
              you get back in.
            </p>
            <h3 className="text-xl font-bold">
              How do I join an organization?
            </h3>
            <p>
              Ask your organization&apos;s administrator for an invitation link
              or QR code, then open the link or scan the code in the app.
            </p>
            <h3 className="text-xl font-bold">
              How do I report content or a person?
            </h3>
            <p>
              Tap the flag next to what someone added to report it, or to report
              or block the person. Our staff review reports and act on them.
            </p>
            <h3 className="text-xl font-bold">How do I delete my account?</h3>
            <p>
              In the app, open Settings and tap <strong>Delete account</strong>.
              If you can&apos;t use the app, follow the steps on the{' '}
              <Link
                href="/next/delete-account"
                className="text-primary hover:underline"
              >
                account deletion page
              </Link>
              .
            </p>
          </Section>

          <Section title="More Information">
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <Link
                  href="/next/privacy"
                  className="text-primary hover:underline"
                >
                  LangQuest Next privacy policy
                </Link>
              </li>
              <li>
                <Link
                  href="/next/delete-account"
                  className="text-primary hover:underline"
                >
                  Delete your LangQuest Next account
                </Link>
              </li>
            </ul>
          </Section>
        </div>
      </div>
    </WebPageWrapper>
  );
}
