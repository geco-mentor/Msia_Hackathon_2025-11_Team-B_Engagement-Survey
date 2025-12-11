import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Teams from "./pages/Teams";
import Trends from "./pages/Trends";
import Hotspots from "./pages/Hotspots";
import Feedback from "./pages/Feedback";
import Interventions from "./pages/Interventions";
import Insights from "./pages/Insights";
import DataImport from "./pages/DataImport";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/teams" element={<Teams />} />
          <Route path="/trends" element={<Trends />} />
          <Route path="/hotspots" element={<Hotspots />} />
          <Route path="/hotspots/:dept_n" element={<Hotspots />} />
          <Route path="/feedback" element={<Feedback />} />
          <Route path="/interventions" element={<Interventions />} />
          <Route path="/insights" element={<Insights />} />
          <Route path="/import" element={<DataImport />} />
          <Route path="/settings" element={<Settings />} />

          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
