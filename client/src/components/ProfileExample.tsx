/**
 * Profile Example Component
 * 
 * Demonstrates how to:
 * 1. Get user authentication state
 * 2. Acquire access token
 * 3. Call Microsoft Graph API
 * 4. Display user profile information
 * 
 * This is a reference implementation based on Azure quickstart guide
 */

import { useState } from "react";
import { useMsal } from "@azure/msal-react";
import { graphRequest } from "@/auth/authConfig";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Loader2, User, Mail, Building2, Phone, MapPin } from "lucide-react";

interface GraphUserProfile {
  displayName: string;
  givenName: string;
  surname: string;
  userPrincipalName: string;
  id: string;
  mail?: string;
  jobTitle?: string;
  officeLocation?: string;
  mobilePhone?: string;
  businessPhones?: string[];
}

export function ProfileExample() {
  const { instance, accounts } = useMsal();
  const [profile, setProfile] = useState<GraphUserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Request Profile Information from Microsoft Graph
   * 
   * This function demonstrates the complete flow:
   * 1. Acquire access token silently
   * 2. Call Microsoft Graph /me endpoint
   * 3. Parse and display user profile
   */
  const requestProfileData = async () => {
    if (accounts.length === 0) {
      setError("No account logged in");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Step 1: Acquire access token
      const request = {
        ...graphRequest,
        account: accounts[0],
      };

      const response = await instance.acquireTokenSilent(request);
      console.log("✅ Access token acquired:", response.accessToken.substring(0, 20) + "...");

      // Step 2: Call Microsoft Graph API
      const graphResponse = await fetch("https://graph.microsoft.com/v1.0/me", {
        headers: {
          Authorization: `Bearer ${response.accessToken}`,
        },
      });

      if (!graphResponse.ok) {
        throw new Error(`Graph API error: ${graphResponse.status}`);
      }

      // Step 3: Parse and display profile
      const userData = await graphResponse.json() as GraphUserProfile;
      console.log("✅ User profile retrieved:", userData);
      setProfile(userData);
    } catch (err) {
      console.error("❌ Error fetching profile:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch profile");
      
      // If silent token acquisition fails, try interactive
      if (err instanceof Error && err.message.includes("interaction_required")) {
        try {
          const response = await instance.acquireTokenPopup(graphRequest);
          const graphResponse = await fetch("https://graph.microsoft.com/v1.0/me", {
            headers: {
              Authorization: `Bearer ${response.accessToken}`,
            },
          });
          const userData = await graphResponse.json() as GraphUserProfile;
          setProfile(userData);
          setError(null);
        } catch (popupErr) {
          console.error("❌ Popup token acquisition failed:", popupErr);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Microsoft Graph Profile Example</CardTitle>
          <CardDescription>
            Click the button below to fetch your profile information from Microsoft Graph API
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Request Button */}
          <Button
            onClick={requestProfileData}
            disabled={isLoading || accounts.length === 0}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Fetching Profile...
              </>
            ) : (
              <>
                <User className="mr-2 h-4 w-4" />
                Request Profile Information
              </>
            )}
          </Button>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Profile Display */}
          {profile && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={`https://ui-avatars.com/api/?name=${profile.displayName}&size=128`} />
                    <AvatarFallback>
                      {profile.givenName?.[0]}{profile.surname?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle>{profile.displayName}</CardTitle>
                    <CardDescription>{profile.userPrincipalName}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3">
                  {profile.mail && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{profile.mail}</span>
                    </div>
                  )}

                  {profile.jobTitle && (
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{profile.jobTitle}</Badge>
                    </div>
                  )}

                  {profile.officeLocation && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{profile.officeLocation}</span>
                    </div>
                  )}

                  {profile.mobilePhone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{profile.mobilePhone}</span>
                    </div>
                  )}

                  {profile.businessPhones && profile.businessPhones.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{profile.businessPhones.join(", ")}</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground font-mono">
                    User ID: {profile.id}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Current Account Info */}
          {accounts.length > 0 && (
            <div className="text-sm text-muted-foreground">
              <p>Currently signed in as: <strong>{accounts[0].username}</strong></p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Technical Details Card */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-sm">How This Works</CardTitle>
        </CardHeader>
        <CardContent className="text-xs space-y-2 text-muted-foreground">
          <p><strong>1. Token Acquisition:</strong> Uses MSAL to get access token silently</p>
          <p><strong>2. API Call:</strong> Calls https://graph.microsoft.com/v1.0/me with Bearer token</p>
          <p><strong>3. Display Data:</strong> Parses and renders user profile information</p>
          <p className="mt-3 p-2 bg-muted rounded">
            <strong>Scopes Required:</strong> User.Read (configured in authConfig.ts)
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
