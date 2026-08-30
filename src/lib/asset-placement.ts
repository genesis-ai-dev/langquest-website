/** Placement fields duplicated on `asset` and `quest_asset_link` for future import. */

export function serializeAssetMetadata(metadata: unknown): string | null {
  if (metadata == null || metadata === '') return null;
  if (typeof metadata === 'string') return metadata;
  return JSON.stringify(metadata);
}

export function assetWriteTimestamps() {
  const now = new Date().toISOString();
  return {
    created_at: now,
    last_updated: now
  };
}

export function buildAssetPlacementFields(input: {
  name: string;
  order_index?: number | null;
  metadata?: unknown;
}) {
  return {
    name: input.name,
    order_index:
      typeof input.order_index === 'number' &&
      Number.isFinite(input.order_index)
        ? input.order_index
        : 0,
    metadata: serializeAssetMetadata(input.metadata)
  };
}
