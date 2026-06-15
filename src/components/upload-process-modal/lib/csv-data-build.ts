import Papa from 'papaparse';

import type { CsvRow } from './template';

type CsvDataAsset = {
  type: 'asset';
  name: string;
  tags: string[];
  label: string;
  sourceLanguage: string;
  sourceImages: string[];
  sourceContent: string;
  sourceAudio: string[];
  rowNumber: number;
};

type CsvDataQuest = {
  type: 'quest';
  name: string;
  parentName: string;
  description: string;
  tags: string[];
  assets: CsvDataAsset[];
  quests: CsvDataQuest[];
  rowNumbers: number[];
};

type CsvDataBuildResult = {
  quests: CsvDataQuest[];
  orphanQuests: CsvDataQuest[];
};

type CsvDataBuildInput = string | CsvRow[];

function buildCsvData(csv: CsvDataBuildInput): CsvDataBuildResult {
  const rows = Array.isArray(csv) ? csv : parseCsvRows(csv);
  const questMap = new Map<string, CsvDataQuest>();

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const questName = normalizeValue(row.quest_name);

    if (!questName) {
      return;
    }

    const parentName = normalizeValue(row.parent_quest_name);
    const quest = getOrCreateQuest(questMap, questName, parentName);

    quest.description ||= normalizeValue(row.quest_description);
    quest.tags = mergeUniqueValues(quest.tags, splitList(row.quest_tags));
    quest.rowNumbers.push(rowNumber);

    const asset = buildAsset(row, rowNumber);
    if (asset) {
      quest.assets.push(asset);
    }
  });

  return connectQuestHierarchy(questMap);
}

function parseCsvRows(csvContent: string): CsvRow[] {
  const parseResult = Papa.parse<CsvRow>(csvContent, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (header) => header.trim(),
    transform: (value) => value.trim()
  });

  return parseResult.data;
}

function buildAsset(row: CsvRow, rowNumber: number): CsvDataAsset | null {
  const assetName = normalizeValue(row.asset_name);

  if (!assetName) {
    return null;
  }

  return {
    type: 'asset',
    name: assetName,
    tags: splitList(row.asset_tags),
    label: normalizeValue(row.asset_label),
    sourceLanguage: normalizeValue(row.source_language),
    sourceImages: splitList(row.source_images),
    sourceContent: normalizeValue(row.source_content),
    sourceAudio: splitList(row.source_audio),
    rowNumber
  };
}

function getOrCreateQuest(
  questMap: Map<string, CsvDataQuest>,
  questName: string,
  parentName: string
) {
  const key = getQuestKey(questName, parentName);
  const existingQuest = questMap.get(key);

  if (existingQuest) {
    return existingQuest;
  }

  const quest: CsvDataQuest = {
    type: 'quest',
    name: questName,
    parentName,
    description: '',
    tags: [],
    assets: [],
    quests: [],
    rowNumbers: []
  };

  questMap.set(key, quest);

  return quest;
}

function connectQuestHierarchy(
  questMap: Map<string, CsvDataQuest>
): CsvDataBuildResult {
  const rootQuests: CsvDataQuest[] = [];
  const orphanQuests: CsvDataQuest[] = [];

  questMap.forEach((quest) => {
    if (!quest.parentName) {
      rootQuests.push(quest);
      return;
    }

    const parentQuest = findQuestByName(questMap, quest.parentName);

    if (!parentQuest) {
      orphanQuests.push(quest);
      rootQuests.push(quest);
      return;
    }

    parentQuest.quests.push(quest);
  });

  return {
    quests: sortQuests(rootQuests),
    orphanQuests: sortQuests(orphanQuests)
  };
}

function findQuestByName(
  questMap: Map<string, CsvDataQuest>,
  questName: string
) {
  const matchingQuests = Array.from(questMap.values()).filter(
    (quest) => quest.name === questName
  );

  return matchingQuests.length === 1 ? matchingQuests[0] : null;
}

function sortQuests(quests: CsvDataQuest[]): CsvDataQuest[] {
  return quests
    .sort((questA, questB) => questA.name.localeCompare(questB.name))
    .map((quest) => ({
      ...quest,
      quests: sortQuests(quest.quests)
    }));
}

function getQuestKey(questName: string, parentName: string) {
  return `${parentName}::${questName}`;
}

function splitList(value: string | undefined) {
  return normalizeValue(value)
    .split(';')
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeValue(value: string | undefined) {
  return value?.trim() ?? '';
}

function mergeUniqueValues(valuesA: string[], valuesB: string[]) {
  return Array.from(new Set([...valuesA, ...valuesB]));
}

export { buildCsvData };
export type {
  CsvDataAsset,
  CsvDataBuildInput,
  CsvDataBuildResult,
  CsvDataQuest
};
