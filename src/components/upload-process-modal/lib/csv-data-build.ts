import Papa from 'papaparse';

import { getUploadTemplate, type CsvRow } from './template';
import type { UploadProjectSetup, UploadType } from './types';

type CsvTreeNode = {
  id: string | number;
  parent: string | number;
  text: string;
  data?: {
    type?: string;
    questName?: string;
    parentQuestName?: string;
    description?: string;
    tags?: string[];
    asset?: CsvDataAsset;
    isExistingAsset?: boolean;
    bookId?: string;
    pericopeId?: string;
    pericopeVerseRange?: string;
  };
};

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
  assets: CsvDataAsset[];
};

type CsvDataBuildInput = string | CsvRow[];

type BuildCsvFromProjectTreeParams = {
  tree: CsvTreeNode[];
  uploadType: UploadType;
  projectSetup?: UploadProjectSetup | null;
};

const ROOT_ID = 0;

function buildCsvData(csv: CsvDataBuildInput): CsvDataBuildResult {
  const rows = Array.isArray(csv) ? csv : parseCsvRows(csv);
  const questMap = new Map<string, CsvDataQuest>();
  const assets: CsvDataAsset[] = [];

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const asset = buildAsset(row, rowNumber);
    const questName = normalizeValue(row.quest_name);

    if (!questName) {
      if (asset) {
        assets.push(asset);
      }
      return;
    }

    const parentName = normalizeValue(row.parent_quest_name);
    const quest = getOrCreateQuest(questMap, questName, parentName);

    quest.description ||= normalizeValue(row.quest_description);
    quest.tags = mergeUniqueValues(quest.tags, splitList(row.quest_tags));
    quest.rowNumbers.push(rowNumber);

    if (asset) {
      quest.assets.push(asset);
    }
  });

  return {
    ...connectQuestHierarchy(questMap),
    assets
  };
}

function buildCsvFromProjectTree({
  tree,
  uploadType,
  projectSetup
}: BuildCsvFromProjectTreeParams) {
  const rows = buildCsvRowsFromProjectTree({
    tree,
    uploadType,
    projectSetup
  });

  return Papa.unparse(rows, {
    columns: getUploadTemplate(uploadType).headers
  });
}

