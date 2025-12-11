
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { HEATMAP_DATA } from '../../constants';

const getHeatmapColor = (value: number) => {
    if (value >= 90) return 'bg-risk-critical text-primary-foreground shadow-sm font-bold';
    if (value >= 60) return 'bg-orange-500 text-white font-semibold';
    if (value >= 30) return 'bg-risk-warning text-risk-warning-foreground font-medium';
    if (value === 0) return 'bg-muted text-muted-foreground opacity-50';
    return 'bg-risk-healthy text-risk-healthy-foreground font-medium';
};

export const FrictionHeatmap = () => {
    return (
        <Card className="h-full shadow-card border-border">
            <CardHeader>
                <CardTitle className="text-lg font-display font-bold">Friction Heatmap: Dept vs Season</CardTitle>
                <CardDescription>Historical stress patterns by department</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left border-collapse">
                        <thead>
                            <tr>
                                <th className="py-3 px-2 text-muted-foreground font-semibold text-xs uppercase tracking-wider">Season</th>
                                <th className="py-3 px-2 text-muted-foreground font-medium text-center text-xs">OPS</th>
                                <th className="py-3 px-2 text-muted-foreground font-medium text-center text-xs">CS</th>
                                <th className="py-3 px-2 text-muted-foreground font-medium text-center text-xs">LOG</th>
                                <th className="py-3 px-2 text-muted-foreground font-medium text-center text-xs">HR</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {HEATMAP_DATA.map((row, idx) => (
                                <tr key={idx} className="hover:bg-muted/30 transition-colors group">
                                    <td className="py-3 px-2 font-medium text-foreground text-xs whitespace-nowrap">{row.season}</td>
                                    <td className="p-1.5">
                                        <div className={`h-8 w-full rounded-md flex items-center justify-center text-xs transition-transform duration-300 hover:scale-105 cursor-default ${getHeatmapColor(row.operations)}`}>
                                            {row.operations > 0 ? row.operations : '•'}
                                        </div>
                                    </td>
                                    <td className="p-1.5">
                                        <div className={`h-8 w-full rounded-md flex items-center justify-center text-xs transition-transform duration-300 hover:scale-105 cursor-default ${getHeatmapColor(row.cs)}`}>
                                            {row.cs > 0 ? row.cs : '•'}
                                        </div>
                                    </td>
                                    <td className="p-1.5">
                                        <div className={`h-8 w-full rounded-md flex items-center justify-center text-xs transition-transform duration-300 hover:scale-105 cursor-default ${getHeatmapColor(row.logistics)}`}>
                                            {row.logistics > 0 ? row.logistics : '•'}
                                        </div>
                                    </td>
                                    <td className="p-1.5">
                                        <div className={`h-8 w-full rounded-md flex items-center justify-center text-xs transition-transform duration-300 hover:scale-105 cursor-default ${getHeatmapColor(row.hr)}`}>
                                            {row.hr > 0 ? row.hr : '•'}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
    );
};
