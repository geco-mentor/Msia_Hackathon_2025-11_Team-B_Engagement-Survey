import { Filter, Calendar, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useFilters } from '@/hooks/useFilters';
import { DashboardFilters } from '@/types/dashboard';

interface FilterData {
  departments: string[];
  locations: string[];
  positions: string[];
  employeeLevels: string[];
  jobGrades: string[];
}

interface FilterBarProps {
  filters: DashboardFilters;
  onFilterChange: (filters: Partial<DashboardFilters>) => void;
  // Configuration props (Default to true)
  showDepartment?: boolean;
  showLocation?: boolean;
  showRiskLevel?: boolean;
  showDateRange?: boolean;
  showRefresh?: boolean;
}

export function FilterBar({
  filters,
  onFilterChange,
  // Default all to true so existing implementations don't break
  showDepartment = true,
  showLocation = true,
  showRiskLevel = true,
  showDateRange = true,
  showRefresh = true
}: FilterBarProps) {

  const { data, loading, refetch } = useFilters();
  const filterOptions = data as FilterData | null;

  const handleRefresh = async () => {
    if (refetch) await refetch();
  };

  // If everything is hidden, you might want to return null, 
  // but usually we keep the container or just the specific items.

  return (
    <div className="flex flex-wrap items-center gap-3 p-4 bg-card rounded-lg border border-border shadow-card">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Filter className="w-4 h-4 text-muted-foreground" />
        <span>Filters:</span>
      </div>

      {/* DEPARTMENT FILTER */}
      {showDepartment && (
        <Select
          value={filters.department}
          onValueChange={(value) => onFilterChange({ department: value })}
          disabled={loading}
        >
          <SelectTrigger className="w-[180px] bg-background">
            <SelectValue placeholder={loading ? "Loading..." : "Department"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {filterOptions?.departments?.map((dept) => (
              <SelectItem key={dept} value={dept}>
                {dept}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* LOCATION FILTER */}
      {showLocation && (
        <Select
          value={filters.location}
          onValueChange={(value) => onFilterChange({ location: value })}
          disabled={loading}
        >
          <SelectTrigger className="w-[160px] bg-background">
            <SelectValue placeholder={loading ? "Loading..." : "Location"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Locations</SelectItem>
            {filterOptions?.locations?.map((loc) => (
              <SelectItem key={loc} value={loc}>
                {loc}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* RISK LEVEL FILTER */}
      {showRiskLevel && (
        <Select
          value={filters.riskLevel}
          onValueChange={(value) => onFilterChange({ riskLevel: value as DashboardFilters['riskLevel'] })}
        >
          <SelectTrigger className="w-[140px] bg-background">
            <SelectValue placeholder="Risk Level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Levels</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="warning">Warning</SelectItem>
            <SelectItem value="watch">Watch</SelectItem>
            <SelectItem value="healthy">Healthy</SelectItem>
          </SelectContent>
        </Select>
      )}

      {/* DATE RANGE FILTER */}
      {showDateRange && (
        <Select
          value={filters.dateRange}
          onValueChange={(value) => onFilterChange({ dateRange: value as DashboardFilters['dateRange'] })}
        >
          <SelectTrigger className="w-[130px] bg-background">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <SelectValue placeholder="Period" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
            <SelectItem value="quarter">This Quarter</SelectItem>
            <SelectItem value="year">This Year</SelectItem>
          </SelectContent>
        </Select>
      )}

      <div className="flex-1" />

      {/* REFRESH BUTTON */}
      {showRefresh && (
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={handleRefresh}
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh Data
        </Button>
      )}
    </div>
  );
}