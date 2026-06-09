import PrivacyPolicyPage from '@/components/privacy/PrivacyPolicyPage';
import {
  getPrivacyPolicyVersion,
  privacyPolicyVersions,
  type PrivacyPolicyVersionSlug
} from '@/content/privacy/versions';
import { notFound } from 'next/navigation';

type PrivacyPolicyVersionPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export function generateStaticParams() {
  return privacyPolicyVersions.map((version) => ({
    slug: version.slug
  }));
}

async function PrivacyPolicyVersionPage({
  params
}: PrivacyPolicyVersionPageProps) {
  const { slug } = await params;
  const version = getPrivacyPolicyVersion(slug);

  if (!version) {
    notFound();
  }

  return (
    <PrivacyPolicyPage
      version={slug as PrivacyPolicyVersionSlug}
      isArchivedView={!version.isCurrent}
    />
  );
}

export default PrivacyPolicyVersionPage;
