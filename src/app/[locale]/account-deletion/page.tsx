import WebPageWrapper from '@/components/WebPageWrapper';
import { T } from 'gt-next';

function DeleteAccount() {
  return (
    <T id="app.delete-account.page.0">
      <WebPageWrapper>
        <div className="container mx-auto px-4 md:px-6 py-12">
          <div className="max-w-3xl mx-auto space-y-12">
            <div className="space-y-4 mt-12">
              <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl">
                Account Deletion Request
              </h1>
              <p className="text-lg text-muted-foreground">
                Request the deletion of your account and associated data from
                LangQuest.
              </p>
            </div>

            <div className="space-y-4 mt-12">
              <h2 className="text-2xl font-bold tracking-tighter sm:text-3xl">
                How to Request Account Deletion
              </h2>
              <div className="prose prose-gray dark:prose-invert">
                <p>
                  To request the deletion of your account and associated data,
                  please email us at:
                </p>
                <div className="my-8 p-6 border rounded-lg bg-muted/50">
                  <a
                    href="mailto:admin@frontierrnd.com?subject=Account%20Deletion%20Request&body=Please%20delete%20my%20LangQuest%20account.%20My%20email%20address%20is%3A%20%5BYour%20Email%20Address%5D"
                    className="text-primary font-medium text-lg hover:underline flex items-center justify-center"
                  >
                    admin@frontierrnd.com
                  </a>
                  <p className="text-center mt-2 text-muted-foreground">
                    Click the email address above to open your email client with
                    a pre-filled subject line.
                  </p>
                </div>
                <p>In your email, please include:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Your LangQuest username</li>
                  <li>
                    Any additional information that may help us identify your
                    account
                  </li>
                </ul>
              </div>
            </div>

            <div className="space-y-4 mt-12">
              <h2 className="text-2xl font-bold tracking-tighter sm:text-3xl">
                What Gets Deleted
              </h2>
              <div className="prose prose-gray dark:prose-invert">
                <p>When you request account deletion, we will delete:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Your account information (email, username)</li>
                  <li>Your personal settings and preferences</li>
                  <li>Any private data associated with your account</li>
                </ul>
                <h3 className="text-xl font-bold mt-6">Content Retention</h3>
                <p>
                  Please note that any content you have contributed to LangQuest
                  (translations, recordings, comments, votes) will remain
                  available under the CC0 1.0 Universal (CC0 1.0) Public Domain
                  Dedication, as outlined in our Terms of Service. These
                  contributions have been dedicated to the public domain and
                  cannot be withdrawn.
                </p>
              </div>
            </div>

            <div className="space-y-4 mt-12">
              <h2 className="text-2xl font-bold tracking-tighter sm:text-3xl">
                Data Retention Period
              </h2>
              <div className="prose prose-gray dark:prose-invert">
                <p>
                  Upon receiving your deletion request, we will process it
                  within 30 days. After deletion, we may retain certain data for
                  an additional period of up to 90 days in our backup systems
                  before it is completely purged.
                </p>
                <p>
                  We may also retain certain information if required by law or
                  for legitimate business purposes, such as resolving disputes
                  or enforcing our agreements.
                </p>
              </div>
            </div>

            <div className="space-y-4 mt-12">
              <h2 className="text-2xl font-bold tracking-tighter sm:text-3xl">
                Contact Us
              </h2>
              <div className="prose prose-gray dark:prose-invert">
                <p>
                  If you have any questions about account deletion or data
                  retention, please contact us at{' '}
                  <a
                    href="mailto:admin@frontierrnd.com"
                    className="text-primary underline"
                  >
                    admin@frontierrnd.com
                  </a>
                  .
                </p>
              </div>
            </div>
          </div>
        </div>
      </WebPageWrapper>
    </T>
  );
}

export default DeleteAccount;
