import WebPageWrapper from '@/components/WebPageWrapper';
import {
  currentPrivacyPolicyVersion,
  privacyPolicyVersions
} from '@/content/privacy/versions';
import { Link } from '@/i18n/navigation';

function PrivacyPolicyArchivePage() {
  const archivedVersions = privacyPolicyVersions.filter(
    (version) => !version.isCurrent
  );

  return (
    <WebPageWrapper>
      <div className="container mx-auto px-4 md:px-6 py-12">
        <div className="max-w-3xl mx-auto space-y-8">
          <div className="space-y-4 mt-12">
            <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl">
              Privacy Policy Archive
            </h1>
            <p className="text-lg text-muted-foreground">
              Previous versions of the LangQuest Privacy Policy are listed
              below. The current policy is always available at{' '}
              <Link href="/privacy" className="text-primary hover:underline">
                /privacy
              </Link>
              .
            </p>
          </div>

          <div className="space-y-4">
            <div className="rounded-lg border p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium">
                    Effective {currentPrivacyPolicyVersion.effectiveDateLabel}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {currentPrivacyPolicyVersion.summary}
                  </p>
                </div>
                <Link
                  href={`/privacy/${currentPrivacyPolicyVersion.slug}`}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  Current version
                </Link>
              </div>
            </div>

            {archivedVersions.map((version) => (
              <div key={version.slug} className="rounded-lg border p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium">
                      Effective {version.effectiveDateLabel}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {version.summary}
                    </p>
                  </div>
                  <Link
                    href={`/privacy/${version.slug}`}
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    View archived version
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </WebPageWrapper>
  );
}

export default PrivacyPolicyArchivePage;
