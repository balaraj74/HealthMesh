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
  User,
  Lock,
  Building,
  History,
  Smartphone,
  Mail,
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useTheme } from "@/components/theme-provider";
import { useToast } from "@/hooks/use-toast";
import { useMsal } from "@azure/msal-react";
import { Badge } from "@/components/ui/badge";

export default function Settings() {
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const { accounts } = useMsal();
  const account = accounts[0];

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
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Account & Settings</h1>
          <p className="text-xs text-muted-foreground mt-1">Manage your profile, security, and system preferences</p>
        </div>
        <Button onClick={handleSave} size="sm" className="h-8">
          <Save className="h-3.5 w-3.5 mr-2" />
          Save Changes
        </Button>
      </div>

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList>
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Security
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="system" className="flex items-center gap-2">
            <SettingsIcon className="h-4 w-4" />
            System
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="md:col-span-1">
              <CardHeader>
                <CardTitle className="text-base">Personal Information</CardTitle>
                <CardDescription>Your identity in the system</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-col items-center justify-center text-center p-4 border rounded-md bg-muted/10">
                  <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mb-3 text-primary">
                    <User className="h-10 w-10" />
                  </div>
                  <h3 className="font-semibold text-lg">{account?.name || "Dr. User"}</h3>
                  <p className="text-sm text-muted-foreground">{account?.username || "user@hospital.org"}</p>
                  <Badge variant="outline" className="mt-2">Clinician</Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Profile Details</CardTitle>
                <CardDescription>Update your contact information and role</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Full Name</Label>
                    <Input defaultValue={account?.name || "Dr. User"} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>Email Address</Label>
                    <Input defaultValue={account?.username || "user@hospital.org"} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label>Department</Label>
                    <Input defaultValue="Cardiology" />
                  </div>
                  <div className="space-y-2">
                    <Label>Role</Label>
                    <Input defaultValue="Senior Cardiologist" />
                  </div>
                  <div className="space-y-2">
                    <Label>License Number</Label>
                    <Input defaultValue="MD-12345-678" />
                  </div>
                  <div className="space-y-2">
                    <Label>Pager / Phone</Label>
                    <Input defaultValue="+1 (555) 000-0000" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Authentication</CardTitle>
                <CardDescription>Manage your sign-in methods</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 border rounded-md">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded bg-blue-500/10 flex items-center justify-center text-blue-600">
                      <Lock className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Single Sign-On (SSO)</p>
                      <p className="text-xs text-muted-foreground">Microsoft Entra ID</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-green-600 bg-green-500/10">Active</Badge>
                </div>

                <div className="flex items-center justify-between p-3 border rounded-md">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded bg-purple-500/10 flex items-center justify-center text-purple-600">
                      <Smartphone className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Multi-Factor Auth</p>
                      <p className="text-xs text-muted-foreground">Authenticator App</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-green-600 bg-green-500/10">Enabled</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Session History</CardTitle>
                <CardDescription>Recent activity on your account</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-start justify-between pb-4 border-b last:border-0 last:pb-0">
                      <div className="flex items-start gap-3">
                        <History className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">Login from Chrome (Windows)</p>
                          <p className="text-xs text-muted-foreground">IP: 10.0.0.{i} • {i === 1 ? "Current Session" : `${i} hours ago`}</p>
                        </div>
                      </div>
                      {i === 1 && <Badge variant="outline" className="text-[10px]">Active</Badge>}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Notification Preferences</CardTitle>
              <CardDescription>Manage how you receive alerts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Critical Alerts</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive immediate notifications for high-risk patient events
                  </p>
                </div>
                <Switch
                  checked={notifications.criticalAlerts}
                  onCheckedChange={(v) => setNotifications(prev => ({ ...prev, criticalAlerts: v }))}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Case Updates</Label>
                  <p className="text-sm text-muted-foreground">
                    Notify when a case status changes or new results are available
                  </p>
                </div>
                <Switch
                  checked={notifications.caseUpdates}
                  onCheckedChange={(v) => setNotifications(prev => ({ ...prev, caseUpdates: v }))}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Agent Completions</Label>
                  <p className="text-sm text-muted-foreground">
                    Notify when AI agents finish their analysis tasks
                  </p>
                </div>
                <Switch
                  checked={notifications.agentCompletions}
                  onCheckedChange={(v) => setNotifications(prev => ({ ...prev, agentCompletions: v }))}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Appearance</CardTitle>
              <CardDescription>Customize the application theme</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {theme === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                <span className="text-sm font-medium">Theme Mode</span>
              </div>
              <Select value={theme} onValueChange={(v: "light" | "dark" | "system") => setTheme(v)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tenant Information</CardTitle>
              <CardDescription>Organization details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Organization Name</Label>
                  <Input defaultValue="General Hospital" disabled />
                </div>
                <div className="space-y-2">
                  <Label>Tenant ID</Label>
                  <Input defaultValue="56bb-..." disabled />
                </div>
                <div className="space-y-2">
                  <Label>Subscription Plan</Label>
                  <Input defaultValue="Enterprise Health" disabled />
                </div>
                <div className="space-y-2">
                  <Label>Region</Label>
                  <Input defaultValue="US East (Virginia)" disabled />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