function buildCsvRowsFromProjectTree({
  tree,
  uploadType,
  projectSetup
}: BuildCsvFromProjectTreeParams): CsvRow[] {
  const rows: CsvRow[] = [];
  const nodesById = new Map<CsvTreeNode['id'], CsvTreeNode>();
  const childrenByParent = new Map<CsvTreeNode['id'], CsvTreeNode[]>();

  tree.forEach((node) => {
    nodesById.set(node.id, node);

    const siblings = childrenByParent.get(node.parent) ?? [];
    siblings.push(node);
    childrenByParent.set(node.parent, siblings);
  });

  function pushQuestBranchRows(parentId: CsvTreeNode['id']) {
    const children = childrenByParent.get(parentId) ?? [];

    children.forEach((node) => {
      if (node.data?.type === 'asset') {
        if (!node.data.isExistingAsset) {
          pushAssetRow(node);
        }
        return;
      }

      if (
        nodeHasAssetDescendant(node.id, childrenByParent) &&
        !nodeHasDirectAssetChild(node.id, childrenByParent)
      ) {
        pushQuestRow(node);
      }

      pushQuestBranchRows(node.id);
    });
  }

  function pushQuestRow(questNode: CsvTreeNode) {
    const parentQuestNode =
      questNode.parent !== ROOT_ID ? nodesById.get(questNode.parent) : undefined;

    rows.push(
      createCsvRow({
        uploadType,
        projectSetup,
        parentQuestNode,
        questNode
      })
    );
  }

  function pushAssetRow(assetNode: CsvTreeNode) {
    if (assetNode.data?.type !== 'asset' || !assetNode.data.asset) {
      return;
    }

    const questNode = nodesById.get(assetNode.parent);
    const parentQuestNode =
      questNode && questNode.parent !== ROOT_ID
        ? nodesById.get(questNode.parent)
        : undefined;

    rows.push(
      createCsvRow({
        uploadType,
        projectSetup,
        parentQuestNode,
        questNode,
        asset: assetNode.data.asset
      })
    );
  }

  pushQuestBranchRows(ROOT_ID);

  return rows;
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
      return;
    }

    parentQuest.quests.push(quest);
  });

  return {
    quests: sortQuests(rootQuests),
    orphanQuests: sortQuests(orphanQuests),
    assets: []
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

function createCsvRow({
  uploadType,
  projectSetup,
  parentQuestNode,
  questNode,
  asset
}: {
  uploadType: UploadType;
  projectSetup?: UploadProjectSetup | null;
  parentQuestNode?: CsvTreeNode;
  questNode?: CsvTreeNode;
  asset?: CsvDataAsset;
}): CsvRow {
  return {
    ...(uploadType === 'project'
      ? {
          project_name: projectSetup?.projectName ?? '',
          project_description: projectSetup?.description ?? '',
          project_template: projectSetup?.template ?? '',
          target_language: getProjectTargetLanguageName(projectSetup)
        }
      : {}),
    parent_quest_name: parentQuestNode ? getNodeQuestName(parentQuestNode) : '',
    quest_name: questNode
      ? getNodeQuestName(questNode, parentQuestNode)
      : '',
    quest_description: questNode ? getNodeQuestDescription(questNode) : '',
    quest_tags: questNode ? joinList(getNodeQuestTags(questNode)) : '',
    asset_name: asset?.name ?? '',
    asset_tags: asset ? joinList(asset.tags) : '',
    asset_label: asset?.label ?? '',
    source_language: asset?.sourceLanguage ?? '',
    source_images: asset ? joinList(asset.sourceImages) : '',
    source_content: asset?.sourceContent ?? '',
    source_audio: asset ? joinList(asset.sourceAudio) : ''
  };
}

function getProjectTargetLanguageName(
  projectSetup?: UploadProjectSetup | null
) {
  if (!projectSetup) {
    return '';
  }

  if (projectSetup.targetLanguageName) {
    return projectSetup.targetLanguageName;
  }

  return isLikelyId(projectSetup.targetLanguage)
    ? ''
    : projectSetup.targetLanguage;
}

function isLikelyId(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value
  );
}

function nodeHasAssetDescendant(
  nodeId: CsvTreeNode['id'],
  childrenByParent: Map<CsvTreeNode['id'], CsvTreeNode[]>
): boolean {
  const children = childrenByParent.get(nodeId) ?? [];

  return children.some(
    (childNode) =>
      childNode.data?.type === 'asset' ||
      nodeHasAssetDescendant(childNode.id, childrenByParent)
  );
}

function nodeHasDirectAssetChild(
  nodeId: CsvTreeNode['id'],
  childrenByParent: Map<CsvTreeNode['id'], CsvTreeNode[]>
): boolean {
  const children = childrenByParent.get(nodeId) ?? [];

  return children.some((childNode) => childNode.data?.type === 'asset');
}

function getNodeQuestName(node: CsvTreeNode, parentNode?: CsvTreeNode): string {
  if (
    node.data?.type === 'pericope' &&
    node.data.pericopeVerseRange &&
    parentNode
  ) {
    const pericopeName = `${getNodeQuestName(parentNode)} ${
      node.data.pericopeVerseRange
    }`;

    return node.data.pericopeId
      ? `${pericopeName}, ${node.data.pericopeId}`
      : pericopeName;
  }

  return node.data?.questName || node.text;
}

function getNodeQuestDescription(node: CsvTreeNode) {
  return node.data?.description ?? '';
}

function getNodeQuestTags(node: CsvTreeNode) {
  return node.data?.tags ?? [];
}

function joinList(values: string[]) {
  return values.join(';');
}

export { buildCsvData, buildCsvFromProjectTree, buildCsvRowsFromProjectTree };
export type {
  BuildCsvFromProjectTreeParams,
  CsvDataAsset,
  CsvDataBuildInput,
  CsvDataBuildResult,
  CsvDataQuest,
  CsvTreeNode
};
