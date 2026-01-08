import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Upload,
  Users,
  FileText,
  Brain,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Patient, InsertCase } from "@shared/schema";

const steps = [
  { id: 1, title: "Select Patient", icon: Users },
  { id: 2, title: "Case Details", icon: FileText },
  { id: 3, title: "Lab Reports", icon: Upload },
  { id: 4, title: "Review & Submit", icon: Brain },
];

const caseFormSchema = z.object({
  patientId: z.string().min(1, "Please select a patient"),
  caseType: z.enum(["tumor-board", "chronic-disease", "rare-disease", "general"]),
  clinicalQuestion: z.string().min(10, "Please provide a detailed clinical question"),
});

type CaseFormData = z.infer<typeof caseFormSchema>;

function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {steps.map((step, index) => {
        const StepIcon = step.icon;
        const isActive = step.id === currentStep;
        const isCompleted = step.id < currentStep;

        return (
          <div key={step.id} className="flex items-center">
            <div
              className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${isActive
                ? "bg-primary text-primary-foreground"
                : isCompleted
                  ? "bg-primary/20 text-primary"
                  : "bg-muted text-muted-foreground"
                }`}
            >
              {isCompleted ? (
                <Check className="h-4 w-4" />
              ) : (
                <StepIcon className="h-4 w-4" />
              )}
              <span className="text-sm font-medium hidden sm:inline">{step.title}</span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={`w-8 h-0.5 mx-2 ${isCompleted ? "bg-primary" : "bg-muted"
                  }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function PatientSelectionStep({
  patients,
  selectedPatientId,
  onSelect,
  isLoading,
}: {
  patients?: any[];  // Using any to match actual API response structure
  selectedPatientId: string;
  onSelect: (id: string) => void;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-5 w-32 mb-2" />
              <Skeleton className="h-4 w-24 mb-1" />
              <Skeleton className="h-4 w-40" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!patients || patients.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-medium mb-2">No Patients Found</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Create a patient record before creating a case.
          </p>
          <Button asChild variant="outline">
            <a href="/patients/new">Add Patient</a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <RadioGroup value={selectedPatientId} onValueChange={onSelect} className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {patients.map((patient) => (
        <Card
          key={patient.id}
          className={`cursor-pointer transition-colors ${selectedPatientId === patient.id
            ? "border-primary bg-primary/5"
            : "hover-elevate"
            }`}
          onClick={() => onSelect(patient.id)}
          data-testid={`card-patient-${patient.id}`}
        >
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <RadioGroupItem value={patient.id} id={patient.id} className="mt-1" />
              <div className="flex-1">
                <label htmlFor={patient.id} className="font-medium cursor-pointer">
                  {patient.firstName || patient.demographics?.firstName} {patient.lastName || patient.demographics?.lastName}
                </label>
                <p className="text-sm text-muted-foreground">
                  MRN: {patient.mrn || patient.demographics?.mrn}
                </p>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <Badge variant="outline" className="text-xs">
                    {patient.gender || patient.demographics?.gender || 'N/A'}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {(patient.diagnoses?.length || 0)} conditions
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {(patient.medications?.length || 0)} medications
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </RadioGroup>
  );
}

function CaseDetailsStep({
  form,
}: {
  form: ReturnType<typeof useForm<CaseFormData>>;
}) {
  return (
    <div className="space-y-6">
      <FormField
        control={form.control}
        name="caseType"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Case Type</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger data-testid="select-case-type">
                  <SelectValue placeholder="Select case type" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="tumor-board">
                  <div className="flex items-center gap-2">
                    <span>Tumor Board Review</span>
                  </div>
                </SelectItem>
                <SelectItem value="chronic-disease">Chronic Disease Management</SelectItem>
                <SelectItem value="rare-disease">Rare Disease Diagnosis</SelectItem>
                <SelectItem value="general">General Consultation</SelectItem>
              </SelectContent>
            </Select>
            <FormDescription>
              Select the type of clinical case for appropriate AI agent routing.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="clinicalQuestion"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Clinical Question</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Describe the clinical question or decision point you need support with. Include relevant context about the patient's condition, treatment history, and specific concerns."
                className="min-h-32"
                data-testid="input-clinical-question"
                {...field}
              />
            </FormControl>
            <FormDescription>
              Be specific about the clinical decision you need support with.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}

function LabUploadStep({
  uploadedFiles,
  onUpload,
}: {
  uploadedFiles: File[];
  onUpload: (files: FileList | null) => void;
}) {
  return (
    <div className="space-y-6">
      <div
        className="border-2 border-dashed rounded-lg p-8 text-center hover-elevate cursor-pointer transition-colors"
        onClick={() => document.getElementById("lab-upload")?.click()}
        data-testid="dropzone-lab-upload"
      >
        <input
          id="lab-upload"
          type="file"
          multiple
          accept=".pdf,.png,.jpg,.jpeg"
          className="hidden"
          onChange={(e) => onUpload(e.target.files)}
        />
        <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="font-medium mb-2">Upload Lab Reports</h3>
        <p className="text-sm text-muted-foreground">
          Drag and drop PDF or image files, or click to browse
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          Supported formats: PDF, PNG, JPG, JPEG
        </p>
      </div>

      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium">Uploaded Files</h4>
          {uploadedFiles.map((file, index) => (
            <Card key={index}>
              <CardContent className="p-3 flex items-center gap-3">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <Badge variant="secondary">Pending</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <p className="text-sm text-muted-foreground">
        Lab reports are optional but recommended for comprehensive analysis.
        The AI will extract and analyze relevant data from uploaded documents.
      </p>
    </div>
  );
}

function ReviewStep({
  form,
  patient,
  uploadedFiles,
}: {
  form: ReturnType<typeof useForm<CaseFormData>>;
  patient?: any;
  uploadedFiles: File[];
}) {
  const values = form.getValues();

  const caseTypeLabels: Record<string, string> = {
    "tumor-board": "Tumor Board Review",
    "chronic-disease": "Chronic Disease Management",
    "rare-disease": "Rare Disease Diagnosis",
    general: "General Consultation",
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Patient Information</CardTitle>
        </CardHeader>
        <CardContent>
          {patient ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-medium">
                  {patient.firstName || patient.demographics?.firstName} {patient.lastName || patient.demographics?.lastName}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">MRN</p>
                <p className="font-mono">{patient.mrn || patient.demographics?.mrn}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Conditions</p>
                <p>{patient.diagnoses?.length || 0} active</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Medications</p>
                <p>{patient.medications?.length || 0} current</p>
              </div>
            </div>
          ) : (
            <Skeleton className="h-20 w-full" />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Case Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">Case Type</p>
            <Badge variant="outline" className="mt-1">
              {caseTypeLabels[values.caseType]}
            </Badge>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Clinical Question</p>
            <p className="text-sm mt-1">{values.clinicalQuestion}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Lab Reports</CardTitle>
        </CardHeader>
        <CardContent>
          {uploadedFiles.length > 0 ? (
            <div className="space-y-2">
              {uploadedFiles.map((file, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span>{file.name}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No lab reports uploaded</p>
          )}
        </CardContent>
      </Card>

      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-primary flex-shrink-0" />
            <div>
              <p className="text-sm font-medium">Ready for AI Analysis</p>
              <p className="text-xs text-muted-foreground">
                Upon submission, the multi-agent system will analyze this case
                and provide evidence-based recommendations. Results are for
                decision support only and require clinical review.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function CaseNew() {
  const [, navigate] = useLocation();
  const searchString = useSearch();
  const [currentStep, setCurrentStep] = useState(1);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [preSelectedPatientId, setPreSelectedPatientId] = useState<string | null>(null);
  const { toast } = useToast();

  // API returns patients with firstName, lastName, mrn directly on the object (not nested in demographics)
  type APIPatient = {
    id: string;
    hospitalId?: string;
    firstName: string;
    lastName: string;
    mrn: string;
    gender?: string;
    dateOfBirth?: string;
    diagnoses?: any[];
    medications?: any[];
    allergies?: any[];
    demographics?: {
      firstName?: string;
      lastName?: string;
      mrn?: string;
      gender?: string;
    };
  };

  const { data: patients, isLoading: patientsLoading } = useQuery<{ success: boolean; data: APIPatient[] }, Error, APIPatient[]>({
    queryKey: ["/api/patients"],
    select: (response) => response.data,
  });

  const form = useForm<CaseFormData>({
    resolver: zodResolver(caseFormSchema),
    defaultValues: {
      patientId: "",
      caseType: "tumor-board",
      clinicalQuestion: "",
    },
  });

  // Check for patientId in URL query parameters
  useEffect(() => {
    const params = new URLSearchParams(searchString);
    const urlPatientId = params.get('patientId');
    if (urlPatientId && !preSelectedPatientId) {
      setPreSelectedPatientId(urlPatientId);
      form.setValue('patientId', urlPatientId);
      // Skip to step 2 since patient is already selected
      setCurrentStep(2);
    }
  }, [searchString, form, preSelectedPatientId]);

  const selectedPatient = patients?.find((p: APIPatient) => p.id === form.watch("patientId"));

  // Upload lab reports for a case with actual file content
  const uploadLabReports = async (caseId: string, patientId: string, files: File[]) => {
    for (const file of files) {
      try {
        // Read file as base64 for text-based files or use FormData
        const reader = new FileReader();

        const fileContent = await new Promise<string>((resolve, reject) => {
          reader.onload = () => {
            // Get base64 string (remove data:...base64, prefix)
            const base64 = (reader.result as string).split(',')[1] || '';
            resolve(base64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        // Create a lab report record with file content for extraction
        const response = await apiRequest("POST", "/api/lab-reports/upload", {
          patientId,
          caseId,
          fileName: file.name,
          fileType: file.type,
          fileContent, // Base64 encoded file content
        });

        const result = await response.json();
        console.log(`Lab report processed: ${file.name}`, result);
      } catch (error) {
        console.error(`Failed to upload lab report ${file.name}:`, error);
      }
    }
  };

  const createCaseMutation = useMutation({
    mutationFn: async (data: InsertCase) => {
      const response = await apiRequest("POST", "/api/cases", data);
      return response.json();
    },
    onSuccess: async (response) => {
      const caseId = response?.data?.id || response?.id;
      const patientId = form.getValues("patientId");

      // Upload lab reports if any files were uploaded
      if (uploadedFiles.length > 0 && caseId && patientId) {
        toast({
          title: "Uploading lab reports...",
          description: `Uploading ${uploadedFiles.length} file(s)`,
        });
        await uploadLabReports(caseId, patientId, uploadedFiles);
      }

      queryClient.invalidateQueries({ queryKey: ["/api/cases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/labs"] });

      toast({
        title: "Case created",
        description: uploadedFiles.length > 0
          ? `Case submitted with ${uploadedFiles.length} lab report(s).`
          : "The case has been submitted for AI analysis.",
      });

      if (caseId) {
        navigate(`/cases/${caseId}`);
      } else {
        console.error("Case created but no ID returned:", response);
        navigate("/cases");
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create the case.",
        variant: "destructive",
      });
    },
  });

  const handleNext = () => {
    if (currentStep === 1 && !form.getValues("patientId")) {
      form.setError("patientId", { message: "Please select a patient" });
      return;
    }
    if (currentStep === 2) {
      const result = caseFormSchema.safeParse(form.getValues());
      if (!result.success) {
        return;
      }
    }
    setCurrentStep((prev) => Math.min(prev + 1, 4));
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = () => {
    const data = form.getValues();
    createCaseMutation.mutate(data);
  };

  const handleFileUpload = (files: FileList | null) => {
    if (files) {
      setUploadedFiles((prev) => [...prev, ...Array.from(files)]);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate("/cases")} data-testid="button-back">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-semibold">Create New Case</h1>
          <p className="text-muted-foreground">Submit a clinical case for AI-assisted analysis</p>
        </div>
      </div>

      <StepIndicator currentStep={currentStep} />

      <Card>
        <CardHeader>
          <CardTitle>{steps[currentStep - 1].title}</CardTitle>
          <CardDescription>
            {currentStep === 1 && "Select the patient for this clinical case"}
            {currentStep === 2 && "Provide case type and clinical question"}
            {currentStep === 3 && "Upload relevant lab reports and documents"}
            {currentStep === 4 && "Review and submit the case for analysis"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)}>
              {currentStep === 1 && (
                <FormField
                  control={form.control}
                  name="patientId"
                  render={({ field }) => (
                    <FormItem>
                      <PatientSelectionStep
                        patients={patients}
                        selectedPatientId={field.value}
                        onSelect={field.onChange}
                        isLoading={patientsLoading}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              {currentStep === 2 && <CaseDetailsStep form={form} />}
              {currentStep === 3 && (
                <LabUploadStep
                  uploadedFiles={uploadedFiles}
                  onUpload={handleFileUpload}
                />
              )}
              {currentStep === 4 && (
                <ReviewStep
                  form={form}
                  patient={selectedPatient}
                  uploadedFiles={uploadedFiles}
                />
              )}
            </form>
          </Form>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between mt-6">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={currentStep === 1}
          data-testid="button-step-back"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <div className="flex items-center gap-2">
          <Progress value={(currentStep / 4) * 100} className="w-32 h-2" />
          <span className="text-sm text-muted-foreground">
            Step {currentStep} of 4
          </span>
        </div>

        {currentStep < 4 ? (
          <Button onClick={handleNext} data-testid="button-step-next">
            Next
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={createCaseMutation.isPending}
            data-testid="button-submit-case"
          >
            {createCaseMutation.isPending ? (
              <>
                <Brain className="h-4 w-4 mr-2 animate-pulse" />
                Submitting...
              </>
            ) : (
              <>
                <Brain className="h-4 w-4 mr-2" />
                Submit for Analysis
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
