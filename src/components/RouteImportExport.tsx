import { useState, useRef } from "react";
import {
  Download,
  Upload,
  FileJson,
  FileSpreadsheet,
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  LogIn,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import {
  exportRoutesAsJson,
  exportRoutesAsGeoJson,
  exportRoutesAsExcel,
  importRoutesFromGeoJson,
  bulkImportRoutesFromJson,
  downloadBlob,
} from "@/lib/api";
import { BulkImportResponse, RouteImportItem } from "@/types/route";

interface RouteImportExportProps {
  onImportComplete?: () => void;
}

export default function RouteImportExport({ onImportComplete }: RouteImportExportProps) {
  const { isLoggedIn, isAdminUser, openLoginDialog } = useAuth();
  const [loading, setLoading] = useState(false);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [result, setResult] = useState<BulkImportResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ==================== EXPORT HANDLERS ====================

  const handleExportJson = async () => {
    setLoading(true);
    setLoadingAction("json");
    setError(null);
    try {
      const response = await exportRoutesAsJson();
      const blob = new Blob([JSON.stringify(response.data, null, 2)], {
        type: "application/json",
      });
      downloadBlob(blob, `routes_export_${new Date().toISOString().split("T")[0]}.json`);
      toast({
        title: "Export Successful",
        description: "Routes exported as JSON file.",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to export routes as JSON";
      setError(message);
      toast({
        title: "Export Failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setLoadingAction(null);
    }
  };

  const handleExportGeoJson = async () => {
    setLoading(true);
    setLoadingAction("geojson");
    setError(null);
    try {
      const response = await exportRoutesAsGeoJson();
      const blob = new Blob([JSON.stringify(response.data, null, 2)], {
        type: "application/json",
      });
      downloadBlob(blob, `routes_export_${new Date().toISOString().split("T")[0]}.geojson`);
      toast({
        title: "Export Successful",
        description: "Routes exported as GeoJSON file.",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to export routes as GeoJSON";
      setError(message);
      toast({
        title: "Export Failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setLoadingAction(null);
    }
  };

  const handleExportExcel = async () => {
    setLoading(true);
    setLoadingAction("excel");
    setError(null);
    try {
      await exportRoutesAsExcel();
      toast({
        title: "Export Successful",
        description: "Routes exported as Excel file.",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to export routes as Excel";
      setError(message);
      toast({
        title: "Export Failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setLoadingAction(null);
    }
  };

  // ==================== IMPORT HANDLERS ====================

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setLoadingAction("import");
    setError(null);
    setResult(null);

    try {
      const response = await importRoutesFromGeoJson(file);
      if (response.success && response.data) {
        setResult(response.data);
        toast({
          title: "Import Complete",
          description: `Imported ${response.data.importedCount} routes successfully.`,
        });
        onImportComplete?.();
      } else {
        throw new Error(response.message || "Import failed");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to import routes";
      setError(message);
      toast({
        title: "Import Failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setLoadingAction(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleReimportFromExport = async () => {
    setLoading(true);
    setLoadingAction("reimport");
    setError(null);
    setResult(null);

    try {
      // 1. Export current routes
      const exportResponse = await exportRoutesAsJson();
      const exportedRoutes = exportResponse.data;

      if (!exportedRoutes || exportedRoutes.length === 0) {
        throw new Error("No routes to re-import");
      }

      // 2. Transform to import format (remove id, keep all other fields)
      const routesToImport: RouteImportItem[] = exportedRoutes.map((route) => ({
        name: route.name,
        abbreviation: route.abbreviation,
        trekName: route.trekName,
        description: route.description,
        region: route.region,
        minAltitude: route.minAltitude,
        maxAltitude: route.maxAltitude,
        durationDays: route.durationDays,
        distanceKm: route.distanceKm,
        difficultyLevel: route.difficultyLevel,
        geometryCoordinates: route.geometryCoordinates,
        rescueCategoryCode: route.rescueCategoryCode,
        estimatedRescueCost: route.estimatedRescueCost,
        isActive: route.isActive,
        metadata: route.metadata,
      }));

      // 3. Import (will skip duplicates)
      const importResponse = await bulkImportRoutesFromJson(routesToImport);
      if (importResponse.success && importResponse.data) {
        setResult(importResponse.data);
        toast({
          title: "Re-import Complete",
          description: `Processed ${importResponse.data.totalProcessed} routes.`,
        });
        onImportComplete?.();
      } else {
        throw new Error(importResponse.message || "Re-import failed");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to re-import routes";
      setError(message);
      toast({
        title: "Re-import Failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setLoadingAction(null);
    }
  };

  const clearResult = () => {
    setResult(null);
    setError(null);
  };

  // Check if user can perform actions
  const canPerformActions = isLoggedIn && isAdminUser;

  return (
    <Card className="shadow-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Download className="h-4 w-4" />
          Import / Export Routes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Auth Warning */}
        {!isLoggedIn && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Sign in as admin to import/export routes.
            </AlertDescription>
          </Alert>
        )}
        {isLoggedIn && !isAdminUser && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Admin role required to import/export routes.
            </AlertDescription>
          </Alert>
        )}

        {/* Login Button */}
        {!isLoggedIn && (
          <Button variant="outline" onClick={openLoginDialog} className="w-full">
            <LogIn className="mr-2 h-4 w-4" />
            Sign in to Continue
          </Button>
        )}

        {/* Main Content - Only show if can perform actions */}
        {canPerformActions && (
          <Accordion type="single" collapsible className="w-full">
            {/* Export Section */}
            <AccordionItem value="export">
              <AccordionTrigger className="text-sm py-2">
                <div className="flex items-center gap-2">
                  <Download className="h-4 w-4 text-blue-500" />
                  Export Routes
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-2 pt-2">
                <div className="grid grid-cols-1 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportJson}
                    disabled={loading}
                    className="justify-start"
                  >
                    {loadingAction === "json" ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <FileJson className="mr-2 h-4 w-4 text-blue-500" />
                    )}
                    Export as JSON
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportGeoJson}
                    disabled={loading}
                    className="justify-start"
                  >
                    {loadingAction === "geojson" ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <FileJson className="mr-2 h-4 w-4 text-green-500" />
                    )}
                    Export as GeoJSON
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportExcel}
                    disabled={loading}
                    className="justify-start"
                  >
                    {loadingAction === "excel" ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <FileSpreadsheet className="mr-2 h-4 w-4 text-purple-500" />
                    )}
                    Export as Excel
                  </Button>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Import Section */}
            <AccordionItem value="import">
              <AccordionTrigger className="text-sm py-2">
                <div className="flex items-center gap-2">
                  <Upload className="h-4 w-4 text-orange-500" />
                  Import Routes
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-2 pt-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".geojson,.json"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading}
                  className="w-full justify-start"
                >
                  {loadingAction === "import" ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="mr-2 h-4 w-4 text-orange-500" />
                  )}
                  Import GeoJSON File
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReimportFromExport}
                  disabled={loading}
                  className="w-full justify-start"
                >
                  {loadingAction === "reimport" ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4 text-gray-500" />
                  )}
                  Re-import from Export
                </Button>
                <p className="text-[10px] text-muted-foreground">
                  Supports .json and .geojson files with route data.
                </p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">{error}</AlertDescription>
          </Alert>
        )}

        {/* Result Display */}
        {result && (
          <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Import Result</h4>
              <Button variant="ghost" size="sm" onClick={clearResult} className="h-6 px-2 text-xs">
                Clear
              </Button>
            </div>

            <Separator />

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-2">
              <div className="flex flex-col items-center rounded-md bg-green-100 p-2 dark:bg-green-900/30">
                <CheckCircle2 className="h-4 w-4 text-green-600 mb-1" />
                <span className="text-lg font-bold text-green-700 dark:text-green-400">
                  {result.importedCount}
                </span>
                <span className="text-[10px] text-green-600 dark:text-green-500">Imported</span>
              </div>
              <div className="flex flex-col items-center rounded-md bg-yellow-100 p-2 dark:bg-yellow-900/30">
                <AlertTriangle className="h-4 w-4 text-yellow-600 mb-1" />
                <span className="text-lg font-bold text-yellow-700 dark:text-yellow-400">
                  {result.skippedCount}
                </span>
                <span className="text-[10px] text-yellow-600 dark:text-yellow-500">Skipped</span>
              </div>
              <div className="flex flex-col items-center rounded-md bg-red-100 p-2 dark:bg-red-900/30">
                <XCircle className="h-4 w-4 text-red-600 mb-1" />
                <span className="text-lg font-bold text-red-700 dark:text-red-400">
                  {result.failedCount}
                </span>
                <span className="text-[10px] text-red-600 dark:text-red-500">Failed</span>
              </div>
            </div>

            {/* Imported Routes */}
            {result.importedRoutes && result.importedRoutes.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  Imported Routes ({result.importedRoutes.length})
                </p>
                <ScrollArea className="h-[80px] rounded-md border bg-background p-2">
                  <ul className="space-y-0.5 text-xs">
                    {result.importedRoutes.map((name, i) => (
                      <li key={i} className="flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3 text-green-500" />
                        <span className="truncate">{name}</span>
                      </li>
                    ))}
                  </ul>
                </ScrollArea>
              </div>
            )}

            {/* Warnings */}
            {result.warnings && result.warnings.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-yellow-600">
                  Warnings ({result.warnings.length})
                </p>
                <ScrollArea className="h-[60px] rounded-md border border-yellow-200 bg-yellow-50 p-2 dark:border-yellow-800 dark:bg-yellow-900/20">
                  <ul className="space-y-0.5 text-[10px] text-yellow-700 dark:text-yellow-400">
                    {result.warnings.slice(0, 10).map((warning, i) => (
                      <li key={i}>{warning}</li>
                    ))}
                    {result.warnings.length > 10 && (
                      <li className="italic">...and {result.warnings.length - 10} more</li>
                    )}
                  </ul>
                </ScrollArea>
              </div>
            )}

            {/* Errors */}
            {result.errors && result.errors.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-red-600">Errors ({result.errors.length})</p>
                <ScrollArea className="h-[60px] rounded-md border border-red-200 bg-red-50 p-2 dark:border-red-800 dark:bg-red-900/20">
                  <ul className="space-y-0.5 text-[10px] text-red-700 dark:text-red-400">
                    {result.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </ScrollArea>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

