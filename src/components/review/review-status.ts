import type { ReviewStatus } from '@/lib/review/submission';

export const STATUS_CLASS_NAME: Record<ReviewStatus, string> = {
  no_status: '',
  suggested_changes:
    'border-yellow-500 bg-yellow-400 text-yellow-950 hover:bg-yellow-400',
  approved: 'border-green-700 bg-green-600 text-white hover:bg-green-600'
};

export const STATUS_ITEM_CLASS_NAME: Record<ReviewStatus, string> = {
  no_status: '',
  suggested_changes:
    'bg-yellow-400 text-yellow-950 focus:bg-yellow-400 focus:text-yellow-950',
  approved: 'bg-green-600 text-white focus:bg-green-600 focus:text-white'
};
