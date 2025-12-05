import { useState, useEffect, useCallback } from "react";
import { Edit3, Check, X, Trash2, AlertCircle, LogIn, Settings2, Loader2, GripVertical, Plus, MapPin, Navigation, ChevronDown, ChevronUp, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Combobox } from "@/components/ui/combobox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Coordinates, DifficultyLevel, RouteFeature } from "@/types/route";
import { RouteCreateOptions } from "@/hooks/useRoutes";
import { useAuth } from "@/contexts/AuthContext";
import { getPublicRegions, getPublicTrekNames, getPublicDifficultyLevels } from "@/lib/api";
import { cn } from "@/lib/utils";

interface EditRouteControlsProps {
  isEditing: boolean;
  editPoints: Coordinates[];
  selectedRoute: RouteFeature | null;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: (options: Partial<RouteCreateOptions>) => void;
  onDeleteRoute: () => Promise<boolean>;
  onUndoPoint: () => void;
  onClearPoints: () => void;
  onUpdatePoint: (index: number, coords: Coordinates) => void;
  onDeletePoint: (index: number) => void;
  onInsertPoint: (index: number, coords: Coordinates) => void;
  onMovePoint: (fromIndex: number, toIndex: number) => void;
  onFocusPoint: (index: number) => void;
  hasSelectedRoute: boolean;
}

