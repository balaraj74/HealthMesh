import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ClipboardList,
  Search,
  Filter,
  Download,
  Eye,
  Calendar,
  User,
  Activity,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { AuditLog } from "@shared/schema";

const actionLabels: Record<string, { label: string; color: string }> = {
  "case-created": { label: "Case Created", color: "bg-blue-500" },
  "case-updated": { label: "Case Updated", color: "bg-blue-400" },
  "case-analyzed": { label: "Case Analyzed", color: "bg-purple-500" },
  "patient-created": { label: "Patient Created", color: "bg-green-500" },
  "patient-updated": { label: "Patient Updated", color: "bg-green-400" },
  "lab-uploaded": { label: "Lab Uploaded", color: "bg-yellow-500" },
  "lab-processed": { label: "Lab Processed", color: "bg-yellow-400" },
  "agent-invoked": { label: "Agent Invoked", color: "bg-orange-500" },
  "agent-completed": { label: "Agent Completed", color: "bg-orange-400" },
  "recommendation-generated": { label: "Recommendation Generated", color: "bg-indigo-500" },
  "recommendation-reviewed": { label: "Recommendation Reviewed", color: "bg-indigo-400" },
  "clinician-feedback": { label: "Clinician Feedback", color: "bg-pink-500" },
  "data-accessed": { label: "Data Accessed", color: "bg-gray-500" },
};

function AuditLogSkeleton() {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Timestamp</TableHead>
          <TableHead>Action</TableHead>
          <TableHead>Entity</TableHead>
          <TableHead>User</TableHead>
          <TableHead className="w-12"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {[1, 2, 3, 4, 5].map((i) => (
          <TableRow key={i}>
            <TableCell><Skeleton className="h-4 w-32" /></TableCell>
            <TableCell><Skeleton className="h-6 w-28" /></TableCell>
            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
            <TableCell><Skeleton className="h-4 w-20" /></TableCell>
            <TableCell><Skeleton className="h-8 w-8" /></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function LogDetailDialog({ log }: { log: AuditLog }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" data-testid={`button-view-log-${log.id}`}>
          <Eye className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Audit Log Details</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Timestamp</p>
              <p className="font-mono text-sm">
                {new Date(log.timestamp).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Action</p>
              <Badge variant="secondary">
                {actionLabels[log.action]?.label || log.action}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Entity Type</p>
              <p className="capitalize">{log.entityType}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Entity ID</p>
              <p className="font-mono text-sm">{log.entityId}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">User</p>
              <p>{log.userId || "System"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">IP Address</p>
              <p className="font-mono text-sm">{log.ipAddress || "N/A"}</p>
            </div>
          </div>
          
          {log.details && (
            <div>
              <p className="text-sm text-muted-foreground mb-2">Details</p>
              <ScrollArea className="h-48">
                <pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto">
                  {JSON.stringify(log.details, null, 2)}
                </pre>
              </ScrollArea>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function AuditLogs() {
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [entityFilter, setEntityFilter] = useState<string>("all");

  const { data: logs, isLoading } = useQuery<{ success: boolean; data: AuditLog[] }>({
    queryKey: ["/api/audit"],
    select: (response) => response.data,
  });

  const filteredLogs = logs?.filter((log) => {
    const matchesSearch = 
      log.entityId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.userId?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    const matchesAction = actionFilter === "all" || log.action === actionFilter;
    const matchesEntity = entityFilter === "all" || log.entityType === entityFilter;
    return matchesSearch && matchesAction && matchesEntity;
  });

  const handleExport = () => {
    if (!filteredLogs) return;
    const csv = [
      ["Timestamp", "Action", "Entity Type", "Entity ID", "User", "IP Address"].join(","),
      ...filteredLogs.map(log => [
        new Date(log.timestamp).toISOString(),
        log.action,
        log.entityType,
        log.entityId,
        log.userId || "System",
        log.ipAddress || "N/A"
      ].join(","))
    ].join("\n");
    
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-semibold">Audit Logs</h1>
          <p className="text-muted-foreground">System activity and compliance tracking</p>
        </div>
        <Button variant="outline" onClick={handleExport} data-testid="button-export-logs">
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
                <ClipboardList className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{logs?.length ?? 0}</p>
                <p className="text-sm text-muted-foreground">Total Entries</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-blue-500/10">
                <Activity className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {logs?.filter(l => l.action.includes("agent")).length ?? 0}
                </p>
                <p className="text-sm text-muted-foreground">Agent Actions</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-green-500/10">
                <User className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {logs?.filter(l => l.action === "clinician-feedback").length ?? 0}
                </p>
                <p className="text-sm text-muted-foreground">Clinician Reviews</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-purple-500/10">
                <Calendar className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {logs?.filter(l => {
                    const today = new Date().toDateString();
                    return new Date(l.timestamp).toDateString() === today;
                  }).length ?? 0}
                </p>
                <p className="text-sm text-muted-foreground">Today's Entries</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="relative flex-1 min-w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by entity ID or user..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-logs"
              />
            </div>
            <div className="flex items-center gap-2">
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="w-44" data-testid="select-action-filter">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  {Object.entries(actionLabels).map(([key, { label }]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={entityFilter} onValueChange={setEntityFilter}>
                <SelectTrigger className="w-36" data-testid="select-entity-filter">
                  <SelectValue placeholder="Entity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Entities</SelectItem>
                  <SelectItem value="case">Case</SelectItem>
                  <SelectItem value="patient">Patient</SelectItem>
                  <SelectItem value="lab-report">Lab Report</SelectItem>
                  <SelectItem value="agent">Agent</SelectItem>
                  <SelectItem value="recommendation">Recommendation</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <AuditLogSkeleton />
          ) : !filteredLogs || filteredLogs.length === 0 ? (
            <div className="text-center py-12">
              <ClipboardList className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-medium mb-2">No Audit Logs Found</h3>
              <p className="text-sm text-muted-foreground">
                System activity will appear here as actions are performed.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => {
                  const actionInfo = actionLabels[log.action] || { label: log.action, color: "bg-gray-500" };
                  return (
                    <TableRow key={log.id} data-testid={`row-log-${log.id}`}>
                      <TableCell className="font-mono text-sm">
                        {new Date(log.timestamp).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${actionInfo.color}`} />
                          {actionInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm capitalize">{log.entityType}</p>
                          <p className="text-xs text-muted-foreground font-mono">
                            {log.entityId.slice(0, 12)}...
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {log.userId || "System"}
                      </TableCell>
                      <TableCell>
                        <LogDetailDialog log={log} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
