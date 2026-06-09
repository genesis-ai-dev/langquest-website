import WebPageWrapper from '@/components/WebPageWrapper';
import {
  currentPrivacyPolicyVersion,
  privacyPolicyVersions,
  type PrivacyPolicyVersionSlug
} from '@/content/privacy/versions';
import { Link } from '@/i18n/navigation';

type PrivacyPolicyPageProps = {
  version?: PrivacyPolicyVersionSlug;
  isArchivedView?: boolean;
};

function PrivacyPolicyPage({
  version = currentPrivacyPolicyVersion.slug,
  isArchivedView = false
}: PrivacyPolicyPageProps) {
  const versionMeta =
    privacyPolicyVersions.find((entry) => entry.slug === version) ??
    currentPrivacyPolicyVersion;

  const { Content } = versionMeta;

  return (
    <WebPageWrapper>
      <div className="container mx-auto px-4 md:px-6 py-12">
        <div className="max-w-3xl mx-auto space-y-12">
          {isArchivedView ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
              <p>
                This is an archived version of our Privacy Policy.{' '}
                <Link href="/privacy" className="font-medium underline">
                  View the current Privacy Policy
                </Link>
                .
              </p>
            </div>
          ) : null}

          <div className="space-y-4 mt-12">
            <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl">
              Privacy Policy
            </h1>
            <p className="text-lg text-muted-foreground">
              This Privacy Policy describes how Frontier R&D collects, uses, and
              shares information in connection with your use of the LangQuest
              mobile application.
            </p>
          </div>

          <div className="text-sm text-muted-foreground">
            <p>Effective Date: {versionMeta.effectiveDateLabel}</p>
            {!isArchivedView ? (
              <p className="mt-2">
                <Link
                  href="/privacy/archive"
                  className="text-primary hover:underline"
                >
                  View archived versions
                </Link>
              </p>
            ) : null}
          </div>

          <Content />
        </div>
      </div>
    </WebPageWrapper>
  );
}

export default PrivacyPolicyPage;
