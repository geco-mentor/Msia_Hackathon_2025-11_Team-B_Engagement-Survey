import { useRef, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, FileSpreadsheet, FileText, Calendar, CheckCircle2, Loader2, AlertCircle, Sparkles } from 'lucide-react';
import { useUpload } from '@/hooks/useUpload'; // Existing hook for standard uploads
import { useCsvUpload } from '@/hooks/test-hooks'; // NEW: Hook for AI N8n Upload
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';

const DataImport = () => {
  // --- 1. Existing Logic (Pulse Survey) ---
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadFile, status, isUploading, error, progress, reset } = useUpload();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await uploadFile(file);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleUploadClick = () => fileInputRef.current?.click();

  // --- 2. NEW Logic (AI Feedback / Open Text) ---
  const feedbackInputRef = useRef<HTMLInputElement>(null);
  const {
    uploadCsv: uploadFeedback,
    isUploading: isFeedbackUploading,
    error: feedbackError,
    response: feedbackResponse,
    resetState: resetFeedback
  } = useCsvUpload();

  const handleFeedbackSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await uploadFeedback(file);
      if (feedbackInputRef.current) feedbackInputRef.current.value = '';
    }
  };

  const handleFeedbackClick = () => feedbackInputRef.current?.click();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">Data Import</h1>
          <p className="text-muted-foreground text-sm mt-1">Upload pulse survey data and feedback for analysis</p>
        </div>

        {/* --- ERROR ALERTS --- */}
        {(error || feedbackError) && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error || feedbackError}</AlertDescription>
            <Button variant="outline" size="sm" onClick={() => { reset(); resetFeedback(); }} className="ml-auto">
              Dismiss
            </Button>
          </Alert>
        )}

        {/* --- SUCCESS ALERTS (Standard) --- */}
        {status?.status === 'completed' && status.result && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Successfully processed {status.result.total_rows_processed} rows from {status.result.filename}
            </AlertDescription>
            <Button variant="outline" size="sm" onClick={reset} className="ml-auto">Dismiss</Button>
          </Alert>
        )}

        {/* --- NEW: AI PROCESSING SUCCESS ALERT --- */}
        {feedbackResponse && (
          <Alert className="bg-blue-50 border-blue-200">
            <Sparkles className="h-4 w-4 text-blue-600" />
            <div className="flex-1">
              <AlertTitle className="text-blue-800 font-semibold mb-1">
                AI Analysis Complete: {feedbackResponse.message}
              </AlertTitle>
              {feedbackResponse.stats && (
                <AlertDescription className="text-blue-700 text-sm grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2">
                  <span>📊 Total Rows: <strong>{feedbackResponse.stats.total_records}</strong></span>
                  <span className="text-orange-700">⚠️ High Risk: <strong>{feedbackResponse.stats.high_risk_alerts}</strong></span>
                  <span className="text-red-700">🚨 Critical: <strong>{feedbackResponse.stats.critical_alerts}</strong></span>
                </AlertDescription>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={resetFeedback} className="ml-auto border-blue-200 text-blue-700 hover:bg-blue-100">
              Dismiss
            </Button>
          </Alert>
        )}

        {/* --- PROGRESS BARS --- */}
        {isUploading && (
          <Card className="shadow-card border">
            <CardContent className="p-6">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  <div className="flex-1">
                    <p className="font-medium text-foreground text-sm">Processing Standard Upload</p>
                    <p className="text-xs text-muted-foreground">{status?.message || 'Uploading file...'}</p>
                  </div>
                  <span className="text-sm font-medium text-primary">{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            </CardContent>
          </Card>
        )}

        {isFeedbackUploading && (
          <Card className="shadow-card border border-blue-200 bg-blue-50/50">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-blue-400 opacity-20 animate-ping rounded-full"></div>
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600 relative z-10" />
                </div>
                <div>
                  <p className="font-semibold text-blue-900 text-sm">AI Analysis in Progress</p>
                  <p className="text-xs text-blue-700 mt-1">
                    Running Sentiment Analysis & Risk Prediction via n8n (Llama 3.2)...
                    <span className="block opacity-75 mt-0.5">This may take a few minutes for large files.</span>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* --- Hidden Inputs --- */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
            className="hidden"
            disabled={isUploading}
          />

          {/* NEW: Hidden Input for Feedback */}
          <input
            ref={feedbackInputRef}
            type="file"
            accept=".csv"
            onChange={handleFeedbackSelect}
            className="hidden"
            disabled={isFeedbackUploading}
          />

          {/* 1. Pulse Survey Upload (Existing) */}
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

          {/* 2. Text Feedback Upload (MODIFIED) */}
          <Card className="shadow-card border hover:shadow-card-hover transition-all cursor-pointer group relative overflow-hidden">
            {/* Optional: Visual indicator that this is AI powered */}
            <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
              <Sparkles className="w-12 h-12 text-blue-600" />
            </div>

            <CardContent className="p-6">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="p-4 rounded-full bg-blue-100 group-hover:bg-blue-200 transition-colors">
                  <FileText className="w-8 h-8 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-display font-semibold text-foreground">Open Text Feedback</h3>
                  <p className="text-xs text-muted-foreground mt-1">Upload comments for <span className="text-blue-600 font-medium">AI Sentiment & Risk Prediction</span></p>
                </div>
                <Button
                  variant="outline"
                  className={`w-full gap-2 border-blue-200 hover:bg-blue-50 ${isFeedbackUploading ? 'opacity-50' : ''}`}
                  onClick={handleFeedbackClick}
                  disabled={isFeedbackUploading}
                >
                  {isFeedbackUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                      Processing AI...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 text-blue-600" />
                      Upload Feedback
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 3. Exit Interviews (Existing) */}
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
              {/* Show successful AI upload in recent list dynamically */}
              {feedbackResponse && (
                <div className="flex items-center justify-between p-3 rounded-lg border bg-blue-50/50 border-blue-100">
                  <div className="flex items-center gap-3">
                    <Sparkles className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="font-medium text-foreground text-sm">Pulse Survey (AI Analyzed)</p>
                      <p className="text-xs text-muted-foreground">Sentiment & Prediction • Just now</p>
                    </div>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {feedbackResponse.stats?.total_records || 0} records
                  </span>
                </div>
              )}

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