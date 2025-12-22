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
        <header className="flex h-14 items-center gap-4 border-b bg-background px-4 sticky top-0 z-10">
            <SidebarTrigger className="h-8 w-8 text-muted-foreground hover:text-foreground" />

            {/* Global Search */}
            <div className="flex-1 flex items-center max-w-xl">
                <GlobalSearch />
            </div>

            <div className="flex items-center gap-3 ml-auto">
                {/* Tenant Selector */}
                <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted/40 border border-border/50">
                    <VscOrganization className="h-4 w-4 text-muted-foreground" />
                    <div className="flex flex-col">
                        <span className="text-xs font-medium leading-none">General Hospital</span>
                        <span className="text-[10px] text-muted-foreground leading-none">Tenant ID: 56bb...</span>
                    </div>
                    <Badge variant="outline" className="ml-2 h-5 text-[10px] px-1.5 bg-background">PROD</Badge>
                </div>

                <div className="h-6 w-px bg-border mx-1" />

                {/* Notifications */}
                <Button variant="ghost" size="icon" className="h-8 w-8 relative text-muted-foreground hover:text-foreground">
                    <VscBell className="h-4 w-4" />
                    <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive border border-background" />
                </Button>

                {/* Theme Toggle */}
                <ThemeToggle />
            </div>
        </header>
    );
}
