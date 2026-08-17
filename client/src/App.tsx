import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Portal from "./pages/Portal";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/"} component={Portal} />
      <Route path={"/staff"} component={Portal} />
      <Route path={"/staff/whs"} component={Portal} />
      <Route path={"/staff/whs-drafts"} component={Portal} />
      <Route path={"/staff/forms"} component={Portal} />
      <Route path={"/staff/projects"} component={Portal} />
      <Route path={"/staff/timesheets"} component={Portal} />
      <Route path={"/staff/training"} component={Portal} />
      <Route path={"/staff/noticeboard"} component={Portal} />
      <Route path={"/staff/bosta"} component={Portal} />
      <Route path={"/whs"} component={Portal} />
      <Route path={"/whs-drafts"} component={Portal} />
      <Route path={"/forms"} component={Portal} />
      <Route path={"/projects"} component={Portal} />
      <Route path={"/timesheets"} component={Portal} />
      <Route path={"/training"} component={Portal} />
      <Route path={"/noticeboard"} component={Portal} />
      <Route path={"/bosta"} component={Portal} />
      <Route path={"/admin"} component={Portal} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
