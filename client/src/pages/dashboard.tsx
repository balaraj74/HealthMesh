import { useQuery } from "@tanstack/react-query";
import {
  VscFolderOpened,
  VscOrganization,
  VscWarning,
  VscPass,
  VscHistory,
  VscGraph,
  VscPulse,
  VscCircuitBoard,
  VscFile,
  VscShield,
  VscBeaker,
  VscComment,
  VscArrowRight,
} from "react-icons/vsc";
import { IconType } from "react-icons";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import type { DashboardStats, ClinicalCase, RiskAlert, AgentType } from "@shared/schema";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const agentInfo: Record<AgentType, { name: string; role: string; icon: IconType; color: string }> = {
  "patient-context": { name: "Patient Context", role: "History & Vitals Analysis", icon: VscOrganization, color: "text-blue-600" },
  "labs-reports": { name: "Labs & Reports", role: "Pathology & Imaging", icon: VscBeaker, color: "text-teal-600" },
  "research-guidelines": { name: "Research", role: "Guidelines & Protocols", icon: VscFile, color: "text-purple-600" },
  "risk-safety": { name: "Risk & Safety", role: "Contraindications Check", icon: VscShield, color: "text-red-600" },
  "clinician-interaction": { name: "Clinician", role: "Interaction Interface", icon: VscComment, color: "text-orange-600" },
  "orchestrator": { name: "Orchestrator", role: "Workflow Management", icon: VscCircuitBoard, color: "text-primary" },
};

