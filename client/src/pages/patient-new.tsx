import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Upload,
  Users,
  FileText,
  Pill,
  AlertCircle,
  Save,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertPatientSchema } from "@shared/schema";

const formSchema = z.object({
  demographics: z.object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    dateOfBirth: z.string().min(1, "Date of birth is required"),
    gender: z.enum(["male", "female", "other", "unknown"]),
    mrn: z.string().min(1, "MRN is required"),
    contactPhone: z.string().optional(),
    contactEmail: z.string().email().optional().or(z.literal("")),
    address: z.string().optional(),
  }),
  diagnoses: z.array(z.object({
    id: z.string(),
    code: z.string(),
    codeSystem: z.enum(["ICD-10", "SNOMED-CT"]),
    display: z.string().min(1, "Diagnosis name is required"),
    status: z.enum(["active", "resolved", "inactive"]),
    onsetDate: z.string().optional(),
    notes: z.string().optional(),
  })),
  medications: z.array(z.object({
    id: z.string(),
    name: z.string().min(1, "Medication name is required"),
    dosage: z.string().min(1, "Dosage is required"),
    frequency: z.string().min(1, "Frequency is required"),
    route: z.string().optional(),
    status: z.enum(["active", "completed", "stopped", "on-hold"]),
    startDate: z.string().optional(),
    prescriber: z.string().optional(),
  })),
  allergies: z.array(z.object({
    id: z.string(),
    substance: z.string().min(1, "Substance is required"),
    reaction: z.string().min(1, "Reaction is required"),
    severity: z.enum(["mild", "moderate", "severe", "life-threatening"]),
    status: z.enum(["active", "inactive", "resolved"]),
  })),
  medicalHistory: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

function generateId() {
  return Math.random().toString(36).substring(2, 11);
}

