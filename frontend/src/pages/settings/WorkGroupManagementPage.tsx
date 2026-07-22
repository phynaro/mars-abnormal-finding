import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import WorkGroupTable from '@/components/work-group/WorkGroupTable';

const WorkGroupManagementPage: React.FC = () => {
  const { t } = useLanguage();

  return (
    <div className="space-y-6">
      <Card className="shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle>{t('workGroup.settings.title')}</CardTitle>
          <CardDescription>{t('workGroup.settings.description')}</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <WorkGroupTable />
        </CardContent>
      </Card>
    </div>
  );
};

export default WorkGroupManagementPage;
