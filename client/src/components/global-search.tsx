import * as React from "react";
import {
    Settings,
    User,
    FileText,
    Search,
    AlertCircle,
    Loader2,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
    CommandShortcut,
} from "@/components/ui/command";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";

interface Patient {
    id: string;
    demographics: {
        firstName: string;
        lastName: string;
        dateOfBirth: string;
    };
}

interface ClinicalCase {
    id: string;
    type: string;
    status: string;
    chiefComplaint?: string;
}

export function GlobalSearch() {
    const [open, setOpen] = React.useState(false);
    const [, setLocation] = useLocation();
    const [searchQuery, setSearchQuery] = React.useState("");

    // Only fetch when dialog is open
    const { data: casesData, isLoading: casesLoading } = useQuery({
        queryKey: ["/api/cases"],
        queryFn: async () => {
            const response = await apiRequest("GET", "/api/cases");
            const data: { success: boolean; data: ClinicalCase[] } = await response.json();
            return data.data || [];
        },
        enabled: open,
        staleTime: 30000, // Cache for 30 seconds
    });

    const { data: patientsData, isLoading: patientsLoading } = useQuery({
        queryKey: ["/api/patients"],
        queryFn: async () => {
            const response = await apiRequest("GET", "/api/patients");
            const data: { success: boolean; data: Patient[] } = await response.json();
            return data.data || [];
        },
        enabled: open,
        staleTime: 30000,
    });

    React.useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setOpen((open) => !open);
            }
        };

        document.addEventListener("keydown", down);
        return () => document.removeEventListener("keydown", down);
    }, []);

    const runCommand = React.useCallback((command: () => void) => {
        setOpen(false);
        command();
    }, []);

    // Filter cases based on search query
    const filteredCases = React.useMemo(() => {
        if (!Array.isArray(casesData)) return [];
        if (!searchQuery) return casesData.slice(0, 5); // Show first 5 if no search

        return casesData.filter((c) =>
            c.id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.chiefComplaint?.toLowerCase().includes(searchQuery.toLowerCase())
        ).slice(0, 10);
    }, [casesData, searchQuery]);

    // Filter patients based on search query
    const filteredPatients = React.useMemo(() => {
        if (!Array.isArray(patientsData)) return [];
        if (!searchQuery) return patientsData.slice(0, 5);

        return patientsData.filter((p) => {
            const fullName = `${p.demographics?.firstName} ${p.demographics?.lastName}`.toLowerCase();
            return fullName.includes(searchQuery.toLowerCase()) ||
                p.id?.toLowerCase().includes(searchQuery.toLowerCase());
        }).slice(0, 10);
    }, [patientsData, searchQuery]);

    const isLoading = casesLoading || patientsLoading;

    return (
        <>
            <div
                onClick={() => setOpen(true)}
                className="relative w-full max-w-xl cursor-pointer"
            >
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <div className="flex h-10 w-full items-center rounded-xl border border-border/50 bg-muted/30 px-3 py-2 pl-10 text-sm text-muted-foreground shadow-sm hover:bg-muted/50 transition-all duration-200 hover:border-primary/30">
                    Search patients, cases, labs...
                </div>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-1">
                    <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded-md border border-border/50 bg-muted/50 px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                        <span className="text-xs">⌘</span>K
                    </kbd>
                </div>
            </div>

            <CommandDialog open={open} onOpenChange={setOpen}>
                <CommandInput
                    placeholder="Type a command or search..."
                    value={searchQuery}
                    onValueChange={setSearchQuery}
                />
                <CommandList>
                    {isLoading ? (
                        <div className="flex items-center justify-center py-6">
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                            <span className="ml-2 text-sm text-muted-foreground">Loading...</span>
                        </div>
                    ) : (
                        <>
                            <CommandEmpty>No results found.</CommandEmpty>

                            {filteredCases.length > 0 && (
                                <CommandGroup heading="Cases">
                                    {filteredCases.map((caseItem, index) => (
                                        <CommandItem
                                            key={caseItem.id}
                                            onSelect={() => runCommand(() => setLocation(`/cases/${caseItem.id}`))}
                                        >
                                            <FileText className="mr-2 h-4 w-4" />
                                            <span>
                                                Case #{caseItem.id.slice(-6)}: {caseItem.chiefComplaint || caseItem.type}
                                            </span>
                                            {index === 0 && <CommandShortcut>⌘1</CommandShortcut>}
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            )}

                            {filteredPatients.length > 0 && (
                                <>
                                    <CommandSeparator />
                                    <CommandGroup heading="Patients">
                                        {filteredPatients.map((patient) => (
                                            <CommandItem
                                                key={patient.id}
                                                onSelect={() => runCommand(() => setLocation(`/patients/${patient.id}`))}
                                            >
                                                <User className="mr-2 h-4 w-4" />
                                                <span>
                                                    {patient.demographics?.firstName} {patient.demographics?.lastName}
                                                    {patient.demographics?.dateOfBirth && (
                                                        <span className="text-muted-foreground ml-1">
                                                            (DOB: {patient.demographics.dateOfBirth})
                                                        </span>
                                                    )}
                                                </span>
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </>
                            )}

                            <CommandSeparator />
                            <CommandGroup heading="System">
                                <CommandItem onSelect={() => runCommand(() => setLocation("/settings"))}>
                                    <Settings className="mr-2 h-4 w-4" />
                                    <span>Settings</span>
                                    <CommandShortcut>⌘S</CommandShortcut>
                                </CommandItem>
                                <CommandItem onSelect={() => runCommand(() => setLocation("/risk-safety"))}>
                                    <AlertCircle className="mr-2 h-4 w-4" />
                                    <span>Risk & Safety Dashboard</span>
                                </CommandItem>
                            </CommandGroup>
                        </>
                    )}
                </CommandList>
            </CommandDialog>
        </>
    );
}
