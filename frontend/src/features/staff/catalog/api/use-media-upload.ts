import { useMutation } from '@tanstack/react-query';
import {
  uploadCatalogMedia,
  type CatalogMediaKind,
  type CatalogMediaUploadResult,
} from '@/lib/api/admin/media';

/**
 * React Query mutation for the staff catalog-media upload. No cache writes — the
 * returned key is written into the editor form and persisted with the normal
 * course / learning-path save. Errors surface as `ApiError` (never auto-retried).
 */
export interface UploadCatalogMediaVars {
  file: File;
  kind: CatalogMediaKind;
  context?: string;
}

export function useUploadCatalogMedia() {
  return useMutation<CatalogMediaUploadResult, unknown, UploadCatalogMediaVars>({
    mutationFn: ({ file, kind, context }) => uploadCatalogMedia(file, kind, context),
  });
}
