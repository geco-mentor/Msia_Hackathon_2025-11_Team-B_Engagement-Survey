import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EmployeeData, RiskLevel } from "@/types/dashboard";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";

import { cn } from "@/lib/utils";

// ... existing imports ...

interface EmployeeTableProps {
    employees: EmployeeData[];
    onSelectEmployee: (employee: EmployeeData) => void;
}

const riskBadgeStyles: Record<RiskLevel, string> = {
    critical: 'bg-risk-critical-bg text-risk-critical border-risk-critical/30',
    warning: 'bg-risk-warning-bg text-risk-warning border-risk-warning/30',
    watch: 'bg-risk-watch-bg text-risk-watch border-risk-watch/30',
    healthy: 'bg-risk-healthy-bg text-risk-healthy border-risk-healthy/30',
};

const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
        case 'up':
            // Stress UP is bad
            return <ArrowUp className="h-4 w-4 text-risk-critical" />;
        case 'down':
            // Stress DOWN is good
            return <ArrowDown className="h-4 w-4 text-risk-healthy" />;
        default:
            return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
};

export const EmployeeTable = ({ employees, onSelectEmployee }: EmployeeTableProps) => {
    return (
        <div className="rounded-md border bg-card">
            <div className="p-4 border-b">
                <h3 className="font-semibold text-lg">Employee Risk Overview</h3>
            </div>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Employee ID</TableHead>
                        <TableHead>Division</TableHead>
                        <TableHead className="text-right">Stress Score</TableHead>
                        <TableHead className="text-right">Workload</TableHead>
                        <TableHead>Risk Level</TableHead>
                        <TableHead>Trend</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {employees.map((employee) => (
                        <TableRow
                            key={employee.id}
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => onSelectEmployee(employee)}
                        >
                            <TableCell className="font-medium">{employee.id}</TableCell>
                            <TableCell>{employee.division}</TableCell>
                            <TableCell className="text-right">{employee.currentStress.toFixed(2)}</TableCell>
                            <TableCell className="text-right">{employee.currentWorkload.toFixed(0)}</TableCell>
                            <TableCell>
                                <Badge
                                    variant="outline"
                                    className={cn("capitalize", riskBadgeStyles[employee.riskLevel])}
                                >
                                    {employee.riskLevel}
                                </Badge>
                            </TableCell>
                            <TableCell>
                                <div className="flex items-center gap-2">
                                    {getTrendIcon(employee.trend)}
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
};
