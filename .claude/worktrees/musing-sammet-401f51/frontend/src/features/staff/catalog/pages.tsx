import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FilePlus2, FolderTree, Waypoints } from 'lucide-react';
import { CatalogPlaceholder, type CatalogCrumb } from './CatalogPlaceholder';

const HOME: CatalogCrumb = { labelKey: 'staff.home.crumbHome', to: '/staff' };
const PATHS: CatalogCrumb = { labelKey: 'nav.staff.learningPaths', to: '/staff/learning-paths' };

export function CategoriesPlaceholder() {
  return (
    <CatalogPlaceholder
      icon={FolderTree}
      crumbs={[HOME, { labelKey: 'nav.staff.categories' }]}
      titleKey="staff.catalog.categories.title"
      leadKey="staff.catalog.categories.lead"
    />
  );
}

export function LearningPathsPlaceholder() {
  return (
    <CatalogPlaceholder
      icon={Waypoints}
      crumbs={[HOME, { labelKey: 'nav.staff.learningPaths' }]}
      titleKey="staff.catalog.learningPaths.title"
      leadKey="staff.catalog.learningPaths.lead"
    />
  );
}

export function LearningPathNewPlaceholder() {
  return (
    <CatalogPlaceholder
      icon={FilePlus2}
      crumbs={[HOME, PATHS, { labelKey: 'staff.catalog.learningPaths.newCrumb' }]}
      titleKey="staff.catalog.learningPaths.newTitle"
      leadKey="staff.catalog.learningPaths.newLead"
    />
  );
}

export function LearningPathDetailPlaceholder() {
  const { id } = useParams();
  const { t } = useTranslation();
  return (
    <CatalogPlaceholder
      icon={Waypoints}
      crumbs={[HOME, PATHS, { labelKey: 'staff.catalog.learningPaths.detailCrumb' }]}
      titleKey="staff.catalog.learningPaths.detailTitle"
      leadKey="staff.catalog.learningPaths.detailLead"
      context={id ? t('staff.catalog.contextId', { id }) : null}
    />
  );
}
