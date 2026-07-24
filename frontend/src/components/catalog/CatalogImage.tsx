import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { resolveCatalogMediaUrl } from '@/lib/media/catalog-media';

export interface CatalogImageProps {
  /** Storage key (or absolute https URL) from the catalog DTO. */
  mediaKey?: string | null;
  /** Author-provided alt text (`thumbnailAlt`); falls back to a localized label. */
  alt?: string | null;
  /** Picks the localized fallback alt when `alt` is empty. */
  kind: 'course' | 'path';
  /** Decorative icon shown on the branded fallback tile. */
  icon: LucideIcon;
  /** Shape / position classes for the tile (aspect ratio, rounding, border). */
  className?: string;
  /** Icon size class on the fallback. */
  iconClassName?: string;
  /** Load eagerly (detail hero) vs lazily (cards, default). */
  eager?: boolean;
}

/**
 * Single, safe media surface for the public catalog. When the key resolves to a
 * real URL (via `resolveCatalogMediaUrl`) it renders a lazy `<img>` with proper
 * alt text and — critically — falls back to the branded Code Spark Kids blue
 * gradient tile on load error, so a broken URL never shows a broken-image icon.
 * When the key resolves to `null` (the current state — no media host yet) it
 * renders that same branded fallback directly. The fallback is decorative; the
 * card / hero heading already names the item, so screen readers skip the tile.
 */
export function CatalogImage({
  mediaKey,
  alt,
  kind,
  icon: Icon,
  className,
  iconClassName,
  eager = false,
}: CatalogImageProps) {
  const { t } = useTranslation();
  const src = resolveCatalogMediaUrl(mediaKey);
  const [failed, setFailed] = useState(false);
  // Recover when the resolved URL changes: a previously-broken image (e.g. a
  // stale key whose file is missing) must get a fresh chance to load once the
  // key is replaced — otherwise an admin uploading over a broken image would
  // keep seeing the fallback. Only a load error on the *new* src re-fails it.
  useEffect(() => {
    setFailed(false);
  }, [src]);
  const imageAlt = alt?.trim() || t(`catalog.media.${kind}Alt`);

  return (
    <div className={cn('relative overflow-hidden', className)}>
      {src && !failed ? (
        <img
          src={src}
          alt={imageAlt}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          className="absolute inset-0 size-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="catalog-media-fallback absolute inset-0 flex items-center justify-center">
          <span
            aria-hidden="true"
            className="catalog-media-glow-cyan pointer-events-none absolute -start-6 -top-8 size-28 rounded-full blur-2xl"
          />
          <span
            aria-hidden="true"
            className="catalog-media-glow-yellow pointer-events-none absolute -bottom-8 -end-8 size-24 rounded-full blur-2xl"
          />
          <Icon
            aria-hidden="true"
            className={cn('catalog-media-icon relative drop-shadow', iconClassName)}
          />
        </div>
      )}
    </div>
  );
}
