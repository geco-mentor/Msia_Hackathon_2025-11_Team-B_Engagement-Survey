
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Bar, Cell, LabelList } from 'recharts';
import { DRIVERS_DATA } from '../../constants';

export const KeyDriversChart = () => {
    return (
        <Card className="h-full shadow-card border-border">
            <CardHeader>
                <CardTitle className="text-lg font-display font-bold">Key Drivers</CardTitle>
                <CardDescription>Sentiment vs Workload Impact</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart layout="vertical" data={DRIVERS_DATA} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={true} stroke="hsl(var(--muted-foreground))" opacity={0.1} />
                            <XAxis type="number" hide />
                            <YAxis
                                dataKey="name"
                                type="category"
                                width={80}
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12, fontWeight: 500 }}
                            />
                            <Tooltip
                                cursor={{ fill: 'var(--muted)', opacity: 0.1 }}
                                contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--popover-foreground))', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                            />
                            <Bar dataKey="value" barSize={32} radius={[0, 6, 6, 0]} isAnimationActive={true}>
                                {DRIVERS_DATA.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.fill} className="hover:opacity-80 transition-opacity" />
                                ))}
                                <LabelList
                                    dataKey="value"
                                    position="right"
                                    fill="hsl(var(--muted-foreground))"
                                    formatter={(val: any) => `Load: ${val}`}
                                    style={{ fontSize: '11px', fontWeight: 500 }}
                                />
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
};
