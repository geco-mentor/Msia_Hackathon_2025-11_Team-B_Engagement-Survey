
import React from 'react';

interface RiskBadgeProps {
    level: 'low' | 'moderate' | 'high';
    detailed?: boolean;
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({ level }) => {
    const styles = {
        low: 'bg-risk-healthy-bg text-risk-healthy border-risk-healthy/20',
        moderate: 'bg-risk-warning-bg text-risk-warning border-risk-warning/20',
        high: 'bg-risk-critical-bg text-risk-critical border-risk-critical/20'
    };

    const label = level.charAt(0).toUpperCase() + level.slice(1);

    return (
        <span className={`inline-flex items-center justify-center border px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[level]}`}>
            <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${level === 'low' ? 'bg-risk-healthy' : level === 'moderate' ? 'bg-risk-warning' : 'bg-risk-critical'
                }`}></span>
            {label}
        </span>
    );
};
