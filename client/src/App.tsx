import { Switch, Route } from "wouter";
import { Toaster } from "./components/ui/toaster";
import { TooltipProvider } from "./components/ui/tooltip";
import MissionManagement from "./pages/mission-management";
import PeriodReport from "./pages/period-report";
import TaskSearch from "./pages/task-search";
import NotFound from "./pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={MissionManagement} />
      <Route path="/search" component={TaskSearch} />
      <Route path="/period-report" component={PeriodReport} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <TooltipProvider>
      <Toaster />
      <Router />
    </TooltipProvider>
  );
}

export default App;
