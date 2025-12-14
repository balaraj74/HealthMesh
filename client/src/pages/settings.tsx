import { useState } from "react";
import {
  Settings as SettingsIcon,
  Moon,
  Sun,
  Bell,
  Shield,
  Database,
  Key,
  Save,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTheme } from "@/components/theme-provider";
import { useToast } from "@/hooks/use-toast";

export default function Settings() {
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState({
    criticalAlerts: true,
    caseUpdates: true,
    agentCompletions: false,
  });

  const handleSave = () => {
    toast({
      title: "Settings saved",
      description: "Your preferences have been updated successfully.",
    });
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-semibold">Settings</h1>
        <p className="text-muted-foreground">Configure system preferences and integrations</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            {theme === "dark" ? (
              <Moon className="h-5 w-5 text-primary" />
            ) : (
              <Sun className="h-5 w-5 text-primary" />
            )}
            <div>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>Customize the visual appearance</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Theme</Label>
              <p className="text-sm text-muted-foreground">
                Select your preferred color theme
              </p>
            </div>
            <Select value={theme} onValueChange={(v: "light" | "dark" | "system") => setTheme(v)}>
              <SelectTrigger className="w-32" data-testid="select-theme">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Bell className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>Configure alert preferences</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Critical Alerts</Label>
              <p className="text-sm text-muted-foreground">
                Receive notifications for critical safety alerts
              </p>
            </div>
            <Switch
              checked={notifications.criticalAlerts}
              onCheckedChange={(v) => setNotifications(prev => ({ ...prev, criticalAlerts: v }))}
              data-testid="switch-critical-alerts"
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <Label>Case Updates</Label>
              <p className="text-sm text-muted-foreground">
                Notify when case status changes
              </p>
            </div>
            <Switch
              checked={notifications.caseUpdates}
              onCheckedChange={(v) => setNotifications(prev => ({ ...prev, caseUpdates: v }))}
              data-testid="switch-case-updates"
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <Label>Agent Completions</Label>
              <p className="text-sm text-muted-foreground">
                Notify when AI agents complete analysis
              </p>
            </div>
            <Switch
              checked={notifications.agentCompletions}
              onCheckedChange={(v) => setNotifications(prev => ({ ...prev, agentCompletions: v }))}
              data-testid="switch-agent-completions"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Key className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>API Configuration</CardTitle>
              <CardDescription>Configure AI service connections</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="openai-key">OpenAI API Key</Label>
            <Input
              id="openai-key"
              type="password"
              placeholder="sk-..."
              disabled
              value="••••••••••••••••"
              data-testid="input-openai-key"
            />
            <p className="text-xs text-muted-foreground">
              API key is configured via environment variables
            </p>
          </div>
          <Separator />
          <div className="space-y-2">
            <Label>AI Model</Label>
            <Select defaultValue="gpt-5">
              <SelectTrigger data-testid="select-ai-model">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gpt-5">GPT-5 (Recommended)</SelectItem>
                <SelectItem value="gpt-4o">GPT-4o</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Select the AI model for clinical analysis
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>Security & Compliance</CardTitle>
              <CardDescription>Healthcare compliance settings</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Audit Logging</Label>
              <p className="text-sm text-muted-foreground">
                Log all system actions for compliance
              </p>
            </div>
            <Switch checked={true} disabled data-testid="switch-audit-logging" />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <Label>Data Encryption</Label>
              <p className="text-sm text-muted-foreground">
                Encrypt all patient data at rest
              </p>
            </div>
            <Switch checked={true} disabled data-testid="switch-encryption" />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <Label>Session Timeout</Label>
              <p className="text-sm text-muted-foreground">
                Auto-logout after inactivity
              </p>
            </div>
            <Select defaultValue="30">
              <SelectTrigger className="w-32" data-testid="select-session-timeout">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15 minutes</SelectItem>
                <SelectItem value="30">30 minutes</SelectItem>
                <SelectItem value="60">1 hour</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Database className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>Data Management</CardTitle>
              <CardDescription>Storage and backup settings</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Storage Type</Label>
              <p className="text-sm text-muted-foreground">
                Current data storage configuration
              </p>
            </div>
            <span className="text-sm font-medium">In-Memory (Prototype)</span>
          </div>
          <Separator />
          <div className="p-3 rounded-md bg-yellow-500/10 border border-yellow-500/20">
            <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm font-medium">Prototype Mode</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Data is stored in memory and will be lost on restart. 
              Production deployments should use Azure Cosmos DB.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} data-testid="button-save-settings">
          <Save className="h-4 w-4 mr-2" />
          Save Changes
        </Button>
      </div>
    </div>
  );
}
