import { cn } from '@/lib/utils';
import { NavLink } from '@/components/NavLink';
import {
  LayoutDashboard,
  Users,
  TrendingUp,
  AlertTriangle,
  MessageSquare,
  ClipboardList,
  Settings,
  Upload,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Shield,
  Bot,
  PieChart
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/' },
  { icon: Users, label: 'Teams', href: '/teams' },
  { icon: TrendingUp, label: 'Trends', href: '/trends' },
  { icon: AlertTriangle, label: 'Hotspots', href: '/hotspots' },
  { icon: MessageSquare, label: 'Feedback', href: '/feedback' },
  { icon: ClipboardList, label: 'Interventions', href: '/interventions' },
  { icon: Sparkles, label: 'AI Insights', href: '/insights' },

];

const bottomNavItems = [
  { icon: Upload, label: 'Data Import', href: '/import' },
  { icon: Settings, label: 'Settings', href: '/settings' },
];

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  return (
    <aside className={cn(
      "fixed left-0 top-0 h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300 ease-in-out z-50 flex flex-col",
      collapsed ? "w-16" : "w-64"
    )}>
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-sidebar-border">
        {!collapsed && (
          <NavLink to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-accent flex items-center justify-center overflow-hidden">
              <img src="https://www.pos.com.my/favicon.ico" alt="Pos Malaysia" className="w-7 h-7 object-contain" />
            </div>
            <div>
              <h1 className="font-display font-bold text-sidebar-accent-foreground text-sm">POS Malaysia</h1>
              <p className="text-[10px] text-sidebar-foreground/60">Insights</p>
            </div>
          </NavLink>
        )}
        {collapsed && (
          <NavLink to="/" className="w-8 h-8 rounded-lg bg-gradient-accent flex items-center justify-center mx-auto">
            <img src="/branding/pos-logo.svg" alt="Pos Malaysia" className="w-6 h-6 object-contain" />
          </NavLink>
        )}
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <Tooltip key={item.label} delayDuration={0}>
            <TooltipTrigger asChild>
              <NavLink
                to={item.href}
                end={item.href === '/'}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 hover:bg-sidebar-accent group text-sidebar-foreground"
                activeClassName="bg-sidebar-accent text-sidebar-primary"
              >
                <item.icon className="w-5 h-5 flex-shrink-0 transition-colors group-hover:text-sidebar-primary" />
                {!collapsed && (
                  <span className="text-sm font-medium transition-colors group-hover:text-sidebar-accent-foreground">
                    {item.label}
                  </span>
                )}
              </NavLink>
            </TooltipTrigger>
            {collapsed && (
              <TooltipContent side="right" className="bg-sidebar text-sidebar-foreground border-sidebar-border">
                {item.label}
              </TooltipContent>
            )}
          </Tooltip>
        ))}
      </nav>

      {/* Bottom Navigation */}
      <div className="py-4 px-2 space-y-1 border-t border-sidebar-border">
        {bottomNavItems.map((item) => (
          <Tooltip key={item.label} delayDuration={0}>
            <TooltipTrigger asChild>
              <NavLink
                to={item.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 hover:bg-sidebar-accent text-sidebar-foreground group"
                activeClassName="bg-sidebar-accent text-sidebar-primary"
              >
                <item.icon className="w-5 h-5 flex-shrink-0 group-hover:text-sidebar-primary transition-colors" />
                {!collapsed && (
                  <span className="text-sm font-medium group-hover:text-sidebar-accent-foreground transition-colors">
                    {item.label}
                  </span>
                )}
              </NavLink>
            </TooltipTrigger>
            {collapsed && (
              <TooltipContent side="right" className="bg-sidebar text-sidebar-foreground border-sidebar-border">
                {item.label}
              </TooltipContent>
            )}
          </Tooltip>
        ))}

        {/* Collapse Toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          className={cn(
            "w-full mt-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            collapsed ? "justify-center" : "justify-start"
          )}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4 mr-2" />
              <span className="text-sm">Collapse</span>
            </>
          )}
        </Button>
      </div>
    </aside>
  );
}
