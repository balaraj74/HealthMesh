import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  FolderOpen,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Eye,
  Trash2,
  Clock,
  CheckCircle,
  AlertCircle,
  Brain,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ClinicalCase, CaseStatus } from "@shared/schema";

const statusConfig: Record<CaseStatus, { label: string; color: string; icon: typeof Clock }> = {
  draft: { label: "Draft", color: "bg-gray-500", icon: Clock },
  submitted: { label: "Submitted", color: "bg-blue-500", icon: Clock },
  analyzing: { label: "Analyzing", color: "bg-yellow-500", icon: Brain },
  "review-ready": { label: "Review Ready", color: "bg-green-500", icon: CheckCircle },
  reviewed: { label: "Reviewed", color: "bg-purple-500", icon: CheckCircle },
  closed: { label: "Closed", color: "bg-gray-400", icon: CheckCircle },
};

const caseTypeLabels: Record<string, string> = {
  "tumor-board": "Tumor Board",
  "chronic-disease": "Chronic Disease",
  "rare-disease": "Rare Disease",
  general: "General",
};

function CaseTableSkeleton() {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Case ID</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Alerts</TableHead>
          <TableHead>Created</TableHead>
          <TableHead className="w-12"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {[1, 2, 3, 4, 5].map((i) => (
          <TableRow key={i}>
            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
            <TableCell><Skeleton className="h-6 w-20" /></TableCell>
            <TableCell><Skeleton className="h-6 w-24" /></TableCell>
            <TableCell><Skeleton className="h-6 w-8" /></TableCell>
            <TableCell><Skeleton className="h-4 w-28" /></TableCell>
            <TableCell><Skeleton className="h-8 w-8" /></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
        <FolderOpen className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium mb-2">No Cases Found</h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-md">
        Start by creating a new clinical case to begin the AI-assisted analysis workflow.
      </p>
      <Button asChild data-testid="button-create-case-empty">
        <Link href="/cases/new">
          <Plus className="h-4 w-4 mr-2" />
          Create New Case
        </Link>
      </Button>
    </div>
  );
}

export default function Cases() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const { toast } = useToast();

  const { data: cases, isLoading } = useQuery<ClinicalCase[]>({
    queryKey: ["/api/cases"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (caseId: string) => {
      await apiRequest("DELETE", `/api/cases/${caseId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases"] });
      toast({
        title: "Case deleted",
        description: "The case has been successfully deleted.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete the case.",
        variant: "destructive",
      });
    },
  });

  const filteredCases = cases?.filter((caseItem) => {
    const matchesSearch = caseItem.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      caseItem.clinicalQuestion.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || caseItem.status === statusFilter;
    const matchesType = typeFilter === "all" || caseItem.caseType === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-semibold">Clinical Cases</h1>
          <p className="text-muted-foreground">Manage and review patient cases</p>
        </div>
        <Button asChild data-testid="button-new-case">
          <Link href="/cases/new">
            <Plus className="h-4 w-4 mr-2" />
            New Case
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="relative flex-1 min-w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search cases..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-cases"
              />
            </div>
            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36" data-testid="select-status-filter">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="analyzing">Analyzing</SelectItem>
                  <SelectItem value="review-ready">Review Ready</SelectItem>
                  <SelectItem value="reviewed">Reviewed</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-40" data-testid="select-type-filter">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="tumor-board">Tumor Board</SelectItem>
                  <SelectItem value="chronic-disease">Chronic Disease</SelectItem>
                  <SelectItem value="rare-disease">Rare Disease</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <CaseTableSkeleton />
          ) : !filteredCases || filteredCases.length === 0 ? (
            <EmptyState />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Case ID</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Alerts</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCases.map((caseItem) => {
                  const status = statusConfig[caseItem.status];
                  const StatusIcon = status.icon;
                  const criticalAlerts = caseItem.riskAlerts?.filter(a => a.severity === "critical").length ?? 0;

                  return (
                    <TableRow key={caseItem.id} data-testid={`row-case-${caseItem.id}`}>
                      <TableCell>
                        <Link
                          href={`/cases/${caseItem.id}`}
                          className="font-mono text-sm text-primary hover:underline"
                          data-testid={`link-case-${caseItem.id}`}
                        >
                          #{caseItem.id.slice(0, 8)}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {caseTypeLabels[caseItem.caseType]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${status.color}`} />
                          {status.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {criticalAlerts > 0 ? (
                          <Badge variant="destructive" className="gap-1">
                            <AlertCircle className="h-3 w-3" />
                            {criticalAlerts}
                          </Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(caseItem.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" data-testid={`button-case-menu-${caseItem.id}`}>
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/cases/${caseItem.id}`}>
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => deleteMutation.mutate(caseItem.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
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
