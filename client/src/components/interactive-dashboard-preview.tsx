/**
 * Interactive Dashboard Preview Component
 * 
 * A realistic preview of the HealthMesh Clinical Dashboard
 * that showcases the actual platform layout and features.
 */

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
    Activity,
    AlertTriangle,
    Brain,
    FileText,
    FlaskConical,
    Heart,
    LayoutDashboard,
    MessageSquare,
    Settings,
    Shield,
    Stethoscope,
    Users,
    Clipboard,
    QrCode,
    TrendingUp,
    CheckCircle,
    Clock,
    Sparkles,
} from "lucide-react";

// Sidebar navigation items matching the real dashboard
const sidebarItems = [
    { icon: LayoutDashboard, label: "Dashboard", active: true },
    { icon: Clipboard, label: "Cases" },
    { icon: Users, label: "Patients" },
    { icon: FileText, label: "Lab Reports" },
    { icon: QrCode, label: "QR Scan" },
];

const aiAgents = [
    { icon: Brain, label: "Agent Orchestrator" },
    { icon: AlertTriangle, label: "Early Deterioration" },
    { icon: Shield, label: "Medication Safety" },
    { icon: TrendingUp, label: "Lab Trends" },
    { icon: Shield, label: "Risk & Safety" },
    { icon: MessageSquare, label: "Clinical Chat" },
];

// Agent orchestration cards
const agentCards = [
    { icon: Brain, name: "Orchestrator", subtitle: "AI Coordinator", status: "running", lastRun: "05:59 PM", confidence: 95.0, color: "primary" },
    { icon: Stethoscope, name: "Patient Context", subtitle: "History & Vitals", status: "ready", lastRun: "06:03 PM", confidence: 92.3, color: "teal" },
    { icon: FlaskConical, name: "Labs & Reports", subtitle: "Pathology Analysis", status: "ready", lastRun: "05:45 PM", confidence: 88.8, color: "amber" },
    { icon: FileText, name: "Research", subtitle: "Clinical Guidelines", status: "ready", lastRun: "05:41 PM", confidence: 87.4, color: "purple" },
    { icon: Shield, name: "Risk & Safety", subtitle: "Safety Checks", status: "ready", lastRun: "06:00 PM", confidence: 85.4, color: "rose" },
    { icon: Heart, name: "Clinician", subtitle: "Human Interface", status: "ready", lastRun: "05:06 PM", confidence: 95.1, color: "emerald" },
];

