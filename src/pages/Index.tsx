import { ShiftProvider } from "@/context/ShiftContext";
import { Dashboard } from "@/components/Dashboard";

const Index = () => {
  return (
    <ShiftProvider>
      <Dashboard />
    </ShiftProvider>
  );
};

export default Index;
