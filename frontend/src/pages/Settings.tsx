import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Bell, Shield, Database, Users, Palette } from 'lucide-react';

const Settings = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground text-sm mt-1">Configure your dashboard preferences and alerts</p>
        </div>

        {/* Notifications */}
        <Card className="shadow-card border">
          <CardHeader>
            <CardTitle className="text-lg font-display flex items-center gap-2">
              <Bell className="w-5 h-5 text-muted-foreground" />
              Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Critical Risk Alerts</p>
                <p className="text-xs text-muted-foreground">Get notified when a team enters critical risk</p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Weekly Summary Email</p>
                <p className="text-xs text-muted-foreground">Receive weekly engagement summary</p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">New Feedback Alerts</p>
                <p className="text-xs text-muted-foreground">Alert when new themes are detected</p>
              </div>
              <Switch />
            </div>
          </CardContent>
        </Card>

        {/* Thresholds */}
        <Card className="shadow-card border">
          <CardHeader>
            <CardTitle className="text-lg font-display flex items-center gap-2">
              <Shield className="w-5 h-5 text-muted-foreground" />
              Risk Thresholds
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Critical Engagement Threshold</Label>
                <Input type="number" defaultValue={55} className="w-full" />
                <p className="text-xs text-muted-foreground">Teams below this score are flagged critical</p>
              </div>
              <div className="space-y-2">
                <Label>Warning Engagement Threshold</Label>
                <Input type="number" defaultValue={65} className="w-full" />
                <p className="text-xs text-muted-foreground">Teams below this score receive warnings</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data & Privacy */}
        <Card className="shadow-card border">
          <CardHeader>
            <CardTitle className="text-lg font-display flex items-center gap-2">
              <Database className="w-5 h-5 text-muted-foreground" />
              Data & Privacy
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Anonymise Feedback</p>
                <p className="text-xs text-muted-foreground">Remove identifying information from text feedback</p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Data Retention (months)</p>
                <p className="text-xs text-muted-foreground">How long to keep historical data</p>
              </div>
              <Input type="number" defaultValue={24} className="w-20" />
            </div>
          </CardContent>
        </Card>

        {/* Team Access */}
        <Card className="shadow-card border">
          <CardHeader>
            <CardTitle className="text-lg font-display flex items-center gap-2">
              <Users className="w-5 h-5 text-muted-foreground" />
              Team Access
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">Manage who can access the dashboard</p>
            <Button variant="outline">Manage Team Members</Button>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button variant="outline">Cancel</Button>
          <Button>Save Changes</Button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Settings;
