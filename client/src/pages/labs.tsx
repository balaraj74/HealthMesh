import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  FileText,
  Upload,
  Search,
  Eye,
  AlertTriangle,
  CheckCircle,
  Clock,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
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
import type { LabReport, LabResult } from "@shared/schema";

const statusConfig = {
  pending: { label: "Pending", color: "bg-gray-500", icon: Clock },
  processing: { label: "Processing", color: "bg-yellow-500", icon: Loader2 },
  completed: { label: "Completed", color: "bg-green-500", icon: CheckCircle },
  failed: { label: "Failed", color: "bg-red-500", icon: AlertTriangle },
};

function LabResultsTable({ results }: { results: LabResult[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Test</TableHead>
          <TableHead>Value</TableHead>
          <TableHead>Reference Range</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {results.map((result) => (
          <TableRow key={result.id}>
            <TableCell className="font-medium">{result.testName}</TableCell>
            <TableCell className="font-mono">
              {result.value} {result.unit}
            </TableCell>
            <TableCell className="text-muted-foreground">
              {result.referenceRange || "N/A"}
            </TableCell>
            <TableCell>
              <Badge
                variant={
                  result.status === "critical" ? "destructive" :
                  result.status === "abnormal" ? "secondary" : "outline"
                }
              >
                {result.status}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function LabReportDetailDialog({ report }: { report: LabReport }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" data-testid={`button-view-lab-${report.id}`}>
          <Eye className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Lab Report Details</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">File Name</p>
              <p className="font-medium">{report.fileName}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Uploaded</p>
              <p>{new Date(report.uploadedAt).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <Badge variant="secondary">
                {statusConfig[report.status].label}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Results Extracted</p>
              <p>{report.extractedData?.length ?? 0} tests</p>
            </div>
          </div>

          {report.extractedData && report.extractedData.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">Extracted Results</h4>
              <LabResultsTable results={report.extractedData} />
            </div>
          )}

          {report.rawText && (
            <div>
              <h4 className="text-sm font-medium mb-2">Raw Extracted Text</h4>
              <pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto max-h-48">
                {report.rawText}
              </pre>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Labs() {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: reports, isLoading } = useQuery<LabReport[]>({
    queryKey: ["/api/lab-reports"],
  });

  const filteredReports = reports?.filter((report) =>
    report.fileName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const criticalCount = reports?.reduce((acc, r) => 
    acc + (r.extractedData?.filter(d => d.status === "critical").length ?? 0), 0
  ) ?? 0;

  const abnormalCount = reports?.reduce((acc, r) => 
    acc + (r.extractedData?.filter(d => d.status === "abnormal").length ?? 0), 0
  ) ?? 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-semibold">Lab Reports</h1>
          <p className="text-muted-foreground">View and manage uploaded lab documents</p>
        </div>
        <Button asChild data-testid="button-upload-lab">
          <a href="/cases/new">
            <Upload className="h-4 w-4 mr-2" />
            Upload via New Case
          </a>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{reports?.length ?? 0}</p>
                <p className="text-sm text-muted-foreground">Total Reports</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-green-500/10">
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {reports?.filter(r => r.status === "completed").length ?? 0}
                </p>
                <p className="text-sm text-muted-foreground">Processed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-destructive/10">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">{criticalCount}</p>
                <p className="text-sm text-muted-foreground">Critical Values</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-yellow-500/10">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{abnormalCount}</p>
                <p className="text-sm text-muted-foreground">Abnormal Values</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search lab reports..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search-labs"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : !filteredReports || filteredReports.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-medium mb-2">No Lab Reports Found</h3>
              <p className="text-sm text-muted-foreground">
                Lab reports are uploaded as part of clinical cases.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>File Name</TableHead>
                  <TableHead>Case</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Results</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReports.map((report) => {
                  const status = statusConfig[report.status];
                  const StatusIcon = status.icon;
                  const criticals = report.extractedData?.filter(d => d.status === "critical").length ?? 0;
                  const abnormals = report.extractedData?.filter(d => d.status === "abnormal").length ?? 0;

                  return (
                    <TableRow key={report.id} data-testid={`row-lab-${report.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{report.fileName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        #{report.caseId.slice(0, 8)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="gap-1.5">
                          <StatusIcon className={`h-3 w-3 ${
                            report.status === "processing" ? "animate-spin" : ""
                          }`} />
                          {status.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-sm">
                            {report.extractedData?.length ?? 0} tests
                          </span>
                          {criticals > 0 && (
                            <Badge variant="destructive" className="text-xs">
                              {criticals} critical
                            </Badge>
                          )}
                          {abnormals > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              {abnormals} abnormal
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(report.uploadedAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <LabReportDetailDialog report={report} />
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