function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  loading,
  href,
}: {
  title: string;
  value: number | string;
  icon: IconType;
  trend?: string;
  loading?: boolean;
  href?: string;
}) {
  if (loading) {
    return (
      <Card className="rounded-sm shadow-sm border-border/50">
        <CardContent className="p-4">
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-12" />
            </div>
            <Skeleton className="h-8 w-8 rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const Content = (
    <Card className={`rounded-md shadow-sm border-border/50 h-full transition-all duration-200 ${href ? "hover:border-primary/50 hover:bg-muted/10 cursor-pointer" : ""}`}>
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-3">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="flex items-baseline gap-3">
          <h3 className="text-4xl font-bold tracking-tight" data-testid={`stat-${title.toLowerCase().replace(/\s+/g, '-')}`}>{value}</h3>
          {trend && (
            <span className="text-sm font-medium text-green-600 flex items-center gap-0.5">
              <VscGraph className="h-4 w-4" />
              {trend}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (href) {
    return <Link href={href}>{Content}</Link>;
  }

  return Content;
}

function AgentStatusGrid({ loading }: { loading?: boolean }) {
  const agents: AgentType[] = [
    "orchestrator",
    "patient-context",
    "labs-reports",
    "research-guidelines",
    "risk-safety",
    "clinician-interaction",
  ];

  const agentLinks: Record<AgentType, string> = {
    "orchestrator": "/orchestrator",
    "patient-context": "/patients",
    "labs-reports": "/labs",
    "research-guidelines": "/cases",
    "risk-safety": "/risk-safety",
    "clinician-interaction": "/chat",
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {agents.map((_, i) => (
          <Skeleton key={i} className="h-32 w-full rounded-sm" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {agents.map((agentType) => {
        const info = agentInfo[agentType];
        const Icon = info.icon;
        const href = agentLinks[agentType];

        // Mock operational data
        const isRunning = agentType === "orchestrator";
        const lastExec = new Date();
        lastExec.setMinutes(lastExec.getMinutes() - Math.floor(Math.random() * 60));

        return (
          <Link key={agentType} href={href}>
            <div className="group relative overflow-hidden rounded-md border border-border/50 bg-card p-5 hover:border-primary/50 hover:shadow-md transition-all duration-200 cursor-pointer h-full">
              <div className="flex items-start justify-between mb-5">
                <div className="flex items-center gap-4">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-md bg-muted/50 group-hover:bg-primary/10 transition-colors`}>
                    <Icon className={`h-5 w-5 ${info.color}`} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-base leading-none mb-1.5">{info.name}</h4>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">{info.role}</p>
                  </div>
                </div>
                <Badge variant="outline" className={`text-xs h-6 px-2 gap-1.5 ${isRunning ? "border-green-500/30 text-green-600 bg-green-500/5" : "text-muted-foreground"}`}>
                  <span className={`w-2 h-2 rounded-full ${isRunning ? "bg-green-500 animate-pulse" : "bg-gray-400"}`} />
                  {isRunning ? "Running" : "Ready"}
                </Badge>
              </div>

              <div className="grid grid-cols-3 gap-4 py-3 border-t border-border/40">
                <div>
                  <p className="text-xs text-muted-foreground font-medium mb-1">Last Run</p>
                  <p className="text-sm font-mono">{lastExec.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium mb-1">Evidence</p>
                  <p className="text-sm font-mono">{Math.floor(Math.random() * 20) + 5}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium mb-1">Confidence</p>
                  <p className="text-sm font-mono text-green-600 font-semibold">{(85 + Math.random() * 14).toFixed(1)}%</p>
                </div>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

function RecentCasesList({ cases, loading }: { cases?: ClinicalCase[]; loading?: boolean }) {
  if (loading) {
    return <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>;
  }

  if (!cases || cases.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center border rounded-sm border-dashed">
        <VscFolderOpened className="h-8 w-8 text-muted-foreground/50 mb-2" />
        <p className="text-sm text-muted-foreground">No active cases found</p>
        <Button asChild variant="ghost" className="mt-2 h-auto p-0 text-primary hover:bg-transparent hover:underline">
          <Link href="/cases/new">Initialize New Case</Link>
        </Button>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    draft: "bg-gray-500",
    submitted: "bg-blue-500",
    analyzing: "bg-yellow-500",
    "review-ready": "bg-green-500",
    reviewed: "bg-purple-500",
    closed: "bg-gray-400",
  };

  return (
    <div className="rounded-sm border border-border/50 overflow-hidden">
      <Table>
        <TableHeader className="bg-muted/30">
          <TableRow className="hover:bg-transparent border-b border-border/60">
            <TableHead className="h-11 text-sm font-semibold uppercase tracking-wider w-[120px] pl-4">Case ID</TableHead>
            <TableHead className="h-11 text-sm font-semibold uppercase tracking-wider">Type</TableHead>
            <TableHead className="h-11 text-sm font-semibold uppercase tracking-wider">Status</TableHead>
            <TableHead className="h-11 text-sm font-semibold uppercase tracking-wider text-right pr-4">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(cases || []).slice(0, 5).map((caseItem) => (
            <TableRow key={caseItem.id} className="hover:bg-muted/30 border-b border-border/40 h-14">
              <TableCell className="font-mono text-sm text-primary font-medium pl-4">
                <Link href={`/cases/${caseItem.id}`} className="hover:underline">
                  #{caseItem.id.slice(0, 8)}
                </Link>
              </TableCell>
              <TableCell className="text-sm font-medium capitalize">{caseItem.caseType.replace("-", " ")}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${statusColors[caseItem.status]}`} />
                  <span className="text-sm capitalize">{caseItem.status.replace("-", " ")}</span>
                </div>
              </TableCell>
              <TableCell className="text-right pr-4">
                <Button asChild variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary">
                  <Link href={`/cases/${caseItem.id}`}>
                    <VscArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function AlertsList({ alerts, loading }: { alerts?: RiskAlert[]; loading?: boolean }) {
  if (loading) {
    return <div className="space-y-2">{[1, 2].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>;
  }

  if (!alerts || alerts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center border rounded-md border-dashed bg-muted/5">
        <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center mb-3">
          <VscPass className="h-6 w-6 text-green-600" />
        </div>
        <p className="text-base font-medium text-foreground">No active safety alerts</p>
        <p className="text-sm text-muted-foreground mt-1">System is running within normal safety parameters</p>
      </div>
    );
  }

  const severityStyles = {
    info: "border-l-blue-500 bg-blue-500/5",
    warning: "border-l-yellow-500 bg-yellow-500/5",
    critical: "border-l-destructive bg-destructive/5",
  };

  return (
    <div className="space-y-3">
      {(alerts || []).slice(0, 5).map((alert) => (
        <Link key={alert.id} href="/risk-safety">
          <div
            className={`p-4 rounded-md border border-border/50 border-l-4 ${severityStyles[alert.severity]} hover:bg-muted/30 transition-colors cursor-pointer`}
          >
            <div className="flex items-start gap-3">
              <VscWarning className={`h-4 w-4 mt-0.5 shrink-0 ${alert.severity === "critical" ? "text-destructive" :
                alert.severity === "warning" ? "text-yellow-500" : "text-blue-500"
                }`} />
              <div>
                <p className="text-sm font-semibold leading-none mb-1.5">{alert.title}</p>
                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{alert.description}</p>
              </div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery<{ success: boolean; data: DashboardStats }, Error, DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
    select: (response) => response.data,
    refetchInterval: 15000, // Refresh stats every 15 seconds
  });

  const { data: recentCases = [], isLoading: casesLoading } = useQuery<ClinicalCase[]>({
    queryKey: ["/api/cases"],
    queryFn: async (): Promise<ClinicalCase[]> => {
      const response = await apiRequest("GET", "/api/cases");
      const data: { success: boolean; data: ClinicalCase[] } = await response.json();
      return Array.isArray(data.data) ? data.data : [];
    },
    refetchInterval: 10000, // Refresh every 10 seconds for real-time updates
  });

  // Extract alerts from cases' aiAnalysis data (since they're stored there, not separately)
  // Use Array.isArray check to handle undefined/non-array cases on initial load
  const casesList = Array.isArray(recentCases) ? recentCases : [];
  const allAlerts: RiskAlert[] = casesList.flatMap((c: any) => {
    const savedAlerts = c?.aiAnalysis?.riskAlerts ?? [];
    return savedAlerts.filter((a: any): a is RiskAlert =>
      a != null && typeof a === 'object' && 'severity' in a && 'id' in a
    );
  });

  const alertsLoading = casesLoading; // Alerts loading tied to cases loading

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Clinical Dashboard</h1>
          <p className="text-xs text-muted-foreground mt-1">Overview of active cases and system status</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground mr-2">Last updated: {new Date().toLocaleTimeString()}</span>
          <Button asChild size="sm" className="h-9 px-4 text-sm">
            <Link href="/cases/new">
              <VscFolderOpened className="h-4 w-4 mr-2" />
              New Case
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Cases"
          value={stats?.totalCases ?? 0}
          icon={VscFolderOpened}
          trend="+12%"
          loading={statsLoading}
          href="/cases"
        />
        <StatCard
          title="Active Cases"
          value={stats?.activeCases ?? 0}
          icon={VscPulse}
          loading={statsLoading}
          href="/cases?status=active"
        />
        <StatCard
          title="Pending Reviews"
          value={stats?.pendingReviews ?? 0}
          icon={VscHistory}
          loading={statsLoading}
          href="/cases?status=review-ready"
        />
        <StatCard
          title="Critical Alerts"
          value={stats?.criticalAlerts ?? 0}
          icon={VscWarning}
          loading={statsLoading}
          href="/risk-safety"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Agent Orchestration</h2>
              <Badge variant="outline" className="text-xs h-6 px-2 bg-background">
                <span className="w-2 h-2 rounded-full bg-green-500 mr-1.5" />
                System Healthy
              </Badge>
            </div>
            <AgentStatusGrid loading={statsLoading} />
          </section>

          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Recent Cases</h2>
              <Button variant="ghost" size="sm" asChild className="h-auto p-0 text-sm hover:bg-transparent hover:underline text-primary font-medium">
                <Link href="/cases">View All Cases</Link>
              </Button>
            </div>
            <RecentCasesList cases={recentCases} loading={casesLoading} />
          </section>
        </div>

        <div className="space-y-6">
          <Card className="rounded-sm shadow-sm border-border/50">
            <CardHeader className="pb-3 border-b border-border/40">
              <CardTitle className="text-sm font-semibold">Risk & Safety Alerts</CardTitle>
            </CardHeader>
            <CardContent className="pt-3">
              <AlertsList alerts={allAlerts} loading={alertsLoading} />
            </CardContent>
          </Card>

          <Card className="rounded-sm shadow-sm border-border/50">
            <CardHeader className="pb-3 border-b border-border/40">
              <CardTitle className="text-sm font-semibold">AI Confidence Metrics</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">Average Confidence</span>
                  <span className="text-sm font-mono font-medium">{stats?.avgConfidenceScore ?? 0}%</span>
                </div>
                <Progress value={stats?.avgConfidenceScore ?? 0} className="h-1.5" />
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 bg-muted/30 rounded border border-border/50">
                  <span className="text-muted-foreground block mb-1">High Confidence</span>
                  <span className="font-semibold text-green-600">80-100%</span>
                </div>
                <div className="p-2 bg-muted/30 rounded border border-border/50">
                  <span className="text-muted-foreground block mb-1">Med Confidence</span>
                  <span className="font-semibold text-yellow-600">50-79%</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="p-3 rounded-sm bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30">
            <div className="flex gap-2">
              <VscWarning className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">Clinical Decision Support</p>
                <p className="text-[10px] text-blue-600/80 dark:text-blue-400/80 leading-relaxed">
                  AI outputs are for decision support only. Verify all recommendations against clinical protocols.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
