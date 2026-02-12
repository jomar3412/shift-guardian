import { useShift } from "@/context/ShiftContext";
import { Button } from "@/components/ui/button";
import { Undo2, X } from "lucide-react";
import { useEffect, useState } from "react";

export function UndoBanner() {
  const { undoStack, popUndo, clearUndo } = useShift();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (undoStack.length > 0) {
      setVisible(true);
      const timeout = setTimeout(() => setVisible(false), 8000);
      return () => clearTimeout(timeout);
    } else {
      setVisible(false);
    }
  }, [undoStack.length, undoStack[0]?.id]);

  if (!visible || undoStack.length === 0) return null;

  const latest = undoStack[0];

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-full bg-foreground text-background px-5 py-2.5 shadow-lg animate-in slide-in-from-bottom-4 duration-300">
      <span className="text-sm font-medium truncate max-w-[200px]">{latest.label}</span>
      <Button
        size="sm"
        variant="ghost"
        className="gap-1.5 text-background hover:text-background/80 hover:bg-background/10 h-7 px-2"
        onClick={popUndo}
      >
        <Undo2 className="h-3.5 w-3.5" />
        Undo
      </Button>
      <button onClick={clearUndo} className="text-background/50 hover:text-background/80">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
