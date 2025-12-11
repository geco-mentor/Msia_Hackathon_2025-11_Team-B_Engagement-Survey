import { EmployeeData, EmployeeHistoryRecord, RiskLevel } from '@/types/dashboard';
import { parse } from 'date-fns';

export const fetchEmployeeData = async (): Promise<EmployeeData[]> => {
    try {
        const response = await fetch('/data/employee_history.csv');
        const text = await response.text();
        const rows = text.split('\n').filter(row => row.trim() !== '');

        // Assume header exists: Snapshot_Date,EmployeeID,Division,Season_Label,Monthly_Stress_Score,Workload_Volume
        const headers = rows[0].split(',');
        const dataRows = rows.slice(1);

        const history: EmployeeHistoryRecord[] = dataRows.map(row => {
            const cols = row.split(',');
            return {
                Snapshot_Date: cols[0],
                EmployeeID: cols[1],
                Division: cols[2],
                Season_Label: cols[3],
                Monthly_Stress_Score: parseFloat(cols[4]),
                Workload_Volume: parseFloat(cols[5])
            };
        }).filter(r => r.EmployeeID); // Filter out any empty rows

        // Group by Employee
        const employeeMap = new Map<string, EmployeeHistoryRecord[]>();
        history.forEach(record => {
            if (!employeeMap.has(record.EmployeeID)) {
                employeeMap.set(record.EmployeeID, []);
            }
            employeeMap.get(record.EmployeeID)?.push(record);
        });

        const employees: EmployeeData[] = [];

        employeeMap.forEach((records, id) => {
            // Sort by date ascending
            records.sort((a, b) => new Date(a.Snapshot_Date).getTime() - new Date(b.Snapshot_Date).getTime());

            const latest = records[records.length - 1];
            const previous = records.length > 1 ? records[records.length - 2] : null;

            const allStress = records.map(r => r.Monthly_Stress_Score);
            const allWorkload = records.map(r => r.Workload_Volume);

            const avgStress = allStress.reduce((a, b) => a + b, 0) / allStress.length;
            const avgWorkload = allWorkload.reduce((a, b) => a + b, 0) / allWorkload.length;

            // Simple Risk Logic
            let risk: RiskLevel = 'healthy';
            if (latest.Monthly_Stress_Score > 4.5) risk = 'critical';
            else if (latest.Monthly_Stress_Score > 3.5) risk = 'warning';
            else if (latest.Monthly_Stress_Score > 3.0) risk = 'watch';

            // Trend Logic
            let trend: 'up' | 'down' | 'stable' = 'stable';
            if (previous) {
                if (latest.Monthly_Stress_Score > previous.Monthly_Stress_Score + 0.1) trend = 'up'; // Stress going up is bad? Or is score good? Assuming score is stress level (bad)
                else if (latest.Monthly_Stress_Score < previous.Monthly_Stress_Score - 0.1) trend = 'down';
            }

            employees.push({
                id: id,
                division: latest.Division,
                currentStress: latest.Monthly_Stress_Score,
                currentWorkload: latest.Workload_Volume,
                averageStress: avgStress,
                averageWorkload: avgWorkload,
                riskLevel: risk,
                trend: trend, // Note: Trend in UI often means "performance" trend. If Stress goes UP, trend might be visually "bad" or just literal up arrow. We'll stick to literal for now.
                history: records
            });
        });

        return employees;

    } catch (error) {
        console.error('Error fetching/parsing CSV:', error);
        return [];
    }
};

export const getCompanyTrends = (employees: EmployeeData[]) => {
    const dateMap = new Map<string, { totalStress: number; totalWorkload: number; count: number }>();

    employees.forEach(emp => {
        emp.history.forEach(record => {
            if (!dateMap.has(record.Snapshot_Date)) {
                dateMap.set(record.Snapshot_Date, { totalStress: 0, totalWorkload: 0, count: 0 });
            }
            const entry = dateMap.get(record.Snapshot_Date)!;
            entry.totalStress += record.Monthly_Stress_Score;
            entry.totalWorkload += record.Workload_Volume;
            entry.count += 1;
        });
    });

    return Array.from(dateMap.entries()).map(([date, data]) => ({
        date: date,
        avgStress: data.totalStress / data.count,
        avgWorkload: data.totalWorkload / data.count,
        employeeCount: data.count
    })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
};

export const getDepartmentStats = (employees: EmployeeData[]) => {
    const deptMap = new Map<string, { totalStress: number; count: number; riskyCount: number; employees: EmployeeData[] }>();

    employees.forEach(emp => {
        if (!deptMap.has(emp.division)) {
            deptMap.set(emp.division, { totalStress: 0, count: 0, riskyCount: 0, employees: [] });
        }
        const entry = deptMap.get(emp.division)!;
        entry.totalStress += emp.currentStress;
        entry.count += 1;
        if (emp.riskLevel === 'critical' || emp.riskLevel === 'warning') {
            entry.riskyCount += 1;
        }
        entry.employees.push(emp);
    });

    return Array.from(deptMap.entries()).map(([division, data]) => ({
        division,
        employeeCount: data.count,
        avgStress: data.totalStress / data.count,
        riskPercentage: (data.riskyCount / data.count) * 100,
        employees: data.employees
    }));
};
