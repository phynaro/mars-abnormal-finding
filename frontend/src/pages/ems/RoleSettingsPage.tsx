import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import RoleAssignmentTable from '@/components/ems/roles/RoleAssignmentTable';
import ManagerAreaConfig from '@/components/ems/roles/ManagerAreaConfig';
import { EmsPageStack } from '@/components/ems/shared/emsLayoutPrimitives';

const RoleSettingsPage: React.FC = () => {
  const { t } = useLanguage();

  return (
    <EmsPageStack>
      <Card className="shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle>{t('ems.settings.roles')}</CardTitle>
          <CardDescription>{t('ems.settings.rolesDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <RoleAssignmentTable />
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle>{t('ems.settings.managerAreas')}</CardTitle>
          <CardDescription>{t('ems.settings.managerAreasDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <ManagerAreaConfig />
        </CardContent>
      </Card>
    </EmsPageStack>
  );
};

export default RoleSettingsPage;
