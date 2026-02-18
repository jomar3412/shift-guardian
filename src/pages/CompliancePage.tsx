import { useMemo } from "react";
import { useShift } from "@/context/ShiftContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, ExternalLink } from "lucide-react";

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC",
];

export default function CompliancePage() {
  const { settings, updateSettings } = useShift();

  const reviewStatus = useMemo(() => {
    if (!settings.lawLastReviewedAt) return "never";
    const nextDue = settings.lawLastReviewedAt + settings.lawReviewIntervalDays * 24 * 60 * 60 * 1000;
    return Date.now() > nextDue ? "overdue" : "current";
  }, [settings.lawLastReviewedAt, settings.lawReviewIntervalDays]);

  const reviewLabel = settings.lawLastReviewedAt
    ? new Date(settings.lawLastReviewedAt).toLocaleDateString()
    : "Never";

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Compliance Rules</h2>
        <p className="text-sm text-muted-foreground">Set company policy and track state labor-law review status.</p>
      </div>

      {reviewStatus !== "current" && (
        <div className="rounded-lg border border-compliance-warning bg-compliance-warning-bg p-3 text-xs text-compliance-warning flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 mt-0.5" />
          <span>
            {reviewStatus === "never"
              ? "Labor law source has never been reviewed."
              : "Labor law review is overdue. Please verify current state requirements."}
          </span>
        </div>
      )}

      <section className="rounded-lg border border-border bg-card p-4 space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">Jurisdiction</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">State</Label>
            <Select
              value={settings.jurisdictionState}
              onValueChange={(v) => updateSettings({ jurisdictionState: v })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {US_STATES.map((state) => (
                  <SelectItem key={state} value={state}>{state}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Law Review Interval (days)</Label>
            <Input
              type="number"
              min={1}
              max={365}
              value={settings.lawReviewIntervalDays}
              onChange={(e) => updateSettings({ lawReviewIntervalDays: Math.max(1, parseInt(e.target.value) || 30) })}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Official Law Source URL</Label>
          <Input
            value={settings.lawSourceUrl || ""}
            onChange={(e) => updateSettings({ lawSourceUrl: e.target.value })}
            placeholder="https://..."
          />
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Last reviewed: {reviewLabel}</p>
            <div className="flex items-center gap-2">
              {settings.lawSourceUrl && (
                <a href={settings.lawSourceUrl} target="_blank" rel="noreferrer">
                  <Button size="sm" variant="outline" className="gap-1">
                    <ExternalLink className="h-3.5 w-3.5" />
                    Open Source
                  </Button>
                </a>
              )}
              <Button size="sm" onClick={() => updateSettings({ lawLastReviewedAt: Date.now() })}>
                Mark Reviewed
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-4 space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">Meal Compliance Policy</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Meal Deadline (hours)</Label>
            <Input
              type="number"
              min={1}
              max={12}
              value={settings.mealDeadlineHours}
              onChange={(e) => updateSettings({ mealDeadlineHours: parseFloat(e.target.value) || 5 })}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Warning Threshold (minutes)</Label>
            <Input
              type="number"
              min={1}
              max={240}
              value={settings.warningMinutesBeforeDeadline}
              onChange={(e) => updateSettings({ warningMinutesBeforeDeadline: parseInt(e.target.value) || 60 })}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Urgent Threshold (minutes)</Label>
            <Input
              type="number"
              min={1}
              max={180}
              value={settings.urgentMinutesBeforeDeadline}
              onChange={(e) => updateSettings({ urgentMinutesBeforeDeadline: parseInt(e.target.value) || 30 })}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Critical Threshold (minutes)</Label>
            <Input
              type="number"
              min={1}
              max={120}
              value={settings.criticalMinutesBeforeDeadline}
              onChange={(e) => updateSettings({ criticalMinutesBeforeDeadline: parseInt(e.target.value) || 15 })}
            />
          </div>
        </div>
      </section>

      <p className="text-xs text-muted-foreground">
        Legal note: this tool assists with scheduling decisions but does not replace legal advice. Confirm local/state requirements with official sources.
      </p>
    </div>
  );
}
