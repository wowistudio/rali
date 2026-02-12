import { useCallback } from "react";
import { useParams } from "react-router";
import useSWR from "swr";
import { BatchMetrics } from "../components/BatchMetrics";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Separator } from "../components/ui/separator";
import { orpcClient } from "../lib/orpc";

export function BatchPage() {
  const { batchId } = useParams<{ batchId: string }>();

  const { data: metrics } = useSWR(
    batchId ? ["metrics", batchId] : null,
    () => orpcClient.metrics.getBatchMetrics({ batchId: batchId! }),
    {
      refreshInterval: 5000,
    },
  );

  const handleStart = useCallback(async () => {
    if (!batchId) return;
    await orpcClient.batch.startBatch({ batchId });
  }, [batchId]);

  const handleStop = useCallback(async () => {
    if (!batchId) return;
    await orpcClient.batch.stopBatch({ batchId });
  }, [batchId]);

  if (!batchId) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <p className="text-sm text-muted-foreground">No batch id provided.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-4">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-xl font-semibold tracking-tight">
              Batch <span className="font-mono text-muted-foreground">{batchId}</span>
            </h1>
            <p className="text-xs text-muted-foreground">
              Control the batch and inspect basic queue health metrics.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              Live view
            </Badge>
          </div>
        </header>

        <Card className="border border-border bg-card">
          <div className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="space-y-1">
              <p className="text-sm font-medium">Batch controls</p>
              <p className="text-xs text-muted-foreground">
                Start or stop the batch. Metrics will update automatically while this
                page is open.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={handleStart}>
                Start batch
              </Button>
              <Button size="sm" variant="destructive" onClick={handleStop}>
                Stop batch
              </Button>
            </div>
          </div>
        </Card>

        <Separator />

        <BatchMetrics data={metrics} />
      </div>
    </div>
  );
}

