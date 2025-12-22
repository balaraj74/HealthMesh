
import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
        errorInfo: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        // Update state so the next render will show the fallback UI.
        return { hasError: true, error, errorInfo: null };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
        this.setState({ errorInfo });
    }

    private handleReload = () => {
        window.location.reload();
    };

    private handleGoHome = () => {
        window.location.href = "/";
    };

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6">
                    <Card className="max-w-md w-full shadow-lg border-destructive/20">
                        <CardHeader className="text-center">
                            <div className="mx-auto bg-destructive/10 p-3 rounded-full w-fit mb-4">
                                <AlertCircle className="h-8 w-8 text-destructive" />
                            </div>
                            <CardTitle className="text-xl text-destructive">Something went wrong</CardTitle>
                            <CardDescription>
                                The application encountered an unexpected error.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="bg-slate-100 dark:bg-slate-900 p-4 rounded-md text-sm font-mono overflow-auto max-h-48 border">
                                <p className="text-red-500 font-bold mb-2">
                                    {this.state.error?.message || "Unknown error"}
                                </p>
                                {this.state.errorInfo && (
                                    <pre className="text-xs text-slate-500 whitespace-pre-wrap">
                                        {this.state.errorInfo.componentStack}
                                    </pre>
                                )}
                            </div>

                            <div className="flex gap-3 pt-2">
                                <Button onClick={this.handleReload} className="flex-1 gap-2">
                                    <RefreshCw className="h-4 w-4" />
                                    Reload Page
                                </Button>
                                <Button variant="outline" onClick={this.handleGoHome} className="flex-1 gap-2">
                                    <Home className="h-4 w-4" />
                                    Go Home
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            );
        }

        return this.props.children;
    }
}
