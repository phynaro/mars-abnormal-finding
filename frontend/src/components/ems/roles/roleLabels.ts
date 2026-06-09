import type { EmsRole } from '@/utils/permissionChecker';

export const EMS_ROLE_OPTIONS: EmsRole[] = ['calibrator', 'am', 'plant_manager'];

export function emsRoleLabel(role: EmsRole | string, t: (key: string) => string): string {
  switch (role) {
    case 'calibrator':
      return t('ems.settings.role.calibrator');
    case 'am':
      return t('ems.settings.role.am');
    case 'plant_manager':
      return t('ems.settings.role.plantManager');
    default:
      return role;
  }
}
