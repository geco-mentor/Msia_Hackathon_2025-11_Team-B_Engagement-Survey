import { useRef } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, FileSpreadsheet, FileText, Calendar, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { useUpload } from '@/hooks/useUpload';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';

const DataImport = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadFile, status, isUploading, error, progress, reset } = useUpload();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await uploadFile(file);
      // Reset the input so the same file can be uploaded again if needed
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">Data Import</h1>
          <p className="text-muted-foreground text-sm mt-1">Upload pulse survey data and feedback for analysis</p>
        </div>

        {/* Upload Status Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
            <Button variant="outline" size="sm" onClick={reset} className="ml-auto">
              Dismiss
            </Button>
          </Alert>
        )}

        {status?.status === 'completed' && status.result && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Successfully processed {status.result.total_rows_processed} rows from {status.result.filename}
            </AlertDescription>
            <Button variant="outline" size="sm" onClick={reset} className="ml-auto">
              Dismiss
            </Button>
          </Alert>
        )}

        {isUploading && (
          <Card className="shadow-card border">
            <CardContent className="p-6">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  <div className="flex-1">
                    <p className="font-medium text-foreground text-sm">Processing Upload</p>
                    <p className="text-xs text-muted-foreground">{status?.message || 'Uploading file...'}</p>
                  </div>
                  <span className="text-sm font-medium text-primary">{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
            className="hidden"
            disabled={isUploading}
          />

          {/* Pulse Survey Upload */}
          <Card className="shadow-card border hover:shadow-card-hover transition-all cursor-pointer group">
            <CardContent className="p-6">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="p-4 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <FileSpreadsheet className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h3 className="font-display font-semibold text-foreground">Pulse Survey Data</h3>
                  <p className="text-xs text-muted-foreground mt-1">Upload CSV with engagement scores (1-5 ratings)</p>
                </div>
                <Button
                  className="w-full gap-2"
                  onClick={handleUploadClick}
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Upload CSV
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Text Feedback Upload */}
          <Card className="shadow-card border hover:shadow-card-hover transition-all cursor-pointer group">
            <CardContent className="p-6">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="p-4 rounded-full bg-accent/10 group-hover:bg-accent/20 transition-colors">
                  <FileText className="w-8 h-8 text-accent" />
                </div>
                <div>
                  <h3 className="font-display font-semibold text-foreground">Open Text Feedback</h3>
                  <p className="text-xs text-muted-foreground mt-1">Upload employee comments for sentiment analysis</p>
                </div>
                <Button variant="outline" className="w-full gap-2">
                  <Upload className="w-4 h-4" />
                  Upload Feedback
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Exit Interviews */}
          <Card className="shadow-card border hover:shadow-card-hover transition-all cursor-pointer group">
            <CardContent className="p-6">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="p-4 rounded-full bg-chart-3/10 group-hover:bg-chart-3/20 transition-colors">
                  <Calendar className="w-8 h-8 text-chart-3" />
                </div>
                <div>
                  <h3 className="font-display font-semibold text-foreground">Exit Interview Themes</h3>
                  <p className="text-xs text-muted-foreground mt-1">Import anonymised exit interview data</p>
                </div>
                <Button variant="outline" className="w-full gap-2">
                  <Upload className="w-4 h-4" />
                  Upload Data
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Imports */}
        <Card className="shadow-card border">
          <CardHeader>
            <CardTitle className="text-lg font-display">Recent Imports</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {status?.status === 'completed' && status.result && (
                <div className="flex items-center justify-between p-3 rounded-lg border bg-background">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-risk-healthy" />
                    <div>
                      <p className="font-medium text-foreground text-sm">{status.result.filename}</p>
                      <p className="text-xs text-muted-foreground">Pulse Survey • Just now</p>
                    </div>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {status.result.total_rows_saved.toLocaleString()} records
                  </span>
                </div>
              )}
              {[
                { file: 'pulse_survey_week48.csv', type: 'Pulse Survey', date: '2 days ago', records: 1247 },
                { file: 'feedback_november.csv', type: 'Text Feedback', date: '5 days ago', records: 892 },
                { file: 'exit_q4_2024.csv', type: 'Exit Interviews', date: '1 week ago', records: 34 },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg border bg-background">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-risk-healthy" />
                    <div>
                      <p className="font-medium text-foreground text-sm">{item.file}</p>
                      <p className="text-xs text-muted-foreground">{item.type} • {item.date}</p>
                    </div>
                  </div>
                  <span className="text-sm text-muted-foreground">{item.records.toLocaleString()} records</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default DataImport;