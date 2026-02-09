/**
 * Interactive Dashboard Preview Component
 * 
 * A visually impressive, animated dashboard preview that showcases
 * the HealthMesh platform's capabilities on the landing page.
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Activity,
    AlertTriangle,
    CheckCircle2,
    Clock,
    Heart,
    Pill,
    TrendingUp,
    Users,
    Brain,
    Shield,
    Stethoscope,
    FileText,
} from "lucide-react";

// Simulated patient data for the preview
const patients = [
    { id: 1, name: "Sarah M.", age: 67, risk: "high", status: "Critical", mrn: "MRN-2847" },
    { id: 2, name: "John D.", age: 45, risk: "medium", status: "Stable", mrn: "MRN-1923" },
    { id: 3, name: "Emily R.", age: 32, risk: "low", status: "Improving", mrn: "MRN-3651" },
];

// Simulated alerts
const alerts = [
    { type: "drug", message: "Drug interaction detected: Warfarin + Aspirin", severity: "high" },
    { type: "lab", message: "Abnormal creatinine levels - Patient Sarah M.", severity: "medium" },
    { type: "vitals", message: "Heart rate elevated - Room 302", severity: "low" },
];

// Animated chart data points
const chartPoints = [35, 45, 38, 52, 48, 55, 62, 58, 65, 72, 68, 75];

export function InteractiveDashboardPreview() {
    const [activeTab, setActiveTab] = useState<"overview" | "patients" | "alerts">("overview");
    const [currentAlertIndex, setCurrentAlertIndex] = useState(0);
    const [animatedValue, setAnimatedValue] = useState(0);

    // Rotate through alerts
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentAlertIndex((prev) => (prev + 1) % alerts.length);
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    // Animate counter
    useEffect(() => {
        const target = 98.7;
        const duration = 2000;
        const steps = 60;
        const increment = target / steps;
        let current = 0;

        const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
                current = target;
                clearInterval(timer);
            }
            setAnimatedValue(current);
        }, duration / steps);

        return () => clearInterval(timer);
    }, []);

    return (
        <div className="w-full rounded-xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-1 shadow-2xl">
            {/* Window Chrome */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10">
                <div className="flex gap-1.5">
                    <div className="h-3 w-3 rounded-full bg-rose-500/80" />
                    <div className="h-3 w-3 rounded-full bg-amber-500/80" />
                    <div className="h-3 w-3 rounded-full bg-emerald-500/80" />
                </div>
                <div className="flex-1 text-center">
                    <span className="text-xs text-white/50 font-mono">healthmesh.azurewebsites.net/dashboard</span>
                </div>
            </div>

            {/* Dashboard Content */}
            <div className="p-4">
                {/* Tab Navigation */}
                <div className="flex gap-2 mb-4">
                    {[
                        { id: "overview", icon: Activity, label: "Overview" },
                        { id: "patients", icon: Users, label: "Patients" },
                        { id: "alerts", icon: AlertTriangle, label: "Alerts" },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${activeTab === tab.id
                                    ? "bg-primary text-white shadow-lg shadow-primary/30"
                                    : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white/80"
                                }`}
                        >
                            <tab.icon className="h-3.5 w-3.5" />
                            {tab.label}
                        </button>
                    ))}
                </div>

                <AnimatePresence mode="wait">
                    {activeTab === "overview" && (
                        <motion.div
                            key="overview"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="space-y-4"
                        >
                            {/* Stats Row */}
                            <div className="grid grid-cols-4 gap-3">
                                {[
                                    { icon: Users, label: "Active Patients", value: "247", color: "text-primary" },
                                    { icon: Brain, label: "AI Analyses", value: "1,284", color: "text-purple-400" },
                                    { icon: Shield, label: "Alerts Resolved", value: "98%", color: "text-emerald-400" },
                                    { icon: Clock, label: "Avg Response", value: "< 2min", color: "text-amber-400" },
                                ].map((stat, i) => (
                                    <motion.div
                                        key={stat.label}
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: i * 0.1 }}
                                        className="bg-white/5 rounded-lg p-3 border border-white/10"
                                    >
                                        <stat.icon className={`h-4 w-4 ${stat.color} mb-2`} />
                                        <div className="text-lg font-bold text-white">{stat.value}</div>
                                        <div className="text-[10px] text-white/50">{stat.label}</div>
                                    </motion.div>
                                ))}
                            </div>

                            {/* Chart and AI Panel */}
                            <div className="grid grid-cols-2 gap-3">
                                {/* Chart */}
                                <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-xs text-white/70">Patient Outcomes</span>
                                        <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                                    </div>
                                    <div className="h-20 flex items-end gap-1">
                                        {chartPoints.map((point, i) => (
                                            <motion.div
                                                key={i}
                                                initial={{ height: 0 }}
                                                animate={{ height: `${point}%` }}
                                                transition={{ delay: i * 0.05, duration: 0.5 }}
                                                className="flex-1 bg-gradient-to-t from-primary/50 to-primary rounded-t"
                                            />
                                        ))}
                                    </div>
                                </div>

                                {/* AI Insight */}
                                <div className="bg-gradient-to-br from-primary/20 to-purple-500/20 rounded-lg p-3 border border-primary/30">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Brain className="h-4 w-4 text-primary animate-pulse" />
                                        <span className="text-xs font-medium text-white">AI Insight</span>
                                    </div>
                                    <p className="text-[10px] text-white/70 leading-relaxed">
                                        Based on current vitals profile, patient Sarah M. shows
                                        elevated risk for cardiac event. Recommend immediate
                                        cardiology consult.
                                    </p>
                                    <div className="flex gap-2 mt-2">
                                        <button className="text-[9px] px-2 py-1 bg-primary/30 text-primary rounded hover:bg-primary/40 transition-colors">
                                            View Details
                                        </button>
                                        <button className="text-[9px] px-2 py-1 bg-white/10 text-white/70 rounded hover:bg-white/20 transition-colors">
                                            Dismiss
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {activeTab === "patients" && (
                        <motion.div
                            key="patients"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="space-y-2"
                        >
                            {patients.map((patient, i) => (
                                <motion.div
                                    key={patient.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.1 }}
                                    className="flex items-center gap-3 bg-white/5 rounded-lg p-3 border border-white/10 hover:bg-white/10 transition-colors cursor-pointer"
                                >
                                    <div className={`h-10 w-10 rounded-full flex items-center justify-center ${patient.risk === "high" ? "bg-rose-500/20" :
                                            patient.risk === "medium" ? "bg-amber-500/20" : "bg-emerald-500/20"
                                        }`}>
                                        <Stethoscope className={`h-5 w-5 ${patient.risk === "high" ? "text-rose-400" :
                                                patient.risk === "medium" ? "text-amber-400" : "text-emerald-400"
                                            }`} />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-medium text-white">{patient.name}</span>
                                            <span className="text-[10px] text-white/40">{patient.mrn}</span>
                                        </div>
                                        <div className="text-[10px] text-white/50">Age {patient.age} • {patient.status}</div>
                                    </div>
                                    <div className={`text-[10px] px-2 py-1 rounded-full ${patient.risk === "high" ? "bg-rose-500/20 text-rose-300" :
                                            patient.risk === "medium" ? "bg-amber-500/20 text-amber-300" : "bg-emerald-500/20 text-emerald-300"
                                        }`}>
                                        {patient.risk.charAt(0).toUpperCase() + patient.risk.slice(1)} Risk
                                    </div>
                                </motion.div>
                            ))}
                        </motion.div>
                    )}

                    {activeTab === "alerts" && (
                        <motion.div
                            key="alerts"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="space-y-2"
                        >
                            {/* Drug Interaction Alert */}
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="bg-rose-500/10 border border-rose-500/30 rounded-lg p-3"
                            >
                                <div className="flex items-start gap-3">
                                    <div className="h-8 w-8 rounded-lg bg-rose-500/20 flex items-center justify-center shrink-0">
                                        <Pill className="h-4 w-4 text-rose-400" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-xs font-medium text-rose-300">Drug Interaction Warning</span>
                                            <span className="text-[9px] px-1.5 py-0.5 bg-rose-500/30 text-rose-200 rounded">Critical</span>
                                        </div>
                                        <p className="text-[10px] text-white/60">
                                            Potential interaction detected between Warfarin and Aspirin
                                            for patient Sarah M. Risk of increased bleeding.
                                        </p>
                                    </div>
                                </div>
                            </motion.div>

                            {/* Lab Alert */}
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.1 }}
                                className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3"
                            >
                                <div className="flex items-start gap-3">
                                    <div className="h-8 w-8 rounded-lg bg-amber-500/20 flex items-center justify-center shrink-0">
                                        <FileText className="h-4 w-4 text-amber-400" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-xs font-medium text-amber-300">Abnormal Lab Result</span>
                                            <span className="text-[9px] px-1.5 py-0.5 bg-amber-500/30 text-amber-200 rounded">Medium</span>
                                        </div>
                                        <p className="text-[10px] text-white/60">
                                            Creatinine: 2.1 mg/dL (Normal: 0.7-1.3).
                                            Consider nephrology consult.
                                        </p>
                                    </div>
                                </div>
                            </motion.div>

                            {/* Vitals Alert */}
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.2 }}
                                className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3"
                            >
                                <div className="flex items-start gap-3">
                                    <div className="h-8 w-8 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0">
                                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-xs font-medium text-emerald-300">Alert Resolved</span>
                                            <span className="text-[9px] px-1.5 py-0.5 bg-emerald-500/30 text-emerald-200 rounded">Resolved</span>
                                        </div>
                                        <p className="text-[10px] text-white/60">
                                            Heart rate normalized for patient in Room 302.
                                            Vitals now within normal range.
                                        </p>
                                    </div>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Footer Status Bar */}
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/10">
                    <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] text-white/50">System Healthy</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-[10px] text-white/40">AI Accuracy: <span className="text-emerald-400">{animatedValue.toFixed(1)}%</span></span>
                        <span className="text-[10px] text-white/40">Last sync: Just now</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
