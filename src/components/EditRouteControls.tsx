import { Edit3, Check, X, Trash2, AlertCircle, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Coordinates } from "@/types/route";
import { useAuth } from "@/contexts/AuthContext";

interface EditRouteControlsProps {
  isEditing: boolean;
  editPoints: Coordinates[];
  routeName: string;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onUndoPoint: () => void;
  onClearPoints: () => void;
  hasSelectedRoute: boolean;
}

export default function EditRouteControls({
  isEditing,
  editPoints,
  routeName,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onUndoPoint,
  onClearPoints,
  hasSelectedRoute,
}: EditRouteControlsProps) {
  const { isLoggedIn, isAdminUser, openLoginDialog } = useAuth();

  if (!hasSelectedRoute) return null;

  return (
    <Card className="shadow-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Edit3 className="h-4 w-4" />
          Edit Route
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!isEditing ? (
          <>
            {!isLoggedIn && (
              <Alert className="mb-3">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Sign in as admin to save edits to the server. Changes will only be local otherwise.
                </AlertDescription>
              </Alert>
            )}
            {isLoggedIn && !isAdminUser && (
              <Alert variant="destructive" className="mb-3">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Admin role required to edit routes on server.
                </AlertDescription>
              </Alert>
            )}
            <Button onClick={onStartEdit} variant="outline" className="w-full">
              <Edit3 className="mr-2 h-4 w-4" />
              Edit "{routeName}"
            </Button>
            {!isLoggedIn && (
              <Button variant="ghost" size="sm" onClick={openLoginDialog} className="w-full">
                <LogIn className="mr-2 h-4 w-4" />
                Sign in for Server Edits
              </Button>
            )}
          </>
        ) : (
          <>
            <div className="rounded-lg bg-amber-500/10 p-3 text-sm text-amber-600 dark:text-amber-400">
              <p className="font-medium">Editing Mode</p>
              <p className="text-xs mt-1">Click map to add points. Drag markers to move them.</p>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Points</span>
              <Badge variant="secondary">{editPoints.length}</Badge>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onUndoPoint}
                disabled={editPoints.length === 0}
                className="flex-1"
              >
                Undo
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onClearPoints}
                disabled={editPoints.length === 0}
                className="flex-1"
              >
                <Trash2 className="mr-1 h-3 w-3" />
                Clear
              </Button>
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={onCancelEdit} className="flex-1">
                <X className="mr-1 h-4 w-4" />
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={onSaveEdit}
                disabled={editPoints.length < 2}
                className="flex-1"
              >
                <Check className="mr-1 h-4 w-4" />
                {isLoggedIn && isAdminUser ? "Save" : "Save Locally"}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}