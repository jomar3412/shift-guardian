import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppProvider } from "@/context/AppContext";
import { ShiftProvider } from "@/context/ShiftContext";
import { AppLayout } from "@/components/AppLayout";
import { UndoBanner } from "@/components/UndoBanner";
import DashboardPage from "@/pages/DashboardPage";
import ManageShiftsPage from "@/pages/ManageShiftsPage";
import EmployeesPage from "@/pages/EmployeesPage";
import RolesPage from "@/pages/RolesPage";
import SettingsPage from "@/pages/SettingsPage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AppProvider>
        <ShiftProvider>
          <BrowserRouter>
            <Routes>
              <Route element={<AppLayout />}>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/shifts" element={<ManageShiftsPage />} />
                <Route path="/employees" element={<EmployeesPage />} />
                <Route path="/roles" element={<RolesPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
            <UndoBanner />
          </BrowserRouter>
        </ShiftProvider>
      </AppProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
