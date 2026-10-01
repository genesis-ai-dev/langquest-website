import WebPageWrapper from '@/components/WebPageWrapper';
import { Link } from '@/i18n/navigation';

// Account deletion for LangQuest Next (genesis-ai-dev/langquest-next), the
// web address its store listings give. Deleting in the app is immediate;
// an emailed request is answered by staff running
// public.delete_account_for_email in that app's Supabase project
// (langquest-next docs/decisions.md 46).

const CONTACT = 'admin@frontierrnd.com';
const MAILTO = `mailto:${CONTACT}?subject=${encodeURIComponent('Delete my LangQuest Next account')}&body=${encodeURIComponent(
  'Please delete my LangQuest Next account. I am writing from the email address I sign in with.'
)}`;

export default function LangQuestNextDeleteAccount() {
  return (
    <WebPageWrapper>
      <div className="container mx-auto px-4 md:px-6 py-12">
        <div className="max-w-3xl mx-auto space-y-12">
          <div className="space-y-4 mt-12">
            <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl">
              Delete Your LangQuest Next Account
            </h1>
            <p className="text-lg text-muted-foreground">
              For the LangQuest Next app. To delete an account in the original
              LangQuest app, see{' '}
              <Link
                href="/account-deletion"
                className="text-primary hover:underline"
              >
                its account deletion page
              </Link>
              .
            </p>
          </div>

          <div className="space-y-4 mt-12">
            <h2 className="text-2xl font-bold tracking-tighter sm:text-3xl">
              In the App (Fastest)
            </h2>
            <div className="prose prose-gray dark:prose-invert">
              <ol className="list-decimal pl-6 space-y-2">
                <li>Open LangQuest Next and go to Settings.</li>
                <li>
                  Tap <strong>Delete account</strong>, then{' '}
                  <strong>Delete My Account</strong>.
                </li>
              </ol>
              <p>
                Your account is deleted at once. If you have work that has not
                been sent yet, the app asks you to connect and let it sync
                first, so your organization receives it.
              </p>
            </div>
          </div>

          <div className="space-y-4 mt-12">
            <h2 className="text-2xl font-bold tracking-tighter sm:text-3xl">
              By Email
            </h2>
            <div className="prose prose-gray dark:prose-invert">
              <p>
                If you can&apos;t use the app, email us from the address you
                sign in with:
              </p>
              <div className="my-8 p-6 border rounded-lg bg-muted/50">
                <a
                  href={MAILTO}
                  className="text-primary font-medium text-lg hover:underline flex items-center justify-center"
                >
                  {CONTACT}
                </a>
                <p className="text-center mt-2 text-muted-foreground">
                  Subject: Delete my LangQuest Next account
                </p>
              </div>
              <p>
                We delete it within 30 days and reply to confirm. If you write
                from a different address, we will ask you to confirm the account
                is yours first.
              </p>
            </div>
          </div>

          <div className="space-y-4 mt-12">
            <h2 className="text-2xl font-bold tracking-tighter sm:text-3xl">
              What Is Deleted and What Is Kept
            </h2>
            <div className="prose prose-gray dark:prose-invert">
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong>Deleted:</strong> your sign-in, email address and
                  password, your name, notifications, join requests, your email
                  on invitations, and diagnostics sent from your account.
                </li>
                <li>
                  <strong>Ended:</strong> your membership in every organization.
                </li>
                <li>
                  <strong>Kept:</strong> recordings, reviews and notes you made
                  stay part of your organization&apos;s translation work, marked
                  with a random ID that no longer leads to you, and without your
                  name. That work belongs to your organization; to ask for any
                  of it to be removed, contact its administrators.
                </li>
              </ul>
              <p>
                Copies in backups are deleted when those backups expire. The{' '}
                <Link
                  href="/next/privacy"
                  className="text-primary hover:underline"
                >
                  LangQuest Next privacy policy
                </Link>{' '}
                has the details.
              </p>
            </div>
          </div>
        </div>
      </div>
    </WebPageWrapper>
  );
}
