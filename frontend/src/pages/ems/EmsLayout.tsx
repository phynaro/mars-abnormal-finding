import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Gauge, LayoutDashboard, Wrench, CalendarDays, Settings } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { useLanguage } from '@/contexts/LanguageContext';
import { useEmsAccess } from '@/contexts/EmsAccessContext';
import EmsSubNav from '@/components/ems/shared/EmsSubNav';

const EmsLayout: React.FC = () => {
  const { t } = useLanguage();
  const { canAdmin } = useEmsAccess();
  const location = useLocation();

  const tabs = [
    { to: '/ems/dashboard', label: t('ems.nav.dashboard'), icon: LayoutDashboard },
    { to: '/ems/equipment', label: t('ems.nav.equipment'), icon: Wrench },
    { to: '/ems/schedule', label: t('ems.nav.schedule'), icon: CalendarDays },
    ...(canAdmin
      ? [{ to: '/ems/settings/roles', label: t('ems.nav.settings'), icon: Settings }]
      : []),
  ];

  const isDetail = /\/ems\/equipment\/[^/]+/.test(location.pathname);

  return (
    <div className="w-full p-4 sm:p-6 space-y-6 pb-8">
      {!isDetail && (
        <header className="space-y-5">
          <PageHeader
            title={t('ems.nav.label')}
            description={t('ems.layout.description')}
            rightContent={
              <div className="hidden sm:flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <Gauge className="h-5 w-5" aria-hidden />
              </div>
            }
          />
          {/* Desktop: sections live in layout SubmenuPanel; keep tabs on mobile/tablet */}
          <div className="lg:hidden">
            <EmsSubNav tabs={tabs} />
          </div>
        </header>
      )}

      <Outlet />
    </div>
  );
};

export default EmsLayout;
