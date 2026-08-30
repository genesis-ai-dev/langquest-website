import { QuestRecord } from '@/app/db/questExplorer';

export function getQuestDisabledFlag(quest: QuestRecord | null): boolean {
  if (!quest?.metadata) {
    return false;
  }

  const metadata = quest.metadata as Record<string, unknown>;
  const ui = metadata.ui as Record<string, unknown> | undefined;

  if (typeof metadata.disabled === 'boolean') {
    return metadata.disabled;
  }

  if (typeof ui?.disabled === 'boolean') {
    return ui.disabled;
  }

  if (metadata.status === 'disabled') {
    return true;
  }

  return false;
}

export function getQuestVersionLabel(
  quest: QuestRecord | null
): string | undefined {
  if (!quest?.metadata) {
    return undefined;
  }

  const metadata = quest.metadata as Record<string, unknown>;
  const value = metadata.versionLabel;

  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

export function withQuestVersionLabel(
  metadata: Record<string, unknown> | null | undefined,
  versionLabel: string | null | undefined
): Record<string, unknown> {
  const next = { ...(metadata || {}) };
  const trimmed = versionLabel?.trim();

  if (trimmed) {
    next.versionLabel = trimmed;
  } else {
    delete next.versionLabel;
  }

  return next;
}

function getCreatorInitials(username: string | null | undefined): string | null {
  if (!username?.trim()) {
    return null;
  }

  const words = username.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return null;
  }

  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }

  return (words[0][0] + words[1][0]).toUpperCase();
}

/** Version name or creation date — without creator initials. */
export function getQuestVersionDisplayLabel(quest: QuestRecord): string {
  const versionLabel = getQuestVersionLabel(quest);
  if (versionLabel) {
    return versionLabel;
  }

  const date = new Date(quest.created_at);
  if (Number.isNaN(date.getTime())) {
    return quest.name;
  }

  return date.toLocaleString();
}

export function formatQuestVersionLabel(quest: QuestRecord): string {
  const label = getQuestVersionDisplayLabel(quest);
  const initials = getCreatorInitials(quest.creator_username);
  return initials ? `${initials} - ${label}` : label;
}
