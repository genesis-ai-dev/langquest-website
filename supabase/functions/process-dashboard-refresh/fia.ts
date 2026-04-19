import { buildGenericDashboardMetrics } from './shared.ts';
import type { DashboardMetrics, ProjectDashboardContext } from './types.ts';

export function buildFiaDashboard(
  context: ProjectDashboardContext
): DashboardMetrics {
  return buildGenericDashboardMetrics(context);
}
