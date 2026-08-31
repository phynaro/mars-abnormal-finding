import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, Wrench, CalendarDays, ClipboardList, Settings } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { useLanguage } from '@/contexts/LanguageContext';
import { useEmsAccess } from '@/contexts/EmsAccessContext';
import EmsSubNav from '@/components/ems/shared/EmsSubNav';
import { isMenuChildPathActive } from '@/components/layout/menuConfig';

const PAGE_DESCRIPTION_KEYS: Record<string, string> = {
  '/ems/dashboard': 'ems.dashboard.pageDescription',
  '/ems/equipment': 'ems.equipment.pageDescription',
  '/ems/schedule': 'ems.schedule.pageDescription',
  '/ems/work-orders': 'ems.workOrders.pageDescription',
  '/ems/settings/roles': 'ems.settings.description',
};

const EmsLayout: React.FC = () => {
  const { t } = useLanguage();
  const { canAdmin } = useEmsAccess();
  const location = useLocation();

  const tabs = [
    { to: '/ems/dashboard', label: t('ems.nav.dashboard'), icon: LayoutDashboard },
    { to: '/ems/equipment', label: t('ems.nav.equipment'), icon: Wrench },
    { to: '/ems/schedule', label: t('ems.nav.schedule'), icon: CalendarDays },
    { to: '/ems/work-orders', label: t('ems.nav.workOrders'), icon: ClipboardList },
    ...(canAdmin
      ? [{ to: '/ems/settings/roles', label: t('ems.nav.settings'), icon: Settings }]
      : []),
  ];

  const activeTab = tabs.find((tab) => isMenuChildPathActive(location.pathname, tab.to)) ?? tabs[0];
  const ActiveIcon = activeTab.icon;
  const description = t(PAGE_DESCRIPTION_KEYS[activeTab.to] ?? 'ems.layout.description');

  const isDetail = /\/ems\/equipment\/[^/]+/.test(location.pathname);

  return (
    <div className="w-full p-4 sm:p-6 space-y-6 pb-8">
      {!isDetail && (
        <header className="space-y-5">
          <PageHeader
            title={activeTab.label}
            description={description}
            rightContent={
              <div className="hidden sm:flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <ActiveIcon className="h-5 w-5" aria-hidden />
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