export function InteractiveDashboardPreview() {
    const [animatedConfidence, setAnimatedConfidence] = useState(0);
    const [currentTime, setCurrentTime] = useState("06:05 PM");

    // Animate AI confidence counter
    useEffect(() => {
        const target = 64;
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
            setAnimatedConfidence(Math.round(current));
        }, duration / steps);

        return () => clearInterval(timer);
    }, []);

    return (
        <div className="w-full rounded-xl bg-[#0a1929] overflow-hidden shadow-2xl border border-white/10">
            {/* Window Chrome */}
            <div className="flex items-center gap-2 px-4 py-2.5 bg-[#0d2137] border-b border-white/10">
                <div className="flex gap-1.5">
                    <div className="h-3 w-3 rounded-full bg-rose-500/80" />
                    <div className="h-3 w-3 rounded-full bg-amber-500/80" />
                    <div className="h-3 w-3 rounded-full bg-emerald-500/80" />
                </div>
                <div className="flex-1 text-center">
                    <span className="text-[10px] text-white/40 font-mono">healthmesh.azurewebsites.net/dashboard</span>
                </div>
            </div>

            <div className="flex">
                {/* Sidebar */}
                <div className="w-[140px] bg-[#0d2137] border-r border-white/10 p-3 hidden md:block">
                    {/* Logo */}
                    <div className="flex items-center gap-2 mb-4 pb-3 border-b border-white/10">
                        <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-primary to-cyan-400 flex items-center justify-center">
                            <Heart className="h-3.5 w-3.5 text-white" />
                        </div>
                        <span className="text-[10px] font-semibold text-white">
                            Health<span className="text-primary">Mesh</span>
                        </span>
                    </div>

                    {/* Clinical Section */}
                    <div className="mb-3">
                        <span className="text-[8px] uppercase tracking-wider text-white/30 mb-1 block">Clinical</span>
                        {sidebarItems.map((item) => (
                            <div
                                key={item.label}
                                className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-[9px] mb-0.5 ${item.active
                                        ? "bg-primary text-white"
                                        : "text-white/50 hover:text-white/70"
                                    }`}
                            >
                                <item.icon className="h-3 w-3" />
                                {item.label}
                            </div>
                        ))}
                    </div>

                    {/* AI Decision Support Section */}
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-[8px] uppercase tracking-wider text-white/30">AI Decision Support</span>
                            <span className="text-[7px] px-1 py-0.5 rounded bg-cyan-500/20 text-cyan-400">BETA</span>
                        </div>
                        {aiAgents.slice(0, 4).map((item) => (
                            <div
                                key={item.label}
                                className="flex items-center gap-2 px-2 py-1.5 text-[9px] text-white/50"
                            >
                                <item.icon className="h-3 w-3" />
                                <span className="truncate">{item.label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 p-4">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <div className="flex items-center gap-2">
                                <LayoutDashboard className="h-4 w-4 text-primary" />
                                <h1 className="text-sm font-semibold text-white">Clinical Dashboard</h1>
                            </div>
                            <p className="text-[9px] text-white/40 mt-0.5">Caring for patients with intelligent support</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[8px] text-white/40">Updated {currentTime}</span>
                            <button className="text-[9px] px-3 py-1.5 bg-primary text-white rounded-md flex items-center gap-1">
                                <Sparkles className="h-3 w-3" />
                                New Case
                            </button>
                        </div>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-4 gap-2 mb-4">
                        {[
                            { label: "TOTAL CASES", value: "6", change: "+12%", icon: Clipboard, color: "primary" },
                            { label: "ACTIVE CASES", value: "0", icon: Activity, color: "teal" },
                            { label: "PENDING REVIEWS", value: "6", icon: Clock, color: "amber" },
                            { label: "CRITICAL ALERTS", value: "0", icon: AlertTriangle, color: "rose" },
                        ].map((stat, i) => (
                            <motion.div
                                key={stat.label}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.1 }}
                                className="bg-[#0d2137] rounded-lg p-2.5 border border-white/10"
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-[8px] text-white/40 uppercase">{stat.label}</span>
                                    <stat.icon className={`h-4 w-4 ${stat.color === "primary" ? "text-primary" :
                                            stat.color === "teal" ? "text-teal-400" :
                                                stat.color === "amber" ? "text-amber-400" : "text-rose-400"
                                        }`} />
                                </div>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-lg font-bold text-white">{stat.value}</span>
                                    {stat.change && (
                                        <span className="text-[8px] px-1.5 py-0.5 rounded bg-primary/20 text-primary">{stat.change}</span>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    {/* Agent Orchestration */}
                    <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <Brain className="h-3.5 w-3.5 text-white/70" />
                                <span className="text-[10px] font-medium text-white">Agent Orchestration</span>
                            </div>
                            <span className="text-[8px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center gap-1">
                                <CheckCircle className="h-2.5 w-2.5" />
                                System Healthy
                            </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            {agentCards.map((agent, i) => (
                                <motion.div
                                    key={agent.name}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: 0.3 + i * 0.1 }}
                                    className="bg-[#0d2137] rounded-lg p-2 border border-white/10"
                                >
                                    <div className="flex items-start justify-between mb-1.5">
                                        <div className="flex items-center gap-1.5">
                                            <div className={`h-5 w-5 rounded-md flex items-center justify-center ${agent.color === "primary" ? "bg-primary/20" :
                                                    agent.color === "teal" ? "bg-teal-500/20" :
                                                        agent.color === "amber" ? "bg-amber-500/20" :
                                                            agent.color === "purple" ? "bg-purple-500/20" :
                                                                agent.color === "rose" ? "bg-rose-500/20" : "bg-emerald-500/20"
                                                }`}>
                                                <agent.icon className={`h-2.5 w-2.5 ${agent.color === "primary" ? "text-primary" :
                                                        agent.color === "teal" ? "text-teal-400" :
                                                            agent.color === "amber" ? "text-amber-400" :
                                                                agent.color === "purple" ? "text-purple-400" :
                                                                    agent.color === "rose" ? "text-rose-400" : "text-emerald-400"
                                                    }`} />
                                            </div>
                                            <div>
                                                <div className="text-[9px] font-medium text-white">{agent.name}</div>
                                                <div className="text-[7px] text-white/40">{agent.subtitle}</div>
                                            </div>
                                        </div>
                                        <span className={`text-[7px] px-1 py-0.5 rounded ${agent.status === "running"
                                                ? "bg-primary/20 text-primary animate-pulse"
                                                : "bg-white/10 text-white/50"
                                            }`}>
                                            {agent.status === "running" ? "● Running" : "● Ready"}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="text-[7px] text-white/30">Last Run</div>
                                            <div className="text-[8px] text-white/70">{agent.lastRun}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-[7px] text-white/30">Confidence</div>
                                            <div className={`text-[8px] font-medium ${agent.confidence >= 90 ? "text-emerald-400" :
                                                    agent.confidence >= 85 ? "text-amber-400" : "text-rose-400"
                                                }`}>{agent.confidence}%</div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>

                    {/* Recent Cases Table */}
                    <div className="bg-[#0d2137] rounded-lg p-2.5 border border-white/10">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <Clipboard className="h-3 w-3 text-white/70" />
                                <span className="text-[10px] font-medium text-white">Recent Cases</span>
                            </div>
                            <span className="text-[8px] text-primary cursor-pointer hover:underline">View All</span>
                        </div>
                        <div className="grid grid-cols-4 gap-2 text-[8px] text-white/40 uppercase mb-1 px-1">
                            <span>Case ID</span>
                            <span>Type</span>
                            <span>Status</span>
                            <span>Action</span>
                        </div>
                        <div className="grid grid-cols-4 gap-2 text-[9px] text-white/70 px-1 py-1.5 bg-white/5 rounded">
                            <span className="text-primary">#eab5635f</span>
                            <span>Rare Disease</span>
                            <span className="flex items-center gap-1">
                                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                                Review Ready
                            </span>
                            <span className="text-white/40">→</span>
                        </div>
                    </div>
                </div>

                {/* Right Sidebar */}
                <div className="w-[160px] bg-[#0d2137] border-l border-white/10 p-3 hidden lg:block">
                    {/* Risk & Safety */}
                    <div className="mb-4">
                        <div className="flex items-center gap-2 mb-2">
                            <Shield className="h-3.5 w-3.5 text-white/70" />
                            <span className="text-[10px] font-medium text-white">Risk & Safety</span>
                        </div>
                        <div className="bg-[#0a1929] rounded-lg p-3 border border-white/10 text-center">
                            <div className="h-8 w-8 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-2">
                                <CheckCircle className="h-4 w-4 text-emerald-400" />
                            </div>
                            <div className="text-[9px] font-medium text-white">No active safety alerts</div>
                            <div className="text-[8px] text-white/40 mt-0.5">System is running within normal safety parameters</div>
                        </div>
                    </div>

                    {/* AI Confidence */}
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <Sparkles className="h-3.5 w-3.5 text-white/70" />
                            <span className="text-[10px] font-medium text-white">AI Confidence</span>
                        </div>
                        <div className="bg-[#0a1929] rounded-lg p-3 border border-white/10">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[8px] text-white/40">Average Score</span>
                                <motion.span
                                    className="text-lg font-bold text-primary"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                >
                                    {animatedConfidence}%
                                </motion.span>
                            </div>
                            {/* Progress bar */}
                            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden mb-2">
                                <motion.div
                                    className="h-full bg-gradient-to-r from-primary to-cyan-400 rounded-full"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${animatedConfidence}%` }}
                                    transition={{ duration: 2, ease: "easeOut" }}
                                />
                            </div>
                            <div className="flex gap-1">
                                <div className="flex-1 text-center py-1 bg-emerald-500/10 rounded text-[7px]">
                                    <span className="text-emerald-400">High</span>
                                    <div className="text-white/40">80-100%</div>
                                </div>
                                <div className="flex-1 text-center py-1 bg-amber-500/10 rounded text-[7px]">
                                    <span className="text-amber-400">Medium</span>
                                    <div className="text-white/40">50-79%</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