export default function EditRouteControls({
  isEditing,
  editPoints,
  selectedRoute,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDeleteRoute,
  onUndoPoint,
  onClearPoints,
  onUpdatePoint,
  onDeletePoint,
  onInsertPoint,
  onMovePoint,
  onFocusPoint,
  hasSelectedRoute,
}: EditRouteControlsProps) {
  const { isLoggedIn, isAdminUser, openLoginDialog } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);
  const [expandedPointIndex, setExpandedPointIndex] = useState<number | null>(null);
  const [showPointList, setShowPointList] = useState(true);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Edit form fields
  const [editName, setEditName] = useState("");
  const [editRegion, setEditRegion] = useState("");
  const [editTrekName, setEditTrekName] = useState("");
  const [editMinAltitude, setEditMinAltitude] = useState("");
  const [editMaxAltitude, setEditMaxAltitude] = useState("");
  const [editDifficulty, setEditDifficulty] = useState<DifficultyLevel>("MODERATE");
  const [editDescription, setEditDescription] = useState("");
  const [activeEditTab, setActiveEditTab] = useState<"points" | "details">("points");
  
  // Metadata from API
  const [regions, setRegions] = useState<string[]>([]);
  const [trekNames, setTrekNames] = useState<string[]>([]);
  const [difficultyLevels, setDifficultyLevels] = useState<string[]>([]);
  const [loadingTrekNames, setLoadingTrekNames] = useState(false);
  
  // Fetch metadata on mount
  useEffect(() => {
    const fetchMetadata = async () => {
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
      }
    };
    fetchMetadata();
  }, []);
  
  // Fetch trek names when region changes
  useEffect(() => {
    const fetchTrekNames = async () => {
      if (!editRegion) {
        setTrekNames([]);
        return;
      }
      setLoadingTrekNames(true);
      try {
        const trekNamesRes = await getPublicTrekNames(editRegion);
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
  }, [editRegion]);
  
  // Initialize form with selected route data when editing starts
  useEffect(() => {
    if (isEditing && selectedRoute) {
      setEditName(selectedRoute.properties.routeName || "");
      setEditRegion(selectedRoute.properties.region || "");
      setEditTrekName(selectedRoute.properties.trekName || "");
      setEditMinAltitude(selectedRoute.properties.minAltitude?.toString() || "");
      setEditMaxAltitude(selectedRoute.properties.maxAltitude?.toString() || "");
      setEditDifficulty((selectedRoute.properties.roadType as DifficultyLevel) || "MODERATE");
      setEditDescription(selectedRoute.properties.description || "");
    }
  }, [isEditing, selectedRoute]);
  
  const handleSave = () => {
    const options: Partial<RouteCreateOptions> = {
      name: editName.trim() || selectedRoute?.properties.routeName,
      region: editRegion || undefined,
      minAltitude: editMinAltitude ? parseInt(editMinAltitude) : undefined,
      maxAltitude: editMaxAltitude ? parseInt(editMaxAltitude) : undefined,
      difficultyLevel: editDifficulty,
      description: editDescription || undefined,
      trekName: editTrekName || undefined,
    };
    onSaveEdit(options);
  };
  
  // Convert arrays to combobox options
  const regionOptions = regions.map((r) => ({ value: r, label: r }));
  const trekNameOptions = trekNames.map((t) => ({ value: t, label: t }));

  if (!hasSelectedRoute) return null;
  
  const routeName = selectedRoute?.properties.routeName || "";

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
            <div className="flex gap-2">
              <Button onClick={onStartEdit} variant="outline" className="flex-1">
                <Edit3 className="mr-2 h-4 w-4" />
                Edit
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="icon" className="shrink-0">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="z-[10001]">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Route</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete "{routeName}"? This action cannot be undone.
                      {!isLoggedIn && (
                        <span className="block mt-2 text-amber-600">
                          Note: You are not signed in. This will only remove the route locally.
                        </span>
                      )}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={async () => {
                        setIsDeleting(true);
                        await onDeleteRoute();
                        setIsDeleting(false);
                      }}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      disabled={isDeleting}
                    >
                      {isDeleting ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Deleting...</>
                      ) : (
                        "Delete"
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              {routeName}
            </p>
            {!isLoggedIn && (
              <Button variant="ghost" size="sm" onClick={openLoginDialog} className="w-full">
                <LogIn className="mr-2 h-4 w-4" />
                Sign in for Server Edits
              </Button>
            )}
          </>
        ) : (
          <div className="space-y-3">
            <div className="rounded-lg bg-amber-500/10 p-3 text-sm text-amber-600 dark:text-amber-400">
              <p className="font-medium">Editing: {selectedRoute?.properties.routeName}</p>
              <p className="text-xs mt-1">Switch tabs to edit points or details.</p>
            </div>

            {/* Edit Tabs */}
            <Tabs value={activeEditTab} onValueChange={(v) => setActiveEditTab(v as "points" | "details")} className="w-full">
              <TabsList className="w-full grid grid-cols-2 h-8">
                <TabsTrigger value="points" className="text-xs">
                  Points ({editPoints.length})
                </TabsTrigger>
                <TabsTrigger value="details" className="text-xs">
                  <Settings2 className="mr-1 h-3 w-3" />
                  Details
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="points" className="space-y-3 mt-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    {editPoints.length > 0
                      ? "Drag markers on map or edit coordinates below."
                      : "Click on the map to add points."}
                  </p>
                  {editPoints.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowPointList(!showPointList)}
                      className="h-6 px-2"
                    >
                      {showPointList ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    </Button>
                  )}
                </div>

                <div className="flex items-center justify-between py-2 px-3 rounded-md bg-muted/50">
                  <span className="text-sm text-muted-foreground">Total Points</span>
                  <Badge variant="secondary">{editPoints.length}</Badge>
                </div>

                {/* Enhanced Point List */}
                {showPointList && editPoints.length > 0 && (
                  <ScrollArea className="h-[280px] rounded-md border">
                    <div className="p-2 space-y-1">
                      {editPoints.map((point, index) => {
                        const isFirst = index === 0;
                        const isLast = index === editPoints.length - 1;
                        const isExpanded = expandedPointIndex === index;

                        return (
                          <div
                            key={index}
                            className={cn(
                              "rounded-lg border bg-card transition-all",
                              isExpanded && "ring-2 ring-primary/20",
                              draggedIndex === index && "opacity-50"
                            )}
                            draggable
                            onDragStart={() => setDraggedIndex(index)}
                            onDragEnd={() => setDraggedIndex(null)}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={() => {
                              if (draggedIndex !== null && draggedIndex !== index) {
                                onMovePoint(draggedIndex, index);
                              }
                              setDraggedIndex(null);
                            }}
                          >
                            {/* Point Header */}
                            <div
                              className="flex items-center gap-2 p-2 cursor-pointer hover:bg-muted/50"
                              onClick={() => setExpandedPointIndex(isExpanded ? null : index)}
                            >
                              <div className="cursor-grab active:cursor-grabbing">
                                <GripVertical className="h-4 w-4 text-muted-foreground" />
                              </div>

                              <div
                                className={cn(
                                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white",
                                  isFirst && "bg-green-500",
                                  isLast && !isFirst && "bg-red-500",
                                  !isFirst && !isLast && "bg-violet-500"
                                )}
                              >
                                {index + 1}
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1">
                                  {isFirst && <span className="text-[10px] text-green-600 font-medium">START</span>}
                                  {isLast && !isFirst && <span className="text-[10px] text-red-600 font-medium">END</span>}
                                  {!isFirst && !isLast && <span className="text-[10px] text-muted-foreground">Point {index + 1}</span>}
                                </div>
                                <p className="text-[10px] text-muted-foreground truncate">
                                  {point.lat.toFixed(6)}, {point.lng.toFixed(6)}
                                </p>
                              </div>

                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 shrink-0"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onFocusPoint(index);
                                      }}
                                    >
                                      <MapPin className="h-3 w-3" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Focus on map</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>

                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>

                            {/* Expanded Edit Panel */}
                            {isExpanded && (
                              <div className="border-t p-2 space-y-2 bg-muted/30">
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="space-y-1">
                                    <Label className="text-[10px] text-muted-foreground">Latitude</Label>
                                    <Input
                                      type="number"
                                      step="0.000001"
                                      value={point.lat}
                                      onChange={(e) => {
                                        const newLat = parseFloat(e.target.value);
                                        if (!isNaN(newLat)) {
                                          onUpdatePoint(index, { ...point, lat: newLat });
                                        }
                                      }}
                                      className="h-7 text-xs font-mono"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-[10px] text-muted-foreground">Longitude</Label>
                                    <Input
                                      type="number"
                                      step="0.000001"
                                      value={point.lng}
                                      onChange={(e) => {
                                        const newLng = parseFloat(e.target.value);
                                        if (!isNaN(newLng)) {
                                          onUpdatePoint(index, { ...point, lng: newLng });
                                        }
                                      }}
                                      className="h-7 text-xs font-mono"
                                    />
                                  </div>
                                </div>

                                <div className="flex gap-1 pt-1">
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="flex-1 h-7 text-xs"
                                          onClick={() => {
                                            // Insert a new point after this one (midpoint to next or offset)
                                            const nextPoint = editPoints[index + 1];
                                            const newCoords: Coordinates = nextPoint
                                              ? {
                                                  lat: (point.lat + nextPoint.lat) / 2,
                                                  lng: (point.lng + nextPoint.lng) / 2,
                                                }
                                              : {
                                                  lat: point.lat + 0.001,
                                                  lng: point.lng + 0.001,
                                                };
                                            onInsertPoint(index + 1, newCoords);
                                          }}
                                        >
                                          <Plus className="h-3 w-3 mr-1" />
                                          Add After
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Insert new point after this one</TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>

                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="destructive"
                                          size="sm"
                                          className="h-7 w-7 p-0"
                                          onClick={() => {
                                            onDeletePoint(index);
                                            setExpandedPointIndex(null);
                                          }}
                                          disabled={editPoints.length <= 2}
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        {editPoints.length <= 2
                                          ? "Cannot delete (min 2 points required)"
                                          : "Delete this point"}
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                )}

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onUndoPoint}
                    disabled={editPoints.length === 0}
                    className="flex-1 h-8 text-xs"
                  >
                    Undo Last
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onClearPoints}
                    disabled={editPoints.length === 0}
                    className="flex-1 h-8 text-xs"
                  >
                    <Trash2 className="mr-1 h-3 w-3" />
                    Clear All
                  </Button>
                </div>

                {/* Quick Stats */}
                {editPoints.length >= 2 && (
                  <div className="rounded-lg bg-muted/50 p-2 space-y-1">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Route Info</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">Start: </span>
                        <span className="font-mono">{editPoints[0].lat.toFixed(4)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">End: </span>
                        <span className="font-mono">{editPoints[editPoints.length - 1].lat.toFixed(4)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="details" className="space-y-3 mt-3">
                <div className="space-y-2">
                  <Label htmlFor="editName" className="text-xs">Route Name</Label>
                  <Input
                    id="editName"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Route name..."
                    className="h-8 text-xs"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-xs">Region</Label>
                  <Combobox
                    options={regionOptions}
                    value={editRegion}
                    onValueChange={setEditRegion}
                    placeholder="Select or type region..."
                    searchPlaceholder="Search regions..."
                    emptyText="No regions found."
                    allowCustom={true}
                    customLabel="Add new region"
                    className="h-8 text-xs"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-xs">Trek Name</Label>
                  <div className="relative">
                    <Combobox
                      options={trekNameOptions}
                      value={editTrekName}
                      onValueChange={setEditTrekName}
                      placeholder={editRegion ? "Select or type trek..." : "Select region first"}
                      searchPlaceholder="Search trek names..."
                      emptyText="No trek names found."
                      allowCustom={true}
                      customLabel="Add new trek"
                      disabled={!editRegion || loadingTrekNames}
                      className="h-8 text-xs"
                    />
                    {loadingTrekNames && (
                      <Loader2 className="absolute right-8 top-1/2 h-3 w-3 -translate-y-1/2 animate-spin text-muted-foreground" />
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label htmlFor="editMinAlt" className="text-xs">Min Alt (m)</Label>
                    <Input
                      id="editMinAlt"
                      type="number"
                      value={editMinAltitude}
                      onChange={(e) => setEditMinAltitude(e.target.value)}
                      placeholder="0"
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="editMaxAlt" className="text-xs">Max Alt (m)</Label>
                    <Input
                      id="editMaxAlt"
                      type="number"
                      value={editMaxAltitude}
                      onChange={(e) => setEditMaxAltitude(e.target.value)}
                      placeholder="0"
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="editDifficulty" className="text-xs">Difficulty</Label>
                  <Select value={editDifficulty} onValueChange={(v) => setEditDifficulty(v as DifficultyLevel)}>
                    <SelectTrigger id="editDifficulty" className="h-8 text-xs">
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
                
                <div className="space-y-2">
                  <Label htmlFor="editDesc" className="text-xs">Description</Label>
                  <Input
                    id="editDesc"
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    placeholder="Description..."
                    className="h-8 text-xs"
                  />
                </div>
              </TabsContent>
            </Tabs>

            {/* Action buttons - always visible */}
            <div className="flex gap-2 pt-2 border-t">
              <Button variant="ghost" size="sm" onClick={onCancelEdit} className="flex-1 h-9">
                <X className="mr-1 h-4 w-4" />
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={editPoints.length < 2}
                className="flex-1 h-9"
              >
                <Check className="mr-1 h-4 w-4" />
                {isLoggedIn && isAdminUser ? "Save Changes" : "Save Locally"}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}