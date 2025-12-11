
import React from 'react';
import { Bot, ThumbsUp, MessageSquare } from 'lucide-react';

interface NudgePreviewProps {
    intervention: {
        title: string;
        trigger: string;
        action: string;
        category: string;
    };
}

export const NudgePreview: React.FC<NudgePreviewProps> = ({ intervention }) => {
    return (
        // Slack preview often attempts to look like Slack (dark/light mode independent, usually), 
        // but here we should match the app theme or force a specific Slack look.
        // Let's make it respect the app theme (bg-card but slightly different)
        <div className="bg-popover border border-border rounded-lg overflow-hidden font-sans max-w-sm mx-auto shadow-md">
            {/* Slack Header Mockup */}
            <div className="bg-muted/50 px-4 py-2 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="bg-purple-600 p-1 rounded">
                        <Bot size={12} className="text-white" />
                    </div>
                    <span className="text-foreground text-xs font-bold">POS Pulse Agent</span>
                    <span className="bg-muted text-[10px] px-1 rounded text-muted-foreground">APP</span>
                </div>
                <span className="text-muted-foreground text-[10px]">now</span>
            </div>

            {/* Message Body */}
            <div className="p-4">
                <div className="flex gap-3">
                    <div className="w-9 h-9 rounded bg-purple-600 flex-shrink-0 flex items-center justify-center">
                        <Bot size={20} className="text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 mb-1">
                            <span className="text-foreground font-bold text-sm">POS Pulse Agent</span>
                            <span className="text-muted-foreground text-xs">Bot</span>
                        </div>

                        <div className="text-card-foreground text-sm leading-relaxed mb-3">
                            Hi there! 👋 I've noticed some high workload signals for your team recently.
                        </div>

                        {/* Attachment / Card */}
                        <div className="border-l-4 border-primary pl-3 py-1 mb-3">
                            <p className="text-primary font-semibold text-xs mb-1">{intervention.category.toUpperCase()} ALERT</p>
                            <p className="text-foreground font-medium text-sm mb-1">{intervention.title}</p>
                            <p className="text-muted-foreground text-xs">{intervention.action}</p>
                        </div>

                        <div className="text-muted-foreground text-xs italic mb-4">
                            Triggered by: {intervention.trigger}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2">
                            <button className="px-3 py-1 bg-green-700 hover:bg-green-600 text-white text-xs font-medium rounded border border-transparent transition-colors">
                                Approve Action
                            </button>
                            <button className="px-3 py-1 bg-transparent hover:bg-muted text-foreground text-xs font-medium rounded border border-border transition-colors">
                                View Details
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Reaction Bar */}
            <div className="bg-muted/30 px-4 py-2 flex gap-4 border-t border-border">
                <div className="flex items-center gap-1 text-muted-foreground hover:text-foreground cursor-pointer">
                    <ThumbsUp size={14} />
                </div>
                <div className="flex items-center gap-1 text-muted-foreground hover:text-foreground cursor-pointer">
                    <MessageSquare size={14} />
                    <span className="text-xs">Reply in thread</span>
                </div>
            </div>
        </div>
    );
};
