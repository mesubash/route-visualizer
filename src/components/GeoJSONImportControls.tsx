import { useState, useEffect, useRef, useCallback } from "react";
import {
  Upload,
  FileJson,
  Trash2,
  Save,
  X,
  LogIn,
  AlertCircle,
  Loader2,
  Plus,
  Eye,
  Combine,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Combobox } from "@/components/ui/combobox";
import { Coordinates, DifficultyLevel } from "@/types/route";
import { RouteCreateOptions } from "@/hooks/useRoutes";
import { useAuth } from "@/contexts/AuthContext";
import {
  getPublicRegions,
  getPublicTrekNames,
  getPublicDifficultyLevels,
} from "@/lib/api";
import { toast } from "@/hooks/use-toast";

interface GeoJSONSegment {
  id: string;
  name: string;
  coordinates: Coordinates[];
  source: "file" | "paste";
}

interface GeoJSONImportControlsProps {
  isImporting: boolean;
  onToggleImport: () => void;
  onSaveRoute: (options: RouteCreateOptions) => void;
  onPreviewCoordinates: (coordinates: Coordinates[]) => void;
  onClearPreview: () => void;
}

// Helper to extract coordinates from GeoJSON
function extractCoordinatesFromGeoJSON(geojson: unknown): Coordinates[] {
  const coords: Coordinates[] = [];

  const processCoordinates = (coordArray: number[][] | number[][][]) => {
    // Handle LineString coordinates [lng, lat] or [lng, lat, alt]
    if (Array.isArray(coordArray) && coordArray.length > 0) {
      if (typeof coordArray[0] === "number") {
        // Single coordinate [lng, lat]
        const [lng, lat] = coordArray as unknown as number[];
        coords.push({ lat, lng });
      } else if (Array.isArray(coordArray[0])) {
        // Array of coordinates
        if (typeof (coordArray[0] as number[])[0] === "number") {
          // LineString: [[lng, lat], ...]
          (coordArray as number[][]).forEach(([lng, lat]) => {
            coords.push({ lat, lng });
          });
        } else {
          // MultiLineString or Polygon: [[[lng, lat], ...], ...]
          (coordArray as number[][][]).forEach((ring) => {
            ring.forEach(([lng, lat]) => {
              coords.push({ lat, lng });
            });
          });
        }
      }
    }
  };

  const processGeometry = (geometry: { type: string; coordinates: unknown }) => {
    if (!geometry || !geometry.coordinates) return;

    switch (geometry.type) {
      case "Point":
        const [lng, lat] = geometry.coordinates as number[];
        coords.push({ lat, lng });
        break;
      case "LineString":
        processCoordinates(geometry.coordinates as number[][]);
        break;
      case "MultiLineString":
      case "Polygon":
        processCoordinates(geometry.coordinates as number[][][]);
        break;
      case "MultiPolygon":
        (geometry.coordinates as number[][][][]).forEach((polygon) => {
          polygon.forEach((ring) => {
            ring.forEach(([lng, lat]) => {
              coords.push({ lat, lng });
            });
          });
        });
        break;
    }
  };

  if (typeof geojson !== "object" || geojson === null) return coords;

  const gj = geojson as Record<string, unknown>;

  if (gj.type === "FeatureCollection" && Array.isArray(gj.features)) {
    gj.features.forEach((feature: { geometry?: unknown }) => {
      if (feature.geometry) {
        processGeometry(feature.geometry as { type: string; coordinates: unknown });
      }
    });
  } else if (gj.type === "Feature" && gj.geometry) {
    processGeometry(gj.geometry as { type: string; coordinates: unknown });
  } else if (gj.type && gj.coordinates) {
    processGeometry(gj as { type: string; coordinates: unknown });
  }

  return coords;
}

