import { useState } from 'react';
import {
  User,
  Calendar,
  Heart,
  Activity,
  Pill,
  FileText,
  AlertTriangle,
  TrendingUp,
  Clock,
  ChevronDown,
  ChevronUp,
  Shield,
  Brain,
  Stethoscope,
  X
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Alert, AlertDescription } from './ui/alert';
import { Separator } from './ui/separator';
import { ScrollArea } from './ui/scroll-area';

interface PatientLongitudinalDashboardProps {
  data: any; // PatientLongitudinalData from backend
  onClose: () => void;
}

export function PatientLongitudinalDashboard({ data, onClose }: PatientLongitudinalDashboardProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['demographics']));

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'critical':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'high':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'low':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      default:
        return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400';
    }
  };

  const getRiskColor = (score: number) => {
    if (score >= 75) return 'text-red-600 dark:text-red-400';
    if (score >= 50) return 'text-orange-600 dark:text-orange-400';
    if (score >= 25) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-green-600 dark:text-green-400';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const calculateAge = (dob: string) => {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm overflow-y-auto">
      <div className="container max-w-7xl mx-auto p-4 md:p-6">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm pb-4 mb-6 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Stethoscope className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                  {data.patient.firstName} {data.patient.lastName}
                </h1>
                <div className="flex items-center gap-4 mt-1 text-sm text-slate-600 dark:text-slate-400">
                  <span className="flex items-center gap-1">
                    <User className="w-4 h-4" />
                    {data.patient.gender} · {calculateAge(data.patient.dateOfBirth)}y
                  </span>
                  <span className="flex items-center gap-1">
                    <Shield className="w-4 h-4" />
                    {data.identifiers.masterPatientIdentifier}
                  </span>
                  <span className="flex items-center gap-1">
                    <Activity className="w-4 h-4" />
                    {data.patient.bloodGroup || 'Unknown'}
                  </span>
                </div>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-6 h-6" />
            </Button>
          </div>
        </div>

        {/* Critical Alerts */}
        {data.alerts && data.alerts.length > 0 && (
          <div className="mb-6 space-y-2">
            {data.alerts.map((alert: any) => (
              <Alert
                key={alert.id}
                variant={alert.severity === 'critical' ? 'destructive' : 'default'}
                className={alert.severity === 'critical' ? '' : 'border-l-4 border-orange-500'}
              >
                <AlertTriangle className="h-5 w-5" />
                <AlertDescription className="ml-2">
                  <strong>{alert.message}</strong>
                  {alert.details && <span className="block text-sm mt-1">{alert.details}</span>}
                </AlertDescription>
              </Alert>
            ))}
          </div>
        )}

        {/* Risk Scores */}
        {data.riskScores && (
          <Card className="mb-6 border-l-4 border-l-blue-500">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingUp className="w-5 h-5" />
                Risk Assessment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6">
                <div className="flex-1">
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className={`text-4xl font-bold ${getRiskColor(data.riskScores.overall)}`}>
                      {data.riskScores.overall}
                    </span>
                    <span className="text-sm text-slate-600 dark:text-slate-400">/ 100</span>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Overall Risk Score</p>
                </div>
                {data.riskScores.riskFactors && data.riskScores.riskFactors.length > 0 && (
                  <div className="flex-1">
                    <p className="text-sm font-semibold mb-2">Risk Factors:</p>
                    <div className="flex flex-wrap gap-2">
                      {data.riskScores.riskFactors.map((factor: string, idx: number) => (
                        <Badge key={idx} variant="secondary">{factor}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="clinical">Clinical Data</TabsTrigger>
            <TabsTrigger value="ai-insights">AI Insights</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {/* Demographics */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <User className="w-5 h-5" />
                    Demographics
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="grid grid-cols-2 gap-2">
                    <span className="text-slate-600 dark:text-slate-400">DOB:</span>
                    <span className="font-medium">{formatDate(data.patient.dateOfBirth)}</span>
                    
                    <span className="text-slate-600 dark:text-slate-400">Gender:</span>
                    <span className="font-medium">{data.patient.gender}</span>
                    
                    <span className="text-slate-600 dark:text-slate-400">Blood:</span>
                    <span className="font-medium">{data.patient.bloodGroup || 'N/A'}</span>
                    
                    {data.patient.contactNumber && (
                      <>
                        <span className="text-slate-600 dark:text-slate-400">Phone:</span>
                        <span className="font-medium">{data.patient.contactNumber}</span>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Active Cases */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <FileText className="w-5 h-5" />
                    Clinical Cases
                    <Badge className="ml-auto">{data.clinicalCases?.length || 0}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {data.clinicalCases && data.clinicalCases.length > 0 ? (
                    <ScrollArea className="h-48">
                      <div className="space-y-3">
                        {data.clinicalCases.slice(0, 5).map((case_: any) => (
                          <div key={case_.id} className="border-l-2 border-blue-500 pl-3 py-1">
                            <p className="font-medium text-sm">{case_.chiefComplaint}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                {case_.status}
                              </Badge>
                              <span className="text-xs text-slate-600 dark:text-slate-400">
                                {formatDate(case_.admissionDate)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  ) : (
                    <p className="text-sm text-slate-600 dark:text-slate-400">No cases recorded</p>
                  )}
                </CardContent>
              </Card>

              {/* Active Medications */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Pill className="w-5 h-5" />
                    Active Medications
                    <Badge className="ml-auto">
                      {data.medications?.filter((m: any) => m.isActive).length || 0}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {data.medications && data.medications.some((m: any) => m.isActive) ? (
                    <ScrollArea className="h-48">
                      <div className="space-y-3">
                        {data.medications
                          .filter((m: any) => m.isActive)
                          .slice(0, 5)
                          .map((med: any) => (
                            <div key={med.id} className="border-l-2 border-green-500 pl-3 py-1">
                              <p className="font-medium text-sm">{med.medicationName}</p>
                              <p className="text-xs text-slate-600 dark:text-slate-400">
                                {med.dosage} · {med.frequency}
                              </p>
                            </div>
                          ))}
                      </div>
                    </ScrollArea>
                  ) : (
                    <p className="text-sm text-slate-600 dark:text-slate-400">No active medications</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Allergies & Conditions */}
            <div className="grid gap-6 md:grid-cols-2">
              {/* Allergies */}
              {data.allergies && data.allergies.length > 0 && (
                <Card className="border-l-4 border-l-red-500">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                      Allergies
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {data.allergies.map((allergy: any) => (
                        <div key={allergy.id} className="flex items-start gap-3">
                          <Badge className={getSeverityColor(allergy.severity)}>
                            {allergy.severity}
                          </Badge>
                          <div className="flex-1">
                            <p className="font-medium">{allergy.allergen}</p>
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                              {allergy.reaction}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Chronic Conditions */}
              {data.conditions && data.conditions.some((c: any) => c.isActive) && (
                <Card className="border-l-4 border-l-orange-500">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Heart className="w-5 h-5 text-orange-600" />
                      Chronic Conditions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {data.conditions
                        .filter((c: any) => c.isActive)
                        .map((condition: any) => (
                          <div key={condition.id} className="flex items-start gap-3">
                            {condition.severity && (
                              <Badge className={getSeverityColor(condition.severity)}>
                                {condition.severity}
                              </Badge>
                            )}
                            <div className="flex-1">
                              <p className="font-medium">{condition.conditionName}</p>
                              <p className="text-sm text-slate-600 dark:text-slate-400">
                                Status: {condition.clinicalStatus}
                                {condition.onsetDate && ` · Since ${formatDate(condition.onsetDate)}`}
                              </p>
                            </div>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Timeline Tab */}
          <TabsContent value="timeline">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Patient Care Timeline
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.timeline && data.timeline.length > 0 ? (
                  <ScrollArea className="h-[600px] pr-4">
                    <div className="relative">
                      {/* Timeline line */}
                      <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-slate-200 dark:bg-slate-700" />
                      
                      <div className="space-y-6">
                        {data.timeline.map((event: any, idx: number) => (
                          <div key={event.id} className="relative pl-16">
                            {/* Timeline dot */}
                            <div className={`absolute left-4 w-5 h-5 rounded-full border-4 border-background ${
                              event.severity === 'critical' ? 'bg-red-500' :
                              event.severity === 'high' ? 'bg-orange-500' :
                              event.severity === 'medium' ? 'bg-yellow-500' :
                              'bg-blue-500'
                            }`} />
                            
                            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4">
                              <div className="flex items-start justify-between mb-2">
                                <div>
                                  <Badge variant="outline" className="mb-2">
                                    {event.type}
                                  </Badge>
                                  <h4 className="font-semibold">{event.title}</h4>
                                </div>
                                <span className="text-sm text-slate-600 dark:text-slate-400">
                                  {formatDate(event.timestamp)}
                                </span>
                              </div>
                              <p className="text-sm text-slate-600 dark:text-slate-400">
                                {event.description}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </ScrollArea>
                ) : (
                  <p className="text-center text-slate-600 dark:text-slate-400 py-8">
                    No timeline events recorded
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Clinical Data Tab */}
          <TabsContent value="clinical" className="space-y-6">
            {/* Lab Results */}
            {data.labResults && data.labResults.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    Recent Lab Results
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2">Test</th>
                          <th className="text-left py-2">Value</th>
                          <th className="text-left py-2">Range</th>
                          <th className="text-left py-2">Status</th>
                          <th className="text-left py-2">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.labResults.slice(0, 10).map((lab: any) => (
                          <tr key={lab.id} className="border-b">
                            <td className="py-2 font-medium">{lab.testName}</td>
                            <td className="py-2">
                              {lab.value} {lab.unit}
                            </td>
                            <td className="py-2 text-slate-600 dark:text-slate-400">
                              {lab.referenceRange || 'N/A'}
                            </td>
                            <td className="py-2">
                              <Badge className={
                                lab.isAbnormal
                                  ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30'
                                  : 'bg-green-100 text-green-800 dark:bg-green-900/30'
                              }>
                                {lab.interpretation}
                              </Badge>
                            </td>
                            <td className="py-2 text-slate-600 dark:text-slate-400">
                              {formatDate(lab.observedDate)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* All Medications */}
            {data.medications && data.medications.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Pill className="w-5 h-5" />
                    Medication History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {data.medications.map((med: any) => (
                      <div
                        key={med.id}
                        className={`border-l-4 pl-4 py-2 ${
                          med.isActive ? 'border-green-500' : 'border-slate-300'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-semibold">{med.medicationName}</h4>
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                              {med.dosage} · {med.frequency} · {med.route}
                            </p>
                            {med.indication && (
                              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                                Indication: {med.indication}
                              </p>
                            )}
                            <p className="text-xs text-slate-500 mt-1">
                              Prescribed by {med.prescribedBy} on {formatDate(med.prescriptionDate)}
                            </p>
                          </div>
                          <Badge variant={med.isActive ? 'default' : 'secondary'}>
                            {med.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* AI Insights Tab */}
          <TabsContent value="ai-insights">
            {data.aiInsights && data.aiInsights.length > 0 ? (
              <div className="space-y-4">
                {data.aiInsights.map((insight: any) => (
                  <Card key={insight.id} className="border-l-4 border-l-purple-500">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                            <Brain className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">{insight.title}</CardTitle>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline">{insight.category}</Badge>
                              {insight.riskLevel && (
                                <Badge className={getSeverityColor(insight.riskLevel)}>
                                  {insight.riskLevel} risk
                                </Badge>
                              )}
                              {insight.confidenceScore && (
                                <span className="text-sm text-slate-600 dark:text-slate-400">
                                  {insight.confidenceScore}% confidence
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <Badge variant={insight.reviewed ? 'default' : 'secondary'}>
                          {insight.reviewed ? 'Reviewed' : 'Pending Review'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-slate-700 dark:text-slate-300 mb-4">
                        {insight.summary}
                      </p>
                      
                      {insight.recommendations && insight.recommendations.length > 0 && (
                        <div>
                          <p className="font-semibold text-sm mb-2">Recommendations:</p>
                          <ul className="list-disc list-inside space-y-1 text-sm text-slate-600 dark:text-slate-400">
                            {insight.recommendations.map((rec: string, idx: number) => (
                              <li key={idx}>{rec}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      <p className="text-xs text-slate-500 mt-4">
                        Generated {formatDate(insight.generatedAt)}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Brain className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-600 dark:text-slate-400">
                    No AI insights available yet
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
