import { useState, useEffect } from "react";
import { Pencil, Trash2, Save, X, LogIn, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";
import { Coordinates, DifficultyLevel } from "@/types/route";
import { RouteCreateOptions } from "@/hooks/useRoutes";
import { useAuth } from "@/contexts/AuthContext";
import { getPublicRegions, getPublicTrekNames, getPublicDifficultyLevels } from "@/lib/api";

interface DrawingControlsProps {
  isDrawing: boolean;
  drawnPoints: Coordinates[];
  routeName: string;
  onToggleDrawing: () => void;
  onClearPoints: () => void;
  onSaveRoute: (options: RouteCreateOptions) => void;
  onRouteNameChange: (name: string) => void;
  onUndoLastPoint: () => void;
}

export default function DrawingControls({
  isDrawing,
  drawnPoints,
  routeName,
  onToggleDrawing,
  onClearPoints,
  onSaveRoute,
  onRouteNameChange,
  onUndoLastPoint,
}: DrawingControlsProps) {
  const { isLoggedIn, isAdminUser, openLoginDialog } = useAuth();
  
  // Route creation fields
  const [region, setRegion] = useState("");
  const [trekName, setTrekName] = useState("");
  const [minAltitude, setMinAltitude] = useState("");
  const [maxAltitude, setMaxAltitude] = useState("");
  const [distanceKm, setDistanceKm] = useState("");
  const [durationDays, setDurationDays] = useState("");
  const [difficultyLevel, setDifficultyLevel] = useState<DifficultyLevel>("MODERATE");
  const [description, setDescription] = useState("");
  
  // Metadata from API
  const [regions, setRegions] = useState<string[]>([]);
  const [trekNames, setTrekNames] = useState<string[]>([]);
  const [difficultyLevels, setDifficultyLevels] = useState<string[]>([]);
  const [loadingMetadata, setLoadingMetadata] = useState(false);
  const [loadingTrekNames, setLoadingTrekNames] = useState(false);
  
  // Fetch regions and difficulty levels on mount
  useEffect(() => {
    const fetchMetadata = async () => {
      setLoadingMetadata(true);
      try {
        const [regionsRes, difficultyRes] = await Promise.all([
          getPublicRegions(),
          getPublicDifficultyLevels(),
        ]);
        if (regionsRes.success && regionsRes.data) {
          setRegions(regionsRes.data);
        }
        if (difficultyRes.success && difficultyRes.data) {
          setDifficultyLevels(difficultyRes.data);
        }
      } catch (error) {
        console.error("Failed to fetch metadata:", error);
      } finally {
        setLoadingMetadata(false);
      }
    };
    fetchMetadata();
  }, []);
  
  // Fetch trek names when region changes
  useEffect(() => {
    const fetchTrekNames = async () => {
      if (!region) {
        setTrekNames([]);
        return;
      }
      setLoadingTrekNames(true);
      try {
        const trekNamesRes = await getPublicTrekNames(region);
        if (trekNamesRes.success && trekNamesRes.data) {
          setTrekNames(trekNamesRes.data);
        }
      } catch (error) {
        console.error("Failed to fetch trek names:", error);
      } finally {
        setLoadingTrekNames(false);
      }
    };
    fetchTrekNames();
  }, [region]);
  
  // Reset form when drawing is toggled off
  useEffect(() => {
    if (!isDrawing) {
      setRegion("");
      setTrekName("");
      setMinAltitude("");
      setMaxAltitude("");
      setDistanceKm("");
      setDurationDays("");
      setDifficultyLevel("MODERATE");
      setDescription("");
    }
  }, [isDrawing]);
  
  const handleSave = () => {
    // Validate required fields
    if (!routeName.trim()) {
      return;
    }
    if (drawnPoints.length < 2) {
      return;
    }
    if (!region.trim()) {
      return;
    }
    
    const minAlt = parseInt(minAltitude);
    const maxAlt = parseInt(maxAltitude);
    
    // Ensure altitudes are valid numbers
    if (isNaN(minAlt) || minAlt < 0) {
      return;
    }
    if (isNaN(maxAlt) || maxAlt <= 0) {
      return;
    }
    
    const options: RouteCreateOptions = {
      name: routeName.trim(),
      region: region.trim(),
      minAltitude: minAlt,
      maxAltitude: maxAlt,
      difficultyLevel,
      description: description.trim() || undefined,
      trekName: trekName.trim() || undefined,
      durationDays: durationDays ? parseInt(durationDays) : undefined,
    };
    
    console.log("Saving route with options:", options);
    onSaveRoute(options);
  };
  
  // Validate form - now includes region validation
  const minAltValid = minAltitude !== "" && !isNaN(parseInt(minAltitude)) && parseInt(minAltitude) >= 0;
  const maxAltValid = maxAltitude !== "" && !isNaN(parseInt(maxAltitude)) && parseInt(maxAltitude) > 0;
  const isFormValid = routeName.trim() && drawnPoints.length >= 2 && region.trim() && minAltValid && maxAltValid;
  
  // Convert arrays to combobox options
  const regionOptions = regions.map((r) => ({ value: r, label: r }));
  const trekNameOptions = trekNames.map((t) => ({ value: t, label: t }));

  return (
    <Card className="shadow-card animate-fade-in">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Pencil className="h-4 w-4 text-primary" />
          Draw New Route
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isDrawing ? (
          <>
            {!isLoggedIn && (
              <Alert className="mb-3">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Sign in as admin to save routes permanently. You can still draw routes locally.
                </AlertDescription>
              </Alert>
            )}
            {isLoggedIn && !isAdminUser && (
              <Alert variant="destructive" className="mb-3">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Admin role required to save routes. Routes will only be saved locally.
                </AlertDescription>
              </Alert>
            )}
            <Button onClick={onToggleDrawing} className="w-full">
              <Pencil className="mr-2 h-4 w-4" />
              Start Drawing
            </Button>
            {!isLoggedIn && (
              <Button variant="outline" onClick={openLoginDialog} className="w-full">
                <LogIn className="mr-2 h-4 w-4" />
                Sign in to Save Permanently
              </Button>
            )}
          </>
        ) : (
          <>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="routeName">Route Name *</Label>
                <Input
                  id="routeName"
                  value={routeName}
                  onChange={(e) => onRouteNameChange(e.target.value)}
                  placeholder="Enter route name..."
                  className="h-9"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Region *</Label>
                <Combobox
                  options={regionOptions}
                  value={region}
                  onValueChange={setRegion}
                  placeholder="Select or type region..."
                  searchPlaceholder="Search regions..."
                  emptyText="No regions found."
                  allowCustom={true}
                  customLabel="Add new region"
                  disabled={loadingMetadata}
                  className="h-9"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Trek Name</Label>
                <div className="relative">
                  <Combobox
                    options={trekNameOptions}
                    value={trekName}
                    onValueChange={setTrekName}
                    placeholder={region ? "Select or type trek name..." : "Select a region first"}
                    searchPlaceholder="Search trek names..."
                    emptyText={region ? "No trek names found." : "Select a region first"}
                    allowCustom={true}
                    customLabel="Add new trek"
                    disabled={!region || loadingTrekNames}
                    className="h-9"
                  />
                  {loadingTrekNames && (
                    <Loader2 className="absolute right-8 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Routes with the same trek name are grouped as path variants
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="difficulty">Difficulty Level *</Label>
                <Select
                  value={difficultyLevel}
                  onValueChange={(v) => setDifficultyLevel(v as DifficultyLevel)}
                >
                  <SelectTrigger id="difficulty" className="h-9">
                    <SelectValue placeholder="Select difficulty..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EASY">Easy</SelectItem>
                    <SelectItem value="MODERATE">Moderate</SelectItem>
                    <SelectItem value="HARD">Hard</SelectItem>
                    <SelectItem value="VERY_HARD">Very Hard</SelectItem>
                    <SelectItem value="EXTREME">Extreme</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label htmlFor="minAltitude">Min Alt (m) *</Label>
                  <Input
                    id="minAltitude"
                    type="number"
                    value={minAltitude}
                    onChange={(e) => setMinAltitude(e.target.value)}
                    placeholder="e.g. 1400"
                    className="h-9"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxAltitude">Max Alt (m) *</Label>
                  <Input
                    id="maxAltitude"
                    type="number"
                    value={maxAltitude}
                    onChange={(e) => setMaxAltitude(e.target.value)}
                    placeholder="e.g. 5364"
                    className="h-9"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label htmlFor="distanceKm">Distance (km)</Label>
                  <Input
                    id="distanceKm"
                    type="number"
                    step="0.1"
                    value={distanceKm}
                    onChange={(e) => setDistanceKm(e.target.value)}
                    placeholder="e.g. 130.5"
                    className="h-9"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="durationDays">Duration (days)</Label>
                  <Input
                    id="durationDays"
                    type="number"
                    value={durationDays}
                    onChange={(e) => setDurationDays(e.target.value)}
                    placeholder="e.g. 14"
                    className="h-9"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description..."
                  className="h-9"
                />
              </div>
            </div>

            <div className="rounded-lg border bg-muted/50 p-3">
              <p className="text-sm text-muted-foreground">
                Points added: <span className="font-semibold text-foreground">{drawnPoints.length}</span>
              </p>
              {drawnPoints.length > 0 && (
                <div className="mt-2 max-h-20 space-y-1 overflow-y-auto text-xs text-muted-foreground">
                  {drawnPoints.slice(-5).map((point, i) => (
                    <div key={i}>
                      {drawnPoints.length - 5 + i + 1}. {point.lat.toFixed(4)}, {point.lng.toFixed(4)}
                    </div>
                  ))}
                  {drawnPoints.length > 5 && (
                    <div className="text-[10px] text-muted-foreground/60">
                      ...and {drawnPoints.length - 5} more points
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onUndoLastPoint}
                disabled={drawnPoints.length === 0}
                className="flex-1"
              >
                Undo
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onClearPoints}
                disabled={drawnPoints.length === 0}
                className="flex-1"
              >
                <Trash2 className="mr-1 h-3 w-3" />
                Clear
              </Button>
            </div>

            <div className="flex gap-2">
              <Button
                variant="destructive"
                onClick={onToggleDrawing}
                className="flex-1"
              >
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={!isFormValid}
                className="flex-1"
              >
                <Save className="mr-2 h-4 w-4" />
                {isLoggedIn && isAdminUser ? "Save" : "Save Locally"}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
