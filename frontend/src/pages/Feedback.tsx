import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ThemeAnalysis } from '@/components/dashboard/ThemeAnalysis';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, ThumbsUp, ThumbsDown, TrendingUp } from 'lucide-react';
import { useFeedbacks } from '@/hooks/useFeebacks';
import { useMentions } from '@/hooks/useFeebacks';
import { useState } from 'react';
import { Button } from 'react-day-picker';

const Feedback = () => {

  const [dateRange, setDateRange] = useState<'week' | 'month' | 'year'>('year');

  const dateRangeOptions = [
    { value: 'week', label: 'Week' },
    { value: 'month', label: 'Month' },
    { value: 'year', label: 'Year' }
  ] as const;

  const sentimentOptions = [
    { value: 'positive', label: 'Positive' },
    { value: 'negative', label: 'Negative' },
    { value: 'neutral', label: 'Neutral' }
  ] as const;

  const { feedbacks } = useFeedbacks(dateRange);
  const { mentions } = useMentions(dateRange);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">Feedback Analysis</h1>
          <p className="text-muted-foreground text-sm mt-1">AI-powered sentiment and theme detection from employee feedback</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card className="shadow-card border">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <MessageSquare className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-display font-bold">{mentions?.totalMentions}</p>
                <p className="text-sm text-muted-foreground">Total Mentions</p>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-card border">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-risk-healthy-bg">
                <ThumbsUp className="w-6 h-6 text-risk-healthy" />
              </div>
              <div>
                <p className="text-2xl font-display font-bold">{mentions?.positiveThemes}</p>
                <p className="text-sm text-muted-foreground">Positive Themes</p>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-card border">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-risk-critical-bg">
                <ThumbsDown className="w-6 h-6 text-risk-critical" />
              </div>
              <div>
                <p className="text-2xl font-display font-bold">{mentions?.negativeThemes}</p>
                <p className="text-sm text-muted-foreground">Negative Themes</p>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-card border">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-chart-3/10">
                <TrendingUp className="w-6 h-6 text-chart-3" />
              </div>
              <div>
                <p className="text-2xl font-display font-bold">{mentions?.detectedThemes}</p>
                <p className="text-sm text-muted-foreground">Detected Themes</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ThemeAnalysis />

          <Card className="shadow-card border">
            <CardHeader>
              <CardTitle className="text-lg font-display">Recent Feedback Samples</CardTitle>
              <p className="text-xs text-muted-foreground">Anonymised excerpts from employee responses</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {feedbacks.map((feedback, i) => (
                <div key={i} className="p-3 rounded-lg border bg-background">
                  <p className="text-sm text-foreground mb-2">"{feedback.text}"</p>
                  <div className="flex items-center gap-2">
                    <Badge style={{ backgroundColor: "grey" }} className="text-xs">
                      {feedback.theme}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={
                        feedback.sentiment === 'positive'
                          ? 'bg-risk-healthy-bg text-risk-healthy border-risk-healthy/30'
                          : feedback.sentiment === 'negative'
                            ? 'bg-risk-critical-bg text-risk-critical border-risk-critical/30'
                            : 'bg-risk-warning-bg text-risk-warning border-risk-warning/30'
                      }
                    >
                      {feedback.sentiment}
                    </Badge>
                  </div>
                </div>
              ))}

            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Feedback;