export default function PatientNew() {
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("demographics");
  const [fhirImport, setFhirImport] = useState("");
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      demographics: {
        firstName: "",
        lastName: "",
        dateOfBirth: "",
        gender: "unknown",
        mrn: "",
        contactPhone: "",
        contactEmail: "",
        address: "",
      },
      diagnoses: [],
      medications: [],
      allergies: [],
      medicalHistory: "",
    },
  });

  const diagnosesArray = useFieldArray({
    control: form.control,
    name: "diagnoses",
  });

  const medicationsArray = useFieldArray({
    control: form.control,
    name: "medications",
  });

  const allergiesArray = useFieldArray({
    control: form.control,
    name: "allergies",
  });

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await apiRequest("POST", "/api/patients", data);
      return response.json();
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      toast({
        title: "Patient created",
        description: "The patient record has been saved successfully.",
      });
      // Extract patient ID from response.data
      const patientId = response.data?.id || response.id;
      if (patientId) {
        navigate(`/patients/${patientId}`);
      } else {
        navigate("/patients");
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create patient record.",
        variant: "destructive",
      });
    },
  });

  const handleFhirImport = () => {
    try {
      const fhirData = JSON.parse(fhirImport);
      if (fhirData.resourceType === "Patient") {
        const name = fhirData.name?.[0] || {};
        form.setValue("demographics.firstName", name.given?.[0] || "");
        form.setValue("demographics.lastName", name.family || "");
        form.setValue("demographics.gender", fhirData.gender || "unknown");
        form.setValue("demographics.dateOfBirth", fhirData.birthDate || "");
        form.setValue("demographics.mrn", fhirData.identifier?.[0]?.value || generateId());
        toast({
          title: "FHIR data imported",
          description: "Patient demographics have been populated from FHIR JSON.",
        });
      }
    } catch {
      toast({
        title: "Invalid JSON",
        description: "Please provide valid FHIR JSON data.",
        variant: "destructive",
      });
    }
  };

  const onSubmit = (data: FormData) => {
    createMutation.mutate(data);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate("/patients")} data-testid="button-back">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-semibold">Add Patient</h1>
          <p className="text-muted-foreground">Create a new patient record</p>
        </div>
        <Button
          onClick={form.handleSubmit(onSubmit)}
          disabled={createMutation.isPending}
          data-testid="button-save-patient"
        >
          <Save className="h-4 w-4 mr-2" />
          {createMutation.isPending ? "Saving..." : "Save Patient"}
        </Button>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import from FHIR
          </CardTitle>
          <CardDescription>
            Paste FHIR R4 Patient JSON to auto-populate demographics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Textarea
              placeholder='{"resourceType": "Patient", "name": [{"family": "Doe", "given": ["John"]}], ...}'
              value={fhirImport}
              onChange={(e) => setFhirImport(e.target.value)}
              className="font-mono text-sm"
              data-testid="input-fhir-json"
            />
            <Button variant="outline" onClick={handleFhirImport} data-testid="button-import-fhir">
              Import
            </Button>
          </div>
        </CardContent>
      </Card>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="demographics" className="gap-2" data-testid="tab-demographics">
                <Users className="h-4 w-4" />
                Demographics
              </TabsTrigger>
              <TabsTrigger value="diagnoses" className="gap-2" data-testid="tab-diagnoses">
                <FileText className="h-4 w-4" />
                Diagnoses
                {diagnosesArray.fields.length > 0 && (
                  <Badge variant="secondary">{diagnosesArray.fields.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="medications" className="gap-2" data-testid="tab-medications">
                <Pill className="h-4 w-4" />
                Medications
                {medicationsArray.fields.length > 0 && (
                  <Badge variant="secondary">{medicationsArray.fields.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="allergies" className="gap-2" data-testid="tab-allergies">
                <AlertCircle className="h-4 w-4" />
                Allergies
                {allergiesArray.fields.length > 0 && (
                  <Badge variant="secondary">{allergiesArray.fields.length}</Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="demographics">
              <Card>
                <CardHeader>
                  <CardTitle>Patient Demographics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="demographics.firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name *</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-first-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="demographics.lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name *</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-last-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="demographics.dateOfBirth"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date of Birth *</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} data-testid="input-dob" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="demographics.gender"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Gender *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-gender">
                                <SelectValue placeholder="Select gender" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="male">Male</SelectItem>
                              <SelectItem value="female">Female</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                              <SelectItem value="unknown">Unknown</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="demographics.mrn"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Medical Record Number *</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="MRN-12345" data-testid="input-mrn" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="demographics.contactPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone</FormLabel>
                          <FormControl>
                            <Input {...field} type="tel" data-testid="input-phone" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="demographics.contactEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input {...field} type="email" data-testid="input-email" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="demographics.address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address</FormLabel>
                        <FormControl>
                          <Textarea {...field} data-testid="input-address" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="medicalHistory"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Medical History Notes</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="Enter relevant medical history, surgical history, family history..."
                            className="min-h-24"
                            data-testid="input-medical-history"
                          />
                        </FormControl>
                        <FormDescription>
                          Include any relevant past medical history, surgical procedures, or family history.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="diagnoses">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-4">
                  <div>
                    <CardTitle>Diagnoses</CardTitle>
                    <CardDescription>Add active medical conditions and diagnoses</CardDescription>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => diagnosesArray.append({
                      id: generateId(),
                      code: "",
                      codeSystem: "ICD-10",
                      display: "",
                      status: "active",
                      onsetDate: "",
                      notes: "",
                    })}
                    data-testid="button-add-diagnosis"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Diagnosis
                  </Button>
                </CardHeader>
                <CardContent>
                  {diagnosesArray.fields.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No diagnoses added yet</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {diagnosesArray.fields.map((field, index) => (
                        <Card key={field.id}>
                          <CardContent className="pt-4">
                            <div className="flex items-start gap-4">
                              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField
                                  control={form.control}
                                  name={`diagnoses.${index}.display`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Diagnosis Name</FormLabel>
                                      <FormControl>
                                        <Input {...field} placeholder="e.g., Type 2 Diabetes Mellitus" />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={form.control}
                                  name={`diagnoses.${index}.code`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Code</FormLabel>
                                      <FormControl>
                                        <Input {...field} placeholder="e.g., E11.9" />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={form.control}
                                  name={`diagnoses.${index}.status`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Status</FormLabel>
                                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                          <SelectTrigger>
                                            <SelectValue />
                                          </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                          <SelectItem value="active">Active</SelectItem>
                                          <SelectItem value="resolved">Resolved</SelectItem>
                                          <SelectItem value="inactive">Inactive</SelectItem>
                                        </SelectContent>
                                      </Select>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={form.control}
                                  name={`diagnoses.${index}.onsetDate`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Onset Date</FormLabel>
                                      <FormControl>
                                        <Input type="date" {...field} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => diagnosesArray.remove(index)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="medications">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-4">
                  <div>
                    <CardTitle>Medications</CardTitle>
                    <CardDescription>Add current medications and dosages</CardDescription>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => medicationsArray.append({
                      id: generateId(),
                      name: "",
                      dosage: "",
                      frequency: "",
                      route: "oral",
                      status: "active",
                      startDate: "",
                      prescriber: "",
                    })}
                    data-testid="button-add-medication"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Medication
                  </Button>
                </CardHeader>
                <CardContent>
                  {medicationsArray.fields.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Pill className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No medications added yet</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {medicationsArray.fields.map((field, index) => (
                        <Card key={field.id}>
                          <CardContent className="pt-4">
                            <div className="flex items-start gap-4">
                              <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                                <FormField
                                  control={form.control}
                                  name={`medications.${index}.name`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Medication Name</FormLabel>
                                      <FormControl>
                                        <Input {...field} placeholder="e.g., Metformin" />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={form.control}
                                  name={`medications.${index}.dosage`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Dosage</FormLabel>
                                      <FormControl>
                                        <Input {...field} placeholder="e.g., 500mg" />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={form.control}
                                  name={`medications.${index}.frequency`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Frequency</FormLabel>
                                      <FormControl>
                                        <Input {...field} placeholder="e.g., Twice daily" />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={form.control}
                                  name={`medications.${index}.status`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Status</FormLabel>
                                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                          <SelectTrigger>
                                            <SelectValue />
                                          </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                          <SelectItem value="active">Active</SelectItem>
                                          <SelectItem value="completed">Completed</SelectItem>
                                          <SelectItem value="stopped">Stopped</SelectItem>
                                          <SelectItem value="on-hold">On Hold</SelectItem>
                                        </SelectContent>
                                      </Select>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => medicationsArray.remove(index)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="allergies">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-4">
                  <div>
                    <CardTitle>Allergies</CardTitle>
                    <CardDescription>Document known allergies and reactions</CardDescription>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => allergiesArray.append({
                      id: generateId(),
                      substance: "",
                      reaction: "",
                      severity: "moderate",
                      status: "active",
                    })}
                    data-testid="button-add-allergy"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Allergy
                  </Button>
                </CardHeader>
                <CardContent>
                  {allergiesArray.fields.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <AlertCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No allergies documented</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {allergiesArray.fields.map((field, index) => (
                        <Card key={field.id}>
                          <CardContent className="pt-4">
                            <div className="flex items-start gap-4">
                              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField
                                  control={form.control}
                                  name={`allergies.${index}.substance`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Substance</FormLabel>
                                      <FormControl>
                                        <Input {...field} placeholder="e.g., Penicillin" />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={form.control}
                                  name={`allergies.${index}.reaction`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Reaction</FormLabel>
                                      <FormControl>
                                        <Input {...field} placeholder="e.g., Rash, Anaphylaxis" />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={form.control}
                                  name={`allergies.${index}.severity`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Severity</FormLabel>
                                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                          <SelectTrigger>
                                            <SelectValue />
                                          </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                          <SelectItem value="mild">Mild</SelectItem>
                                          <SelectItem value="moderate">Moderate</SelectItem>
                                          <SelectItem value="severe">Severe</SelectItem>
                                          <SelectItem value="life-threatening">Life-threatening</SelectItem>
                                        </SelectContent>
                                      </Select>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={form.control}
                                  name={`allergies.${index}.status`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Status</FormLabel>
                                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                          <SelectTrigger>
                                            <SelectValue />
                                          </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                          <SelectItem value="active">Active</SelectItem>
                                          <SelectItem value="inactive">Inactive</SelectItem>
                                          <SelectItem value="resolved">Resolved</SelectItem>
                                        </SelectContent>
                                      </Select>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => allergiesArray.remove(index)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </form>
      </Form>
    </div>
  );
}
