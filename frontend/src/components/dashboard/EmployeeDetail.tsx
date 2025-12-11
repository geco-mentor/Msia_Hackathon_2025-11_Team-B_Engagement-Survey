import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { EmployeeData } from "@/types/dashboard";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend
} from "recharts";

interface EmployeeDetailProps {
    employee: EmployeeData | null;
    isOpen: boolean;
    onClose: () => void;
}

export const EmployeeDetail = ({ employee, isOpen, onClose }: EmployeeDetailProps) => {
    if (!employee) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Employee Details - {employee.id}</DialogTitle>
                    <DialogDescription>
                        Division: {employee.division} | Current Risk: {employee.riskLevel.toUpperCase()}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 border rounded bg-muted/20">
                            <p className="text-sm font-medium text-muted-foreground">Current Stress</p>
                            <p className="text-2xl font-bold">{employee.currentStress.toFixed(2)}</p>
                        </div>
                        <div className="p-4 border rounded bg-muted/20">
                            <p className="text-sm font-medium text-muted-foreground">Current Workload</p>
                            <p className="text-2xl font-bold">{employee.currentWorkload.toFixed(0)}</p>
                        </div>
                    </div>

                    <div className="h-[300px] w-full border rounded p-4">
                        <h4 className="mb-4 font-semibold text-sm">Stress & Workload History</h4>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={employee.history}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="Snapshot_Date" />
                                <YAxis yAxisId="left" domain={[0, 10]} />
                                <YAxis yAxisId="right" orientation="right" />
                                <Tooltip />
                                <Legend />
                                <Line
                                    yAxisId="left"
                                    type="monotone"
                                    dataKey="Monthly_Stress_Score"
                                    stroke="#ef4444"
                                    name="Stress Score"
                                    strokeWidth={2}
                                />
                                <Line
                                    yAxisId="right"
                                    type="monotone"
                                    dataKey="Workload_Volume"
                                    stroke="#3b82f6"
                                    name="Workload"
                                    strokeWidth={2}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};
