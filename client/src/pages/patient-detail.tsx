import { useQuery } from "@tanstack/react-query";
import { useParams, Link, useLocation } from "wouter";
import {
    ArrowLeft,
    User,
    Calendar,
    Activity,
    AlertCircle,
    Pill,
    FileText,
    Clock,
    Plus,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest } from "@/lib/queryClient";
import type { Patient, ClinicalCase } from "@shared/schema";

export default function PatientDetail() {
    const { id } = useParams<{ id: string }>();
    const [, navigate] = useLocation();

    const { data: patient, isLoading: patientLoading } = useQuery<{ success: boolean; data: Patient }, Error, Patient>({
        queryKey: ["/api/patients", id],
        queryFn: async () => {
            const response = await apiRequest("GET", `/api/patients/${id}`);
            const data = await response.json();
            return data;
        },
        select: (response) => response.data,
    });

    const { data: cases, isLoading: casesLoading } = useQuery<{ success: boolean; data: ClinicalCase[] }, Error, ClinicalCase[]>({
        queryKey: ["/api/cases", { patientId: id }],
        queryFn: async () => {
            // Assuming we can filter cases by patientId, or we fetch all and filter client side if API doesn't support it yet.
            // For now, let's fetch all and filter. Ideally the API should support filtering.
            const response = await apiRequest("GET", "/api/cases");
            const data = await response.json();
            return data;
        },
        select: (response) => response.data.filter((c: ClinicalCase) => c.patientId === id),
    });

    if (patientLoading) {
        return (
            <div className="p-6 space-y-6">
                <Skeleton className="h-10 w-64" />
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Skeleton className="h-64 lg:col-span-1" />
                    <Skeleton className="h-64 lg:col-span-2" />
                </div>
            </div>
        );
    }

    if (!patient) {
        return (
            <div className="p-6 text-center">
                <h1 className="text-2xl font-semibold mb-2">Patient Not Found</h1>
                <Button asChild>
                    <Link href="/patients">Back to Patients</Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => navigate("/patients")}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">
                        {patient.demographics.firstName} {patient.demographics.lastName}
                    </h1>
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                        <User className="h-3.5 w-3.5" />
                        <span>MRN: {patient.demographics.mrn}</span>
                        <span>•</span>
                        <Calendar className="h-3.5 w-3.5" />
                        <span>DOB: {patient.demographics.dateOfBirth}</span>
                        <span>•</span>
                        <span>{patient.demographics.gender}</span>
                    </div>
                </div>
                <div className="ml-auto">
                    <Button asChild>
                        <Link href={`/cases/new?patientId=${patient.id}`}>
                            <Plus className="h-4 w-4 mr-2" />
                            New Case
                        </Link>
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Patient Info */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Contact Information</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 text-sm">
                            <div>
                                <p className="text-muted-foreground">Email</p>
                                <p>{patient.demographics.contactEmail || "N/A"}</p>
                            </div>
                            <div>
                                <p className="text-muted-foreground">Phone</p>
                                <p>{patient.demographics.contactPhone || "N/A"}</p>
                            </div>
                            <div>
                                <p className="text-muted-foreground">Address</p>
                                <p>{patient.demographics.address || "N/A"}</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Medical History</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div>
                                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                                    <Activity className="h-4 w-4 text-blue-500" />
                                    Active Conditions
                                </h4>
                                <div className="flex flex-wrap gap-1.5">
                                    {patient.diagnoses.map((dx, i) => (
                                        <Badge key={i} variant="secondary" className="text-xs">
                                            {dx.display}
                                        </Badge>
                                    ))}
                                    {patient.diagnoses.length === 0 && <p className="text-xs text-muted-foreground">None recorded</p>}
                                </div>
                            </div>

                            <Separator />

                            <div>
                                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                                    <AlertCircle className="h-4 w-4 text-red-500" />
                                    Allergies
                                </h4>
                                <div className="flex flex-wrap gap-1.5">
                                    {patient.allergies.map((allergy, i) => (
                                        <Badge
                                            key={i}
                                            variant={allergy.severity === "severe" ? "destructive" : "outline"}
                                            className="text-xs"
                                        >
                                            {allergy.substance}
                                        </Badge>
                                    ))}
                                    {patient.allergies.length === 0 && <p className="text-xs text-muted-foreground">No known allergies</p>}
                                </div>
                            </div>

                            <Separator />

                            <div>
                                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                                    <Pill className="h-4 w-4 text-purple-500" />
                                    Current Medications
                                </h4>
                                <div className="space-y-2">
                                    {patient.medications.map((med, i) => (
                                        <div key={i} className="text-xs border rounded p-2 bg-muted/30">
                                            <p className="font-medium">{med.name}</p>
                                            <p className="text-muted-foreground">{med.dosage} - {med.frequency}</p>
                                        </div>
                                    ))}
                                    {patient.medications.length === 0 && <p className="text-xs text-muted-foreground">No active medications</p>}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Clinical Cases & Data */}
                <div className="lg:col-span-2 space-y-6">
                    <Tabs defaultValue="cases">
                        <TabsList>
                            <TabsTrigger value="cases">Clinical Cases</TabsTrigger>
                            <TabsTrigger value="notes">Clinical Notes</TabsTrigger>
                            <TabsTrigger value="timeline">Timeline</TabsTrigger>
                        </TabsList>

                        <TabsContent value="cases" className="space-y-4">
                            {casesLoading ? (
                                <Skeleton className="h-32 w-full" />
                            ) : cases && cases.length > 0 ? (
                                cases.map((c) => (
                                    <Link key={c.id} href={`/cases/${c.id}`}>
                                        <Card className="hover:border-primary/50 transition-colors cursor-pointer mb-3">
                                            <CardContent className="p-4">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <h3 className="font-semibold text-sm">Case #{c.id.slice(0, 8)}</h3>
                                                            <Badge variant="outline" className="text-[10px]">{c.caseType}</Badge>
                                                        </div>
                                                        <p className="text-sm text-muted-foreground line-clamp-1">{c.clinicalQuestion}</p>
                                                    </div>
                                                    <Badge variant="secondary" className="capitalize text-xs">
                                                        {c.status.replace("-", " ")}
                                                    </Badge>
                                                </div>
                                                <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="h-3 w-3" />
                                                        {new Date(c.createdAt).toLocaleDateString()}
                                                    </span>
                                                    {c.riskAlerts && c.riskAlerts.length > 0 && (
                                                        <span className="flex items-center gap-1 text-orange-600">
                                                            <AlertCircle className="h-3 w-3" />
                                                            {c.riskAlerts.length} Alerts
                                                        </span>
                                                    )}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </Link>
                                ))
                            ) : (
                                <div className="text-center py-12 border rounded-md border-dashed">
                                    <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                                    <p className="text-muted-foreground">No cases found for this patient</p>
                                    <Button variant="ghost" asChild className="mt-2 text-primary hover:underline">
                                        <Link href={`/cases/new?patientId=${patient.id}`}>Create First Case</Link>
                                    </Button>
                                </div>
                            )}
                        </TabsContent>

                        <TabsContent value="notes">
                            <div className="text-center py-12 border rounded-md border-dashed">
                                <p className="text-muted-foreground">Clinical notes feature coming soon</p>
                            </div>
                        </TabsContent>

                        <TabsContent value="timeline">
                            <div className="text-center py-12 border rounded-md border-dashed">
                                <p className="text-muted-foreground">Patient timeline feature coming soon</p>
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </div>
    );
}
