import { SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
    VscBell,
    VscOrganization
} from "react-icons/vsc";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { GlobalSearch } from "@/components/global-search";

export function TopHeader() {
    return (
        <header className="flex h-16 items-center gap-4 border-b border-border/50 bg-background/80 backdrop-blur-xl px-4 sticky top-0 z-10">
            <SidebarTrigger className="h-9 w-9 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/50" />

            {/* Global Search */}
            <div className="flex-1 flex items-center max-w-xl">
                <GlobalSearch />
            </div>

            <div className="flex items-center gap-2 ml-auto">
                {/* Tenant Selector */}
                <div className="hidden md:flex items-center gap-3 px-4 py-2 rounded-xl bg-muted/30 border border-border/50 backdrop-blur-sm">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                        <VscOrganization className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-sm font-medium leading-none">General Hospital</span>
                        <span className="text-[10px] text-muted-foreground leading-none mt-1">Tenant ID: 56bb...</span>
                    </div>
                    <Badge variant="outline" className="ml-2 h-5 text-[10px] px-2 bg-primary/10 text-primary border-primary/30 font-bold">
                        PROD
                    </Badge>
                </div>

                <div className="h-8 w-px bg-border/50 mx-1" />

                {/* Notifications */}
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl relative text-muted-foreground hover:text-foreground hover:bg-muted/50">
                    <VscBell className="h-4 w-4" />
                    <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 rounded-full bg-accent border-2 border-background animate-pulse" />
                </Button>

                {/* Theme Toggle */}
                <ThemeToggle />
            </div>
        </header>
    );
}