export default function GeoJSONImportControls({
  isImporting,
  onToggleImport,
  onSaveRoute,
  onPreviewCoordinates,
  onClearPreview,
}: GeoJSONImportControlsProps) {
  const { isLoggedIn, isAdminUser, openLoginDialog } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Route creation fields
  const [routeName, setRouteName] = useState("");
  const [region, setRegion] = useState("");
  const [trekName, setTrekName] = useState("");
  const [minAltitude, setMinAltitude] = useState("");
  const [maxAltitude, setMaxAltitude] = useState("");
  const [distanceKm, setDistanceKm] = useState("");
  const [durationDays, setDurationDays] = useState("");
  const [difficultyLevel, setDifficultyLevel] =
    useState<DifficultyLevel>("MODERATE");
  const [description, setDescription] = useState("");

  // GeoJSON import state
  const [segments, setSegments] = useState<GeoJSONSegment[]>([]);
  const [pasteContent, setPasteContent] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"file" | "paste">("file");

  // Metadata from API
  const [regions, setRegions] = useState<string[]>([]);
  const [trekNames, setTrekNames] = useState<string[]>([]);
  const [difficultyLevels, setDifficultyLevels] = useState<string[]>([]);
  const [loadingMetadata, setLoadingMetadata] = useState(false);
  const [loadingTrekNames, setLoadingTrekNames] = useState(false);

  // Combined coordinates from all segments
  const combinedCoordinates = segments.reduce<Coordinates[]>(
    (acc, segment) => [...acc, ...segment.coordinates],
    []
  );

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

  // Update preview when segments change
  useEffect(() => {
    if (combinedCoordinates.length > 0) {
      onPreviewCoordinates(combinedCoordinates);
    } else {
      onClearPreview();
    }
  }, [segments, onPreviewCoordinates, onClearPreview, combinedCoordinates]);

  // Reset form when import is toggled off
  useEffect(() => {
    if (!isImporting) {
      setRouteName("");
      setRegion("");
      setTrekName("");
      setMinAltitude("");
      setMaxAltitude("");
      setDistanceKm("");
      setDurationDays("");
      setDifficultyLevel("MODERATE");
      setDescription("");
      setSegments([]);
      setPasteContent("");
      setParseError(null);
      onClearPreview();
    }
  }, [isImporting, onClearPreview]);

  const parseGeoJSON = useCallback((content: string, sourceName: string, source: "file" | "paste"): GeoJSONSegment | null => {
    try {
      const parsed = JSON.parse(content);
      const coordinates = extractCoordinatesFromGeoJSON(parsed);

      if (coordinates.length === 0) {
        setParseError("No valid coordinates found in GeoJSON");
        return null;
      }

      setParseError(null);
      return {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: sourceName,
        coordinates,
        source,
      };
    } catch (e) {
      setParseError(`Invalid JSON: ${e instanceof Error ? e.message : "Parse error"}`);
      return null;
    }
  }, []);

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      const newSegments: GeoJSONSegment[] = [];

      for (const file of Array.from(files)) {
        try {
          const content = await file.text();
          const segment = parseGeoJSON(content, file.name, "file");
          if (segment) {
            newSegments.push(segment);
          }
        } catch (error) {
          toast({
            title: "Error reading file",
            description: `Failed to read ${file.name}`,
            variant: "destructive",
          });
        }
      }

      if (newSegments.length > 0) {
        setSegments((prev) => [...prev, ...newSegments]);
        toast({
          title: "Files imported",
          description: `Added ${newSegments.length} segment(s) with ${newSegments.reduce((acc, s) => acc + s.coordinates.length, 0)} total points`,
        });
      }

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [parseGeoJSON]
  );

  const handlePasteAdd = useCallback(() => {
    if (!pasteContent.trim()) return;

    const segment = parseGeoJSON(
      pasteContent,
      `Pasted segment ${segments.length + 1}`,
      "paste"
    );

    if (segment) {
      setSegments((prev) => [...prev, segment]);
      setPasteContent("");
      toast({
        title: "GeoJSON added",
        description: `Added segment with ${segment.coordinates.length} points`,
      });
    }
  }, [pasteContent, parseGeoJSON, segments.length]);

  const handleRemoveSegment = useCallback((id: string) => {
    setSegments((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const handleClearAllSegments = useCallback(() => {
    setSegments([]);
    onClearPreview();
  }, [onClearPreview]);

  const handleSave = () => {
    if (!routeName.trim()) return;
    if (combinedCoordinates.length < 2) return;
    if (!region.trim()) return;

    const minAlt = parseInt(minAltitude);
    const maxAlt = parseInt(maxAltitude);

    if (isNaN(minAlt) || minAlt < 0) return;
    if (isNaN(maxAlt) || maxAlt <= 0) return;

    const options: RouteCreateOptions = {
      name: routeName.trim(),
      region: region.trim(),
      minAltitude: minAlt,
      maxAltitude: maxAlt,
      difficultyLevel,
      description: description.trim() || undefined,
      trekName: trekName.trim() || undefined,
      durationDays: durationDays ? parseInt(durationDays) : undefined,
      distanceKm: distanceKm ? parseFloat(distanceKm) : undefined,
      // Pass coordinates through the hook
      coordinates: combinedCoordinates,
    };

    console.log("Saving route with options:", options);
    onSaveRoute(options);
  };

  // Validate form
  const minAltValid =
    minAltitude !== "" &&
    !isNaN(parseInt(minAltitude)) &&
    parseInt(minAltitude) >= 0;
  const maxAltValid =
    maxAltitude !== "" &&
    !isNaN(parseInt(maxAltitude)) &&
    parseInt(maxAltitude) > 0;
  const isFormValid =
    routeName.trim() &&
    combinedCoordinates.length >= 2 &&
    region.trim() &&
    minAltValid &&
    maxAltValid;

  // Convert arrays to combobox options
  const regionOptions = regions.map((r) => ({ value: r, label: r }));
  const trekNameOptions = trekNames.map((t) => ({ value: t, label: t }));

  return (
    <Card className="shadow-card animate-fade-in">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <FileJson className="h-4 w-4 text-primary" />
          Import Route
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isImporting ? (
          <>
            {!isLoggedIn && (
              <Alert className="mb-3">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Sign in as admin to save routes to the server.
                </AlertDescription>
              </Alert>
            )}
            {isLoggedIn && !isAdminUser && (
              <Alert variant="destructive" className="mb-3">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Admin role required to save routes.
                </AlertDescription>
              </Alert>
            )}
            <Button onClick={onToggleImport} className="w-full">
              <Upload className="mr-2 h-4 w-4" />
              Import GeoJSON
            </Button>
            {!isLoggedIn && (
              <Button
                variant="outline"
                onClick={openLoginDialog}
                className="w-full"
              >
                <LogIn className="mr-2 h-4 w-4" />
                Sign in to Save
              </Button>
            )}
          </>
        ) : (
          <div className="space-y-4">
            {/* GeoJSON Import Section */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "file" | "paste")}>
              <TabsList className="grid w-full grid-cols-2 h-8">
                <TabsTrigger value="file" className="text-xs">
                  <Upload className="mr-1.5 h-3 w-3" />
                  Upload Files
                </TabsTrigger>
                <TabsTrigger value="paste" className="text-xs">
                  <FileText className="mr-1.5 h-3 w-3" />
                  Paste JSON
                </TabsTrigger>
              </TabsList>

              <TabsContent value="file" className="mt-3 space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,.geojson"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-20 border-dashed"
                >
                  <div className="flex flex-col items-center gap-1">
                    <Upload className="h-5 w-5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      Click to upload .json or .geojson files
                    </span>
                    <span className="text-[10px] text-muted-foreground/60">
                      Multiple files supported
                    </span>
                  </div>
                </Button>
              </TabsContent>

              <TabsContent value="paste" className="mt-3 space-y-2">
                <Textarea
                  value={pasteContent}
                  onChange={(e) => {
                    setPasteContent(e.target.value);
                    setParseError(null);
                  }}
                  placeholder='Paste GeoJSON data here...&#10;&#10;Example:&#10;{"type": "LineString", "coordinates": [[85.3, 27.7], [85.4, 27.8]]}'
                  className="min-h-[100px] text-xs font-mono"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handlePasteAdd}
                  disabled={!pasteContent.trim()}
                  className="w-full"
                >
                  <Plus className="mr-1.5 h-3 w-3" />
                  Add Segment
                </Button>
              </TabsContent>
            </Tabs>

            {parseError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  {parseError}
                </AlertDescription>
              </Alert>
            )}

            {/* Imported Segments List */}
            {segments.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium">
                    Imported Segments ({segments.length})
                  </Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearAllSegments}
                    className="h-6 px-2 text-xs text-destructive hover:text-destructive"
                  >
                    <Trash2 className="mr-1 h-3 w-3" />
                    Clear All
                  </Button>
                </div>
                <ScrollArea className="h-[100px] rounded-md border bg-muted/30">
                  <div className="p-2 space-y-1">
                    {segments.map((segment, index) => (
                      <div
                        key={segment.id}
                        className="flex items-center justify-between bg-background rounded px-2 py-1.5 text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Badge
                            variant="secondary"
                            className="h-5 px-1.5 text-[10px]"
                          >
                            {index + 1}
                          </Badge>
                          <span className="truncate text-muted-foreground">
                            {segment.name}
                          </span>
                          <span className="text-[10px] text-muted-foreground/60">
                            ({segment.coordinates.length} pts)
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveSegment(segment.id)}
                          className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Combine className="h-3 w-3" />
                  <span>
                    Combined: <strong>{combinedCoordinates.length}</strong> total
                    points
                  </span>
                </div>
              </div>
            )}

            {/* Route Details Form */}
            {segments.length > 0 && (
              <div className="space-y-3 pt-2 border-t">
                <div className="space-y-2">
                  <Label htmlFor="routeName">Route Name *</Label>
                  <Input
                    id="routeName"
                    value={routeName}
                    onChange={(e) => setRouteName(e.target.value)}
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
                      placeholder={
                        region
                          ? "Select or type trek name..."
                          : "Select a region first"
                      }
                      searchPlaceholder="Search trek names..."
                      emptyText={
                        region ? "No trek names found." : "Select a region first"
                      }
                      allowCustom={true}
                      customLabel="Add new trek"
                      disabled={!region || loadingTrekNames}
                      className="h-9"
                    />
                    {loadingTrekNames && (
                      <Loader2 className="absolute right-8 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="difficulty">Difficulty Level *</Label>
                  <Select
                    value={difficultyLevel}
                    onValueChange={(v) =>
                      setDifficultyLevel(v as DifficultyLevel)
                    }
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
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              <Button
                variant="destructive"
                onClick={() => {
                  onToggleImport();
                  onClearPreview();
                }}
                className="flex-1"
              >
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={!isFormValid || !isLoggedIn || !isAdminUser}
                className="flex-1"
              >
                <Save className="mr-2 h-4 w-4" />
                Save Route
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
