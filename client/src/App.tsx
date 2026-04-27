import { Switch, Route } from "wouter";
import { Toaster } from "./components/ui/toaster";
import { TooltipProvider } from "./components/ui/tooltip";
import MissionManagement from "./pages/mission-management";
import PeriodReport from "./pages/period-report";
import TaskSearch from "./pages/task-search";
import ReceiptDistributionPage from "./pages/receipt-distribution";
import NotFound from "./pages/not-found";
import GlobalBlocker from "./components/GlobalBlocker";

function Router() {
  return (
    <Switch>
      <Route path="/" component={MissionManagement} />
      <Route path="/search" component={TaskSearch} />
      <Route path="/receipt-distribution" component={ReceiptDistributionPage} />
      <Route path="/period-report" component={PeriodReport} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <GlobalBlocker>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </GlobalBlocker>
  );
}

export default App;
