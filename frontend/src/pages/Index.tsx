import { useState, useEffect, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { SummaryCards } from '@/components/dashboard/SummaryCards';
import { FilterBar } from '@/components/dashboard/FilterBar';
import { TrendChart } from '@/components/dashboard/TrendChart';
import { ThemeAnalysis } from '@/components/dashboard/ThemeAnalysis';
import { ActionRecommendations } from '@/components/dashboard/ActionRecommendations';
import { InterventionLog } from '@/components/dashboard/InterventionLog';
import { FrictionHeatmap } from '@/components/dashboard/FrictionHeatmap';
import { KeyDriversChart } from '@/components/dashboard/KeyDriversChart';
import { EmployeeTable } from '@/components/dashboard/EmployeeTable';
import { EmployeeDetail } from '@/components/dashboard/EmployeeDetail';
import { DashboardFilters, EmployeeData } from '@/types/dashboard';
import { fetchEmployeeData } from '@/services/dataService';
import { useTrend } from '@/hooks/useTrend';
import { useSummaryMetrics } from '@/hooks/useSummaryMetrics';
import {
  microActions,
  interventions
} from '@/data/mockData';

const Index = () => {
  const [filters, setFilters] = useState<DashboardFilters>({
    department: 'all',
    location: 'All',
    riskLevel: 'all',
    dateRange: 'month',
  });

  const [employees, setEmployees] = useState<EmployeeData[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<EmployeeData[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch trend data from API
  // Map dateRange to granularity
  const trendParams = useMemo(() => {
    let granularity: 'daily' | 'weekly' | 'monthly' = 'weekly';
    if (filters.dateRange === 'week') granularity = 'daily';
    if (filters.dateRange === 'month') granularity = 'weekly';
    if (filters.dateRange === 'quarter') granularity = 'weekly'; // or monthly
    if (filters.dateRange === 'year') granularity = 'monthly';

    return {
      granularity,
      department: filters.department === 'all' ? undefined : filters.department,
    };
  }, [filters.department, filters.dateRange]);

  const { data: trendData, loading: trendLoading } = useTrend(trendParams);

  const {
    data: metricsData,
    loading: metricsLoading
  } = useSummaryMetrics(filters.dateRange, filters.department);

  // Fetch Data
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      const data = await fetchEmployeeData();
      setEmployees(data);
      setFilteredEmployees(data);

      const params = new URLSearchParams(window.location.search);
      const empId = params.get('employeeId');
      if (empId) {
        const target = data.find(e => e.id === empId);
        if (target) setSelectedEmployee(target);
      }

      setIsLoading(false);
    };
    loadData();
  }, []);

  // Filter Logic
  useEffect(() => {
    let result = employees;
    if (filters.department !== 'all' && filters.department !== 'All Departments') {
      // Our CSV uses 'Division' which maps to 'department' in filters roughly
      result = result.filter(e => e.division === filters.department);
    }


    setFilteredEmployees(result);
  }, [filters, employees]);

  const handleFilterChange = (newFilters: Partial<DashboardFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">
              Employee Engagement Dashboard
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Early warning system for individual employee stress and workload
            </p>
          </div>
        </div>

        <div className={metricsLoading ? "opacity-50 pointer-events-none transition-opacity" : ""}>
          <SummaryCards metrics={metricsData} />
        </div>

        {/* Filter Bar */}
        <FilterBar filters={filters} onFilterChange={handleFilterChange} showLocation={false} showRiskLevel={false} showRefresh={true} />

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Trend Chart - Takes 2 columns */}
          <div className="lg:col-span-2">
            <TrendChart data={trendData} loading={trendLoading} />
          </div>

          {/* Theme Analysis */}
          <div className="lg:col-span-1">
            <ThemeAnalysis dateRange={filters.dateRange} />
          </div>
        </div>

        {/* NEW SECTION: Heatmap & Drivers */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <FrictionHeatmap />
          </div>
          <div className="lg:col-span-1">
            <KeyDriversChart />
          </div>
        </div>

        {/* Employee Table */}
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Loading Employee Data...</div>
        ) : (
          <EmployeeTable
            employees={filteredEmployees}
            onSelectEmployee={setSelectedEmployee}
          />
        )}

        {/* Employee Detail Modal */}
        <EmployeeDetail
          employee={selectedEmployee}
          isOpen={!!selectedEmployee}
          onClose={() => setSelectedEmployee(null)}
        />

        {/* Bottom Row: Actions + Interventions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ActionRecommendations actions={microActions} />
          <InterventionLog interventions={interventions} />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Index;
