import { useState, useCallback, useEffect } from "react";
import {
  Search,
  Filter,
  Mountain,
  MapPin,
  ChevronDown,
  X,
  SlidersHorizontal,
  RotateCcw,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { DifficultyLevel, RouteSearchParams } from "@/types/route";
import { getPublicRegions } from "@/lib/api";

interface SearchFilterPanelProps {
  onSearch: (params: RouteSearchParams) => void;
  isLoading: boolean;
}

const DIFFICULTY_LEVELS: { value: DifficultyLevel; label: string; color: string }[] = [
  { value: "EASY", label: "Easy", color: "bg-green-500" },
  { value: "MODERATE", label: "Moderate", color: "bg-yellow-500" },
  { value: "HARD", label: "Hard", color: "bg-orange-500" },
  { value: "VERY_HARD", label: "Very Hard", color: "bg-red-500" },
  { value: "EXTREME", label: "Extreme", color: "bg-purple-500" },
];

const SORT_OPTIONS = [
  { value: "name", label: "Name" },
  { value: "maxAltitude", label: "Altitude" },
  { value: "distanceKm", label: "Distance" },
  { value: "difficultyLevel", label: "Difficulty" },
];

export default function SearchFilterPanel({
  onSearch,
  isLoading,
}: SearchFilterPanelProps) {
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [region, setRegion] = useState<string>("");
  const [regions, setRegions] = useState<string[]>([]);
  const [regionsLoading, setRegionsLoading] = useState(false);
  const [difficulty, setDifficulty] = useState<DifficultyLevel | "">("");
  const [altitudeRange, setAltitudeRange] = useState<[number, number]>([0, 9000]);
  const [sortBy, setSortBy] = useState("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // Fetch regions from public endpoint
  useEffect(() => {
    const fetchRegions = async () => {
      setRegionsLoading(true);
      try {
        const response = await getPublicRegions();
        if (response.success && response.data) {
          setRegions(response.data.sort());
        }
      } catch (error) {
        console.error("Failed to fetch regions:", error);
        // Fallback regions
        setRegions([
          "Annapurna",
          "Annapurna Region",
          "Everest",
          "Khumbu",
          "Langtang",
          "Manaslu",
          "Kathmandu Valley Trek",
          "Makalu Base Camp",
        ]);
      } finally {
        setRegionsLoading(false);
      }
    };
    fetchRegions();
  }, []);

  const activeFiltersCount = [
    region,
    difficulty,
    altitudeRange[0] > 0 || altitudeRange[1] < 9000,
  ].filter(Boolean).length;

  const handleSearch = useCallback(() => {
    const params: RouteSearchParams = {
      search: searchText || undefined,
      region: region || undefined,
      difficultyLevel: difficulty || undefined,
      // For altitude filtering: minAltitude filters routes with maxAltitude >= value
      // maxAltitude filters routes with maxAltitude <= value
      minAltitude: altitudeRange[0] > 0 ? altitudeRange[0] : undefined,
      maxAltitude: altitudeRange[1] < 9000 ? altitudeRange[1] : undefined,
      sortBy,
      sortDir,
      size: 50,
    };
    
    // Log search params for debugging
    console.log("Search params:", params);
    
    onSearch(params);
  }, [searchText, region, difficulty, altitudeRange, sortBy, sortDir, onSearch]);

  const handleReset = useCallback(() => {
    setSearchText("");
    setRegion("");
    setDifficulty("");
    setAltitudeRange([0, 9000]);
    setSortBy("name");
    setSortDir("asc");
  }, []);

  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        handleSearch();
      }
    },
    [handleSearch]
  );

  return (
    <div className="space-y-3">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search routes by name, region..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          onKeyPress={handleKeyPress}
          className="pl-9 pr-4"
        />
      </div>

      {/* Quick Filters */}
      <div className="flex flex-wrap gap-2">
        <Select
          value={region || "_all"}
          onValueChange={(v) => setRegion(v === "_all" ? "" : v)}
        >
          <SelectTrigger className="h-8 w-auto min-w-[120px] text-xs">
            <MapPin className="mr-1 h-3 w-3" />
            <SelectValue placeholder="Region" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">All Regions</SelectItem>
            {regionsLoading ? (
              <SelectItem value="_loading" disabled>
                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                Loading...
              </SelectItem>
            ) : (
              regions.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>

        <Select
          value={difficulty || "_all"}
          onValueChange={(v) => setDifficulty(v === "_all" ? "" : v as DifficultyLevel)}
        >
          <SelectTrigger className="h-8 w-auto min-w-[120px] text-xs">
            <Mountain className="mr-1 h-3 w-3" />
            <SelectValue placeholder="Difficulty" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">All Levels</SelectItem>
            {DIFFICULTY_LEVELS.map((level) => (
              <SelectItem key={level.value} value={level.value}>
                <div className="flex items-center gap-2">
                  <div className={cn("h-2 w-2 rounded-full", level.color)} />
                  {level.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Advanced Filters Toggle */}
      <Collapsible open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-full justify-between text-xs"
          >
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-3 w-3" />
              Advanced Filters
              {activeFiltersCount > 0 && (
                <Badge
                  variant="secondary"
                  className="ml-1 h-5 px-1.5 text-[10px]"
                >
                  {activeFiltersCount}
                </Badge>
              )}
            </div>
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform",
                isFiltersOpen && "rotate-180"
              )}
            />
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent className="space-y-4 pt-3">
          {/* Altitude Range */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">
                Max Altitude Range
              </Label>
              <span className="text-xs font-medium">
                {altitudeRange[0].toLocaleString()}m -{" "}
                {altitudeRange[1].toLocaleString()}m
              </span>
            </div>
            <Slider
              value={altitudeRange}
              onValueChange={(v) => setAltitudeRange(v as [number, number])}
              min={0}
              max={9000}
              step={100}
              className="py-2"
            />
            <p className="text-[10px] text-muted-foreground">
              Filter routes by their maximum altitude
            </p>
          </div>

          {/* Sort Options */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Sort By</Label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Order</Label>
              <Select
                value={sortDir}
                onValueChange={(v) => setSortDir(v as "asc" | "desc")}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asc">Ascending</SelectItem>
                  <SelectItem value="desc">Descending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Reset Filters */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="h-7 w-full text-xs text-muted-foreground"
          >
            <RotateCcw className="mr-1 h-3 w-3" />
            Reset Filters
          </Button>
        </CollapsibleContent>
      </Collapsible>

      {/* Active Filters Display */}
      {(region || difficulty || altitudeRange[0] > 0 || altitudeRange[1] < 9000) && (
        <div className="flex flex-wrap gap-1.5">
          {region && (
            <Badge variant="secondary" className="h-6 gap-1 pl-2 pr-1 text-xs">
              {region}
              <button
                onClick={() => setRegion("")}
                className="ml-1 rounded-full p-0.5 hover:bg-muted-foreground/20"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {difficulty && (
            <Badge variant="secondary" className="h-6 gap-1 pl-2 pr-1 text-xs">
              {DIFFICULTY_LEVELS.find((d) => d.value === difficulty)?.label}
              <button
                onClick={() => setDifficulty("")}
                className="ml-1 rounded-full p-0.5 hover:bg-muted-foreground/20"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {(altitudeRange[0] > 0 || altitudeRange[1] < 9000) && (
            <Badge variant="secondary" className="h-6 gap-1 pl-2 pr-1 text-xs">
              {altitudeRange[0]}m - {altitudeRange[1]}m
              <button
                onClick={() => setAltitudeRange([0, 9000])}
                className="ml-1 rounded-full p-0.5 hover:bg-muted-foreground/20"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
        </div>
      )}

      {/* Search Button */}
      <Button onClick={handleSearch} disabled={isLoading} className="w-full">
        {isLoading ? (
          <>
            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            Searching...
          </>
        ) : (
          <>
            <Search className="mr-2 h-4 w-4" />
            Search Routes
          </>
        )}
      </Button>
    </div>
  );
}
