import { useApp } from "@/context/AppContext";
import { useShift } from "@/context/ShiftContext";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Moon, Sun, Clock } from "lucide-react";

export default function SettingsPage() {
  const { appSettings, updateAppSettings } = useApp();
  const { settings, updateSettings } = useShift();

  return (
    <div className="space-y-8 max-w-lg">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Settings</h2>
        <p className="text-sm text-muted-foreground">Customize your experience</p>
      </div>

      {/* Appearance */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Appearance</h3>
        <div className="rounded-lg border border-border bg-card p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {appSettings.darkMode ? <Moon className="h-5 w-5 text-muted-foreground" /> : <Sun className="h-5 w-5 text-muted-foreground" />}
              <div>
                <Label className="text-sm font-medium">Dark Mode</Label>
                <p className="text-xs text-muted-foreground">Switch between light and dark theme</p>
              </div>
            </div>
            <Switch
              checked={appSettings.darkMode}
              onCheckedChange={(v) => updateAppSettings({ darkMode: v })}
            />
          </div>
        </div>
      </section>

      {/* Time Format */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Time Format</h3>
        <div className="rounded-lg border border-border bg-card p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label className="text-sm font-medium">Clock Format</Label>
                <p className="text-xs text-muted-foreground">How times are displayed</p>
              </div>
            </div>
            <Select
              value={appSettings.timeFormat}
              onValueChange={(v) => updateAppSettings({ timeFormat: v as "12h" | "24h" })}
            >
              <SelectTrigger className="w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="12h">12-hour</SelectItem>
                <SelectItem value="24h">24-hour</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      {/* Compliance Settings */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Compliance</h3>
        <div className="rounded-lg border border-border bg-card p-4 space-y-4">
          <div className="space-y-2">
            <Label>Grace Period (minutes)</Label>
            <Input
              type="number"
              min={1}
              max={30}
              value={settings.gracePeriodMinutes}
              onChange={e => updateSettings({ gracePeriodMinutes: parseInt(e.target.value) || 5 })}
            />
            <p className="text-xs text-muted-foreground">Time between assigning and starting lunch</p>
          </div>
          <div className="space-y-2">
            <Label>Overtime Threshold (hours)</Label>
            <Input
              type="number"
              min={6}
              max={12}
              value={settings.overtimeThresholdHours}
              onChange={e => updateSettings({ overtimeThresholdHours: parseInt(e.target.value) || 8 })}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
