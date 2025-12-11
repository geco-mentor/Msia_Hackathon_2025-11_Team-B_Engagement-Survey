
import React from 'react';

interface CardProps {
    children: React.ReactNode;
    className?: string;
    title?: React.ReactNode;
    action?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ children, className = '', title, action }) => {
    return (
        <div className={`bg-card border border-border rounded-2xl shadow-sm flex flex-col ${className}`}>
            {(title || action) && (
                <div className="px-6 py-5 border-b border-border flex justify-between items-center bg-muted/20">
                    {title && <h3 className="text-lg font-bold text-foreground tracking-tight">{title}</h3>}
                    {action && <div>{action}</div>}
                </div>
            )}
            <div className="p-6 flex-1 text-card-foreground">
                {children}
            </div>
        </div>
    );
};
