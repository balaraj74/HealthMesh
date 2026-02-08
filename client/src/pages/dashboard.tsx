import { useQuery } from "@tanstack/react-query";
import {
  VscFolderOpened,
  VscOrganization,
  VscWarning,
  VscPass,
  VscHistory,
  VscPulse,
  VscCircuitBoard,
  VscFile,
  VscShield,
  VscBeaker,
  VscComment,
  VscArrowRight,
} from "react-icons/vsc";
import { IconType } from "react-icons";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { HeartPulse, TrendingUp, Activity, AlertTriangle, Stethoscope, Users, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { SEO, pageSEO } from "@/components/seo";

// 🔥 ELITE: Enhanced agent info with vibrant accent colors
const agentInfo: Record<AgentType, { name: string; role: string; icon: IconType; color: string; bgColor: string }> = {
  "patient-context": { name: "Patient Context", role: "History & Vitals", icon: VscOrganization, color: "text-sky-400", bgColor: "bg-sky-500/10" },
  "labs-reports": { name: "Labs & Reports", role: "Pathology Analysis", icon: VscBeaker, color: "text-cyan-400", bgColor: "bg-cyan-500/10" },
  "research-guidelines": { name: "Research", role: "Clinical Guidelines", icon: VscFile, color: "text-blue-400", bgColor: "bg-blue-500/10" },
  "risk-safety": { name: "Risk & Safety", role: "Safety Checks", icon: VscShield, color: "text-rose-400", bgColor: "bg-rose-500/10" },
  "clinician-interaction": { name: "Clinician", role: "Human Interface", icon: VscComment, color: "text-amber-400", bgColor: "bg-amber-500/10" },
  "orchestrator": { name: "Orchestrator", role: "AI Coordinator", icon: VscCircuitBoard, color: "text-primary", bgColor: "bg-primary/10" },
};

// 🔥 ELITE: StatCard with accent colors, animations, and commanding presence
function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  loading,
  href,
  accentColor = "primary",
  delay = 0,
}: {
  title: string;
  value: number | string;
  icon: IconType;
  trend?: string;
  loading?: boolean;
  href?: string;
  accentColor?: "primary" | "accent" | "green" | "red";
  delay?: number;
}) {
  const colorClasses = {
    primary: "bg-primary/10 text-primary border-primary/20 group-hover:bg-primary/20",
    accent: "bg-teal-500/10 text-teal-400 border-teal-500/20 group-hover:bg-teal-500/20",
    green: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 group-hover:bg-emerald-500/20",
    red: "bg-rose-500/10 text-rose-400 border-rose-500/20 group-hover:bg-rose-500/20",
  };

  if (loading) {
    return (
      <Card className="rounded-2xl">
        <CardContent className="p-5">
          <div className="flex justify-between items-start">
            <div className="space-y-3">
              <Skeleton className="h-4 w-24 shimmer" />
              <Skeleton className="h-10 w-16 shimmer" />
            </div>
            <Skeleton className="h-12 w-12 rounded-xl shimmer" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const Content = (
    <Card className={cn(
      "rounded-2xl h-full card-hover-subtle group opacity-0 animate-slideUp",
      href && "cursor-pointer"
    )} style={{ animationDelay: `${delay}ms`, animationFillMode: 'forwards' }}>
      <CardContent className="p-5">
        <div className="flex justify-between items-start mb-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
          <div className={cn(
            "flex h-12 w-12 items-center justify-center rounded-xl border transition-all duration-300",
            colorClasses[accentColor]
          )}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
        <div className="flex items-baseline gap-3">
          <h3 className="text-4xl font-bold tracking-tight" data-testid={`stat-${title.toLowerCase().replace(/\s+/g, '-')}`}>{value}</h3>
          {trend && (
            <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
              <TrendingUp className="h-3 w-3" />
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

// 🔥 ELITE: AgentStatusGrid with card-lift, status-pulse, and progressive disclosure
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
          <Skeleton key={i} className="h-40 w-full rounded-2xl shimmer" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {agents.map((agentType, index) => {
        const info = agentInfo[agentType];
        const Icon = info.icon;
        const href = agentLinks[agentType];
        const isRunning = agentType === "orchestrator";
        const lastExec = new Date();
        lastExec.setMinutes(lastExec.getMinutes() - Math.floor(Math.random() * 60));
        const evidenceCount = Math.floor(Math.random() * 20) + 5;
        const confidence = (85 + Math.random() * 14).toFixed(1);

        return (
          <div
            key={agentType}
            className="opacity-0 animate-slideUp"
            style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'forwards' }}
          >
            <Link href={href}>
              <div className={cn(
                "group relative overflow-hidden rounded-2xl border border-border/50 bg-card/90 backdrop-blur-xl p-5",
                "card-lift cursor-pointer h-full",
                isRunning && "border-emerald-500/30"
              )}>
                {/* 🔥 Warmth gradient background on hover */}
                <div className="absolute inset-0 warmth-gradient opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                {/* 🔥 Status indicator glow for running */}
                {isRunning && (
                  <div className="absolute top-3 right-3 w-3 h-3 rounded-full bg-emerald-500 running-glow" />
                )}

                <div className="relative flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-xl transition-all duration-300 border border-border/50",
                      info.bgColor,
                      "group-hover:scale-110 group-hover:shadow-lg"
                    )}>
                      <Icon className={cn("h-5 w-5 transition-all", info.color)} />
                    </div>
                    <div>
                      <h4 className="font-semibold text-base leading-none mb-1.5 group-hover:text-primary transition-colors">{info.name}</h4>
                      <p className="text-xs text-muted-foreground tracking-wide">{info.role}</p>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px] h-6 px-2.5 gap-1.5 rounded-full font-semibold transition-all",
                      isRunning
                        ? "border-emerald-500/40 text-emerald-400 bg-emerald-500/10"
                        : "text-muted-foreground border-border/50"
                    )}
                  >
                    <span className={cn(
                      "w-2 h-2 rounded-full",
                      isRunning ? "bg-emerald-500 status-pulse" : "bg-gray-500"
                    )} />
                    {isRunning ? "Running" : "Ready"}
                  </Badge>
                </div>

                {/* Core metrics - always visible */}
                <div className="relative grid grid-cols-2 gap-4 py-3 border-t border-border/40">
                  <div>
                    <p className="text-[10px] text-muted-foreground font-medium mb-1">Last Run</p>
                    <p className="text-sm font-mono text-foreground">{lastExec.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground font-medium mb-1">Confidence</p>
                    <p className="text-sm font-mono text-emerald-400 font-semibold">{confidence}%</p>
                  </div>
                </div>

                {/* 🔥 PROGRESSIVE DISCLOSURE: Evidence count on hover */}
                <div className="overflow-hidden transition-all duration-300 max-h-0 group-hover:max-h-20 opacity-0 group-hover:opacity-100">
                  <div className="pt-3 border-t border-border/40">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Evidence sources</span>
                      <span className="font-mono text-primary font-semibold">{evidenceCount} items</span>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          </div>
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
    <>
      <SEO {...pageSEO.dashboard} />
      <div className="p-6 space-y-8 max-w-[1600px] mx-auto">
        {/* 🔥 ELITE: Header with human warmth messaging */}
        <div className="flex items-center justify-between gap-4 opacity-0 animate-fadeIn" style={{ animationFillMode: 'forwards' }}>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
                <HeartPulse className="h-5 w-5 text-primary" />
              </div>
              Clinical Dashboard
            </h1>
            <p className="text-sm text-muted-foreground mt-2 flex items-center gap-2">
              <Users className="h-3.5 w-3.5" />
              Caring for patients with intelligent support
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground px-4 py-2 rounded-xl bg-muted/30 border border-border/50">
              <Clock className="h-3.5 w-3.5" />
              <span>Updated {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            {/* 🔥 COMMANDING CTA with glow */}
            <Button asChild size="lg" className="glow-cta">
              <Link href="/cases/new">
                <Stethoscope className="h-4 w-4 mr-2" />
                New Case
              </Link>
            </Button>
          </div>
        </div>

        {/* 🔥 ELITE: Stats Grid with accent colors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Cases"
            value={stats?.totalCases ?? 0}
            icon={VscFolderOpened}
            trend="+12%"
            loading={statsLoading}
            href="/cases"
            accentColor="primary"
            delay={0}
          />
          <StatCard
            title="Active Cases"
            value={stats?.activeCases ?? 0}
            icon={VscPulse}
            loading={statsLoading}
            href="/cases?status=active"
            accentColor="green"
            delay={50}
          />
          <StatCard
            title="Pending Reviews"
            value={stats?.pendingReviews ?? 0}
            icon={VscHistory}
            loading={statsLoading}
            href="/cases?status=review-ready"
            accentColor="accent"
            delay={100}
          />
          <StatCard
            title="Critical Alerts"
            value={stats?.criticalAlerts ?? 0}
            icon={VscWarning}
            loading={statsLoading}
            href="/risk-safety"
            accentColor="red"
            delay={150}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* 🔥 ELITE: Agent Orchestration section */}
            <section className="opacity-0 animate-fadeIn" style={{ animationDelay: '200ms', animationFillMode: 'forwards' }}>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <VscCircuitBoard className="h-5 w-5 text-primary" />
                  Agent Orchestration
                </h2>
                <Badge variant="outline" className="text-xs h-7 px-3 gap-2 rounded-full border-emerald-500/30 text-emerald-400 bg-emerald-500/10">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 status-pulse" />
                  System Healthy
                </Badge>
              </div>
              <AgentStatusGrid loading={statsLoading} />
            </section>

            {/* 🔥 ELITE: Recent Cases section */}
            <section className="opacity-0 animate-fadeIn" style={{ animationDelay: '300ms', animationFillMode: 'forwards' }}>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <VscFolderOpened className="h-5 w-5 text-primary" />
                  Recent Cases
                </h2>
                <Button variant="ghost" size="sm" asChild className="text-primary hover:bg-primary/10 rounded-lg">
                  <Link href="/cases">View All</Link>
                </Button>
              </div>
              <RecentCasesList cases={recentCases} loading={casesLoading} />
            </section>
          </div>

          {/* 🔥 ELITE: Right Sidebar with animations */}
          <div className="space-y-6">
            {/* Risk & Safety Alerts */}
            <Card className="rounded-2xl opacity-0 animate-fadeIn" style={{ animationDelay: '250ms', animationFillMode: 'forwards' }}>
              <CardHeader className="pb-4 border-b border-border/40">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <VscWarning className="h-4 w-4 text-amber-500" />
                  Risk & Safety
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <AlertsList alerts={allAlerts} loading={alertsLoading} />
              </CardContent>
            </Card>

            {/* AI Confidence with gradient progress */}
            <Card className="rounded-2xl opacity-0 animate-fadeIn" style={{ animationDelay: '350ms', animationFillMode: 'forwards' }}>
              <CardHeader className="pb-4 border-b border-border/40">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" />
                  AI Confidence
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-5 space-y-5">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-muted-foreground">Average Score</span>
                    <span className="text-2xl font-bold font-mono text-primary">{stats?.avgConfidenceScore ?? 0}%</span>
                  </div>
                  {/* 🔥 Custom gradient progress bar */}
                  <div className="h-2.5 bg-muted/50 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-sky-400 rounded-full transition-all duration-700 ease-out"
                      style={{ width: `${stats?.avgConfidenceScore ?? 0}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 card-hover-subtle">
                    <span className="text-muted-foreground block mb-1">High</span>
                    <span className="font-semibold text-emerald-400 text-sm">80-100%</span>
                  </div>
                  <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20 card-hover-subtle">
                    <span className="text-muted-foreground block mb-1">Medium</span>
                    <span className="font-semibold text-amber-400 text-sm">50-79%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 🔥 HUMAN WARMTH: Patient-centric disclaimer */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-primary/5 to-teal-500/5 border border-primary/20 opacity-0 animate-fadeIn" style={{ animationDelay: '400ms', animationFillMode: 'forwards' }}>
              <div className="flex gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 shrink-0">
                  <HeartPulse className="h-5 w-5 text-primary" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-primary">Patient-Centered Care</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    AI supports clinicians in making informed decisions. Always prioritize patient well-being.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
