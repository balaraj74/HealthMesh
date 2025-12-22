import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Users,
  Plus,
  Search,
  MoreVertical,
  Eye,
  Trash2,
  FileText,
  Pill,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Patient } from "@shared/schema";

function PatientCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="flex-1">
            <Skeleton className="h-5 w-32 mb-2" />
            <Skeleton className="h-4 w-24 mb-3" />
            <div className="flex gap-2">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-6 w-20" />
            </div>
          </div>
          <Skeleton className="h-8 w-8" />
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState() {
  return (
    <Card>
      <CardContent className="py-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mx-auto mb-4">
          <Users className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium mb-2">No Patients Found</h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
          Add patient records to start creating clinical cases for AI-assisted analysis.
        </p>
        <Button asChild data-testid="button-add-patient-empty">
          <Link href="/patients/new">
            <Plus className="h-4 w-4 mr-2" />
            Add Patient
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function PatientCard({ patient, onDelete }: { patient: any; onDelete: (id: string) => void }) {
  // Handle both flat (from DB) and nested (legacy) structures
  const firstName = patient.firstName || (patient as any).demographics?.firstName || "Unknown";
  const lastName = patient.lastName || (patient as any).demographics?.lastName || "";
  const mrn = patient.mrn || (patient as any).demographics?.mrn || "N/A";
  const gender = patient.gender || (patient as any).demographics?.gender || "unknown";
  const dateOfBirth = patient.dateOfBirth || (patient as any).demographics?.dateOfBirth || "N/A";

  const initials = `${firstName[0] || "?"}${lastName[0] || "?"}`.toUpperCase();

  // Handle allergies - could be JSON array or null
  const allergies = Array.isArray(patient.allergies) ? patient.allergies : [];
  const diagnoses = Array.isArray(patient.diagnoses) ? patient.diagnoses : [];
  const medications = Array.isArray(patient.medications) ? patient.medications : [];

  const severeAllergies = allergies.filter(
    (a: any) => a?.severity === "severe" || a?.severity === "life-threatening"
  );

  return (
    <Card className="hover-elevate" data-testid={`card-patient-${patient.id}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <Avatar className="h-12 w-12">
            <AvatarFallback className="bg-primary/10 text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-medium">
                {firstName} {lastName}
              </h3>
              {severeAllergies.length > 0 && (
                <Badge variant="destructive" className="gap-1 text-xs">
                  <AlertCircle className="h-3 w-3" />
                  Allergies
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              MRN: {mrn} | {gender} | DOB: {dateOfBirth}
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="gap-1 text-xs">
                <FileText className="h-3 w-3" />
                {diagnoses.length} conditions
              </Badge>
              <Badge variant="outline" className="gap-1 text-xs">
                <Pill className="h-3 w-3" />
                {medications.length} medications
              </Badge>
              <Badge variant="outline" className="gap-1 text-xs">
                <AlertCircle className="h-3 w-3" />
                {allergies.length} allergies
              </Badge>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" data-testid={`button-patient-menu-${patient.id}`}>
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/patients/${patient.id}`}>
                  <Eye className="h-4 w-4 mr-2" />
                  View Details
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/cases/new?patientId=${patient.id}`}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Case
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => onDelete(patient.id)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Patients() {
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  const { data: patients, isLoading, error } = useQuery<any>({
    queryKey: ["/api/patients"],
  });

  // Extract patients array from API response
  const patientsList = Array.isArray(patients?.data) ? patients.data : [];

  const deleteMutation = useMutation({
    mutationFn: async (patientId: string) => {
      await apiRequest("DELETE", `/api/patients/${patientId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      toast({
        title: "Patient deleted",
        description: "The patient record has been successfully deleted.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete the patient.",
        variant: "destructive",
      });
    },
  });

  const filteredPatients = patientsList?.filter((patient: any) => {
    // Handle both flat (from DB) and nested (legacy) structures
    const firstName = patient.firstName || patient.demographics?.firstName || "";
    const lastName = patient.lastName || patient.demographics?.lastName || "";
    const mrn = patient.mrn || patient.demographics?.mrn || "";

    const fullName = `${firstName} ${lastName}`.toLowerCase();
    const query = searchQuery.toLowerCase();
    return fullName.includes(query) || mrn.toLowerCase().includes(query);
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-semibold">Patients</h1>
          <p className="text-muted-foreground">Manage patient records and demographics</p>
        </div>
        <Button asChild data-testid="button-add-patient">
          <Link href="/patients/new">
            <Plus className="h-4 w-4 mr-2" />
            Add Patient
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or MRN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search-patients"
            />
          </div>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="py-16 text-center">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Failed to Load Patients</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {error instanceof Error ? error.message : "An error occurred while loading patients."}
              </p>
              <Button variant="outline" onClick={() => window.location.reload()}>
                Retry
              </Button>
            </div>
          ) : isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <PatientCardSkeleton key={i} />
              ))}
            </div>
          ) : !filteredPatients || filteredPatients.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredPatients.map((patient: any) => (
                <PatientCard
                  key={patient.id}
                  patient={patient}
                  onDelete={(id) => deleteMutation.mutate(id)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
