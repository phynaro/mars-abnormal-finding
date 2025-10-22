import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Users, RefreshCw, AlertCircle, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import dashboardService from '@/services/dashboardService';
import personnelService from '@/services/personnelService';
import type { DepartmentUserKPIResponse, DepartmentUserKPIUserData } from '@/types/departmentUserKPI';
import type { Department } from '@/services/personnelService';
import DepartmentUserKPIFilterPanel from '@/components/dashboard/DepartmentUserKPIFilterPanel';
import DepartmentUserKPISummaryCards from '@/components/dashboard/DepartmentUserKPISummaryCards';
import UserKPICard from '@/components/dashboard/UserKPICard';

const DepartmentUserKPIDashboardPage: React.FC = () => {
  const { t } = useLanguage();

  // Filter panel visibility state
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState<boolean>(true);

  // Filter state
  const [selectedDeptNo, setSelectedDeptNo] = useState<number | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedKPIType, setSelectedKPIType] = useState<'created' | 'assigned'>('created');

  // Pending filters (not yet applied)
  const [pendingDeptNo, setPendingDeptNo] = useState<number | null>(null);
  const [pendingYear, setPendingYear] = useState<number>(new Date().getFullYear());
  const [pendingKPIType, setPendingKPIType] = useState<'created' | 'assigned'>('created');

  // Data state
  const [userData, setUserData] = useState<DepartmentUserKPIUserData[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [summary, setSummary] = useState<DepartmentUserKPIResponse['data']['summary'] | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [departmentsLoading, setDepartmentsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Available years (current year and previous 5 years)
  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 6 }, (_, i) => currentYear - i);
  }, []);

  // Fetch departments on component mount
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        setDepartmentsLoading(true);
        const response = await personnelService.getDepartments({ limit: 1000 });
        if (response.success) {
          setDepartments(response.data);
        }
      } catch (error) {
        console.error('Error fetching departments:', error);
        setError('Failed to load departments');
      } finally {
        setDepartmentsLoading(false);
      }
    };

    fetchDepartments();
  }, []);

  // Keyboard shortcut for toggling filter panel (Escape key)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsFilterPanelOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);


  const handleApply = async () => {
    // Apply pending filters to actual filters
    setSelectedDeptNo(pendingDeptNo);
    setSelectedYear(pendingYear);
    setSelectedKPIType(pendingKPIType);
    
    // Fetch data with applied filters
    if (pendingDeptNo) {
      try {
        setLoading(true);
        setError(null);

        const response = pendingKPIType === 'created'
          ? await dashboardService.getDepartmentUserKPITicketsCreated({
              deptNo: pendingDeptNo,
              year: pendingYear,
            })
          : await dashboardService.getDepartmentUserKPITicketsAssigned({
              deptNo: pendingDeptNo,
              year: pendingYear,
            });

        if (response.success) {
          setUserData(response.data.users);
          setSummary(response.data.summary);
        } else {
          setError('Failed to load user KPI data');
        }
      } catch (error) {
        console.error('Error fetching user KPI data:', error);
        setError('Failed to load user KPI data');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleReset = () => {
    const currentYear = new Date().getFullYear();
    setPendingDeptNo(null);
    setPendingYear(currentYear);
    setPendingKPIType('created');
    setSelectedDeptNo(null);
    setSelectedYear(currentYear);
    setSelectedKPIType('created');
    setUserData([]);
    setSummary(null);
    setError(null);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('dashboard.departmentUserKPI.title')}</h1>
          <p className="text-muted-foreground">{t('dashboard.departmentUserKPI.description')}</p>
        </div>
        <div className="flex items-center space-x-2">
          {!isFilterPanelOpen && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsFilterPanelOpen(true)}
              className="flex items-center space-x-2"
            >
              <Filter className="h-4 w-4" />
              <span>{t("common.showFilters")}</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Main Layout: Filter Panel (Left) + Content (Right) */}
      <div className={`grid gap-6 transition-all duration-300 ${isFilterPanelOpen ? 'grid-cols-1 lg:grid-cols-4' : 'grid-cols-1'}`}>
        {/* Filter Panel - Left Side */}
        {isFilterPanelOpen && (
          <div className="lg:col-span-1">
            <DepartmentUserKPIFilterPanel
              selectedDeptNo={pendingDeptNo}
              selectedYear={pendingYear}
              selectedKPIType={pendingKPIType}
              departments={departments}
              years={years}
              loading={loading || departmentsLoading}
              onDeptChange={setPendingDeptNo}
              onYearChange={setPendingYear}
              onKPITypeChange={setPendingKPIType}
              onApply={handleApply}
              onReset={handleReset}
              onHideFilters={() => setIsFilterPanelOpen(false)}
            />
          </div>
        )}

        {/* Right Side Content */}
        <div className={`space-y-6 ${isFilterPanelOpen ? 'lg:col-span-3' : 'col-span-1'}`}>
          {/* Summary Cards */}
          <DepartmentUserKPISummaryCards
            summary={summary}
            userData={userData}
            kpiType={selectedKPIType}
            loading={loading}
          />

          {/* User Charts Grid */}
          {!selectedDeptNo ? (
            <Card>
              <CardContent className="flex items-center justify-center h-[300px]">
                <div className="text-center">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">{t('dashboard.departmentUserKPI.noSelection')}</p>
                  <p className="text-sm text-muted-foreground">
                    {t('dashboard.departmentUserKPI.selectDepartmentToView')}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="h-[350px]">
                  <CardHeader className="pb-2">
                    <div className="animate-pulse bg-gray-200 h-4 rounded"></div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="h-[180px] animate-pulse bg-gray-200 rounded"></div>
                    <div className="space-y-2">
                      <div className="animate-pulse bg-gray-200 h-3 rounded"></div>
                      <div className="animate-pulse bg-gray-200 h-3 rounded"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : userData.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">
                  {t('dashboard.departmentUserKPI.userPerformance')} ({userData.length} {t('dashboard.departmentUserKPI.users')})
                </h2>
                <div className="flex items-center space-x-2">
                  <RefreshCw 
                    className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} 
                  />
                  <span className="text-sm text-muted-foreground">
                    {selectedKPIType === 'created' 
                      ? t('dashboard.departmentUserKPI.ticketsCreated') 
                      : t('dashboard.departmentUserKPI.ticketsAssigned')
                    }
                  </span>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {userData.map(user => (
                  <UserKPICard
                    key={user.personno}
                    user={user}
                    selectedYear={selectedYear}
                    kpiType={selectedKPIType}
                  />
                ))}
              </div>
            </div>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-[300px]">
                <div className="text-center">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">{t('dashboard.departmentUserKPI.noData')}</p>
                  <p className="text-sm text-muted-foreground">
                    {t('dashboard.departmentUserKPI.noUsersInDepartment')}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default DepartmentUserKPIDashboardPage;
