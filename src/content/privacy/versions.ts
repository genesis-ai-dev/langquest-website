import type { ComponentType } from 'react';

import PrivacyPolicy20250423 from '@/content/privacy/2025-04-23';
import PrivacyPolicy20260708 from '@/content/privacy/2026-07-08';
// Each version file exports `PrivacyPolicy` as default; import aliases disambiguate here.

export type PrivacyPolicyVersionSlug = '2025-04-23' | '2026-07-08';

export type PrivacyPolicyVersion = {
  slug: PrivacyPolicyVersionSlug;
  effectiveDateLabel: string;
  isCurrent: boolean;
  summary: string;
  Content: ComponentType;
};

export const privacyPolicyVersions: PrivacyPolicyVersion[] = [
  {
    slug: '2026-07-08',
    effectiveDateLabel: 'July 8, 2026',
    isCurrent: true,
    summary:
      'Discloses account-linked analytics, device identifiers, and session replay.',
    Content: PrivacyPolicy20260708
  },
  {
    slug: '2025-04-23',
    effectiveDateLabel: 'April 23, 2025',
    isCurrent: false,
    summary: 'Original privacy policy effective at launch.',
    Content: PrivacyPolicy20250423
  }
];

export const currentPrivacyPolicyVersion = privacyPolicyVersions.find(
  (version) => version.isCurrent
)!;

export function getPrivacyPolicyVersion(slug: string) {
  return privacyPolicyVersions.find((version) => version.slug === slug);
}

export function getArchivedPrivacyPolicyVersions() {
  return privacyPolicyVersions.filter((version) => !version.isCurrent);
}
