import { useCallback } from "react";
import { useNavigate } from "react-router";
import useSWR from "swr";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Label } from "../components/ui/label";
import { orpcClient } from "../lib/orpc";

export function HomePage() {
  const navigate = useNavigate();

  const { data, error, isValidating } = useSWR(
    ["register", "client"],
    () => orpcClient.register.registerClient({ clientId: null }),
  );

  const handleCreateBatch = useCallback(async () => {
    if (!data) return;
    const batch = await orpcClient.batch.createBatch({ clientId: data.clientId });
    navigate(`/batch/${batch.id}`);
  }, [data, navigate]);

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
      <Card className="w-full max-w-xl border border-border backdrop-blur">
        <div className="p-6 space-y-4">
          <h1 className="text-2xl font-semibold tracking-tight">Queue Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Create a client and start a new batch to begin generating and processing tasks.
          </p>

          {error && (
            <p className="text-xs text-destructive">
              Failed to register client. Ensure the API is running on `http://localhost:4000`.
            </p>
          )}

          <div className="rounded-md border border-border bg-card p-4 space-y-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              Client
            </Label>
            <p className="text-sm font-mono">
              {data?.clientId ?? "Registering client..."}
            </p>
            <p className="text-xs text-muted-foreground">
              A client represents one producer/consumer pair driving tasks into the queue.
            </p>
          </div>

          <div className="flex items-center justify-between gap-4 pt-2">
            <div className="text-xs text-muted-foreground">
              {isValidating
                ? "Contacting API..."
                : data
                  ? "Client registered. You can create a batch."
                  : "Waiting for client registration."}
            </div>
            <Button
              size="sm"
              disabled={!data || !!error}
              onClick={handleCreateBatch}
            >
              Create &amp; open batch
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

