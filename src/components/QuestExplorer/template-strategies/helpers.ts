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

export function getQuestVersionName(
  quest: QuestRecord | null
): string | undefined {
  if (!quest?.metadata) {
    return undefined;
  }

  const metadata = quest.metadata as Record<string, unknown>;
  const value = metadata.versionName;

  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

export function getQuestVersionLabel(quest: QuestRecord): string {
  const versionName = getQuestVersionName(quest);
  if (versionName) {
    return versionName;
  }

  const date = new Date(quest.created_at);
  if (Number.isNaN(date.getTime())) {
    return quest.name;
  }

  return date.toLocaleString();
}
