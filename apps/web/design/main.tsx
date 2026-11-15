import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
  redirect,
  useParams,
} from "@tanstack/react-router";
import { MotionConfig } from "motion/react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Toaster } from "../src/client/components/ui/toast";
import { TooltipProvider } from "../src/client/components/ui/tooltip";
import { DesignLayout } from "../src/client/design/design-layout";
import { FrameDocument } from "../src/client/design/device-frame";
import { Overview } from "../src/client/design/home";
import { FoundationPage, GroupPage } from "../src/client/design/pages";
import { bootDesign } from "./boot";
import "./styles.css";

bootDesign();
const queryClient = new QueryClient({
  defaultOptions: { queries: { enabled: false, retry: false } },
});
const root = createRootRoute({ component: () => <Outlet /> });
const index = createRoute({
  getParentRoute: () => root,
  path: "/",
  beforeLoad: () => {
    throw redirect({ to: "/design" });
  },
});
const design = createRoute({
  getParentRoute: () => root,
  path: "/design",
  component: DesignLayout,
});
const designIndex = createRoute({
  getParentRoute: () => design,
  path: "/",
  component: Overview,
});
const foundation = createRoute({
  getParentRoute: () => design,
  path: "$page",
  component: () => <FoundationPage slug={foundation.useParams().page} />,
});
const group = createRoute({
  getParentRoute: () => design,
  path: "components/$group",
  component: () => <GroupPage slug={group.useParams().group} />,
});
const frame = createRoute({
  getParentRoute: () => root,
  path: "/design/frame/$specimen",
  component: () => <FrameDocument specimen={useParams({ strict: false }).specimen ?? ""} />,
});
const router = createRouter({
  routeTree: root.addChildren([index, design.addChildren([designIndex, foundation, group]), frame]),
  scrollRestoration: true,
});
const element = document.getElementById("root");
if (!element) throw new Error("#root missing");
createRoot(element).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <I18nProvider i18n={i18n}>
        <MotionConfig reducedMotion="user">
          <TooltipProvider>
            <RouterProvider router={router} />
            <Toaster aria-label="Notifications" closeLabel="Dismiss" />
          </TooltipProvider>
        </MotionConfig>
      </I18nProvider>
    </QueryClientProvider>
  </StrictMode>,
);
