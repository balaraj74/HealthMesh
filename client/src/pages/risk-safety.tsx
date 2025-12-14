import { useQuery } from "@tanstack/react-query";
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  Pill,
  Heart,
  Activity,
  Info,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import type { RiskAlert, ClinicalCase } from "@shared/schema";

const alertTypeInfo: Record<string, { label: string; icon: typeof Pill; description: string }> = {
  "drug-interaction": {
    label: "Drug-Drug Interaction",
    icon: Pill,
    description: "Potential interactions between medications"
  },
  "contraindication": {
    label: "Contraindication",
    icon: AlertTriangle,
    description: "Treatment not recommended due to patient factors"
  },
  "dosage": {
    label: "Dosage Concern",
    icon: Activity,
    description: "Dosage outside recommended range"
  },
  "allergy": {
    label: "Allergy Alert",
    icon: AlertTriangle,
    description: "Patient has documented allergy"
  },
  "comorbidity": {
    label: "Comorbidity Risk",
    icon: Heart,
    description: "Risk related to existing conditions"
  },
  "critical-value": {
    label: "Critical Lab Value",
    icon: Activity,
    description: "Lab result requires immediate attention"
  },
};

function RiskAlertCard({ alert }: { alert: RiskAlert }) {
  const typeInfo = alertTypeInfo[alert.type] || {
    label: alert.type,
    icon: AlertTriangle,
    description: "Safety concern"
  };
  const TypeIcon = typeInfo.icon;

  const severityStyles = {
    info: {
      border: "border-l-blue-500",
      bg: "bg-blue-500/5",
      icon: "text-blue-500",
      badge: "bg-blue-500/10 text-blue-700 dark:text-blue-300"
    },
    warning: {
      border: "border-l-yellow-500",
      bg: "bg-yellow-500/5",
      icon: "text-yellow-500",
      badge: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300"
    },
    critical: {
      border: "border-l-destructive",
      bg: "bg-destructive/5",
      icon: "text-destructive",
      badge: "bg-destructive/10 text-destructive"
    },
  };

  const styles = severityStyles[alert.severity];

  return (
    <Card className={`border-l-4 ${styles.border} ${styles.bg}`} data-testid={`card-risk-alert-${alert.id}`}>
      <CardContent className="py-4">
        <div className="flex items-start gap-4">
          <div className={`flex h-10 w-10 items-center justify-center rounded-md bg-background flex-shrink-0`}>
            <TypeIcon className={`h-5 w-5 ${styles.icon}`} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <h3 className="font-medium">{alert.title}</h3>
              <Badge className={styles.badge}>{alert.severity}</Badge>
              <Badge variant="outline" className="text-xs">{typeInfo.label}</Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-3">{alert.description}</p>
            {alert.recommendation && (
              <div className="bg-background rounded-md p-3">
                <p className="text-xs font-medium mb-1">Recommended Action</p>
                <p className="text-sm">{alert.recommendation}</p>
              </div>
            )}
            <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
              <span>Source: {alert.source}</span>
              <span>{new Date(alert.createdAt).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RiskTypeSummary({ alerts }: { alerts: RiskAlert[] }) {
  const typeCounts = alerts.reduce((acc, alert) => {
    acc[alert.type] = (acc[alert.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {Object.entries(alertTypeInfo).map(([type, info]) => {
        const Icon = info.icon;
        const count = typeCounts[type] || 0;
        return (
          <Card key={type}>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{count}</p>
                  <p className="text-xs text-muted-foreground">{info.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export default function RiskSafety() {
  const { data: cases, isLoading: casesLoading } = useQuery<ClinicalCase[]>({
    queryKey: ["/api/cases"],
  });

  const allAlerts = cases?.flatMap(c => c.riskAlerts) ?? [];
  const criticalAlerts = allAlerts.filter(a => a.severity === "critical");
  const warningAlerts = allAlerts.filter(a => a.severity === "warning");
  const infoAlerts = allAlerts.filter(a => a.severity === "info");

  const safetyScore = allAlerts.length === 0 ? 100 : 
    Math.max(0, 100 - (criticalAlerts.length * 20) - (warningAlerts.length * 5));

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Risk & Safety</h1>
        <p className="text-muted-foreground">Drug interactions, contraindications, and safety alerts</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-md bg-destructive/10">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">{criticalAlerts.length}</p>
                <p className="text-sm text-muted-foreground">Critical Alerts</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-md bg-yellow-500/10">
                <AlertTriangle className="h-6 w-6 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{warningAlerts.length}</p>
                <p className="text-sm text-muted-foreground">Warnings</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-md bg-blue-500/10">
                <Info className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{infoAlerts.length}</p>
                <p className="text-sm text-muted-foreground">Informational</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-md bg-green-500/10">
                <Shield className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{safetyScore}%</p>
                <p className="text-sm text-muted-foreground">Safety Score</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Safety Overview</CardTitle>
          <CardDescription>
            Aggregate view of all safety concerns across active cases
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Overall Safety Score</span>
              <span className={`text-sm font-bold ${
                safetyScore >= 80 ? "text-green-500" :
                safetyScore >= 50 ? "text-yellow-500" : "text-destructive"
              }`}>{safetyScore}%</span>
            </div>
            <Progress
              value={safetyScore}
              className={`h-3 ${
                safetyScore >= 80 ? "[&>div]:bg-green-500" :
                safetyScore >= 50 ? "[&>div]:bg-yellow-500" : "[&>div]:bg-destructive"
              }`}
            />
            <p className="text-xs text-muted-foreground mt-2">
              Based on severity and count of active safety alerts
            </p>
          </div>

          <Separator />

          <div>
            <h4 className="text-sm font-medium mb-4">Alert Distribution by Type</h4>
            <RiskTypeSummary alerts={allAlerts} />
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-xl font-semibold mb-4">Active Safety Alerts</h2>
        {casesLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        ) : allAlerts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Active Safety Alerts</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                All cases are clear of safety concerns. The Risk & Safety Agent 
                continuously monitors for drug interactions, contraindications, 
                and other potential risks.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {criticalAlerts.map((alert) => (
              <RiskAlertCard key={alert.id} alert={alert} />
            ))}
            {warningAlerts.map((alert) => (
              <RiskAlertCard key={alert.id} alert={alert} />
            ))}
            {infoAlerts.map((alert) => (
              <RiskAlertCard key={alert.id} alert={alert} />
            ))}
          </div>
        )}
      </div>

      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium">Risk & Safety Agent</p>
              <p className="text-xs text-muted-foreground">
                This agent automatically screens for drug-drug interactions using 
                clinical databases, checks contraindications based on patient history, 
                verifies dosage limits, and flags age/pregnancy/comorbidity risks. 
                All alerts should be reviewed by qualified clinical staff.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
