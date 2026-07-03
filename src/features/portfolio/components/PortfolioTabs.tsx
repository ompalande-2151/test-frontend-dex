import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { PortfolioActivity, PortfolioAsset, PortfolioPosition, PortfolioTab } from "../types";
import { PortfolioOverviewPanels } from "./PortfolioOverviewPanels";
import { PortfolioTokensTable } from "./PortfolioTokensTable";
import { PortfolioActivityTable } from "./PortfolioActivityTable";
import { PortfolioPositionsTable } from "./PortfolioPositionsTable";

interface PortfolioTabsProps {
  selectedTab: PortfolioTab;
  onTabChange: (tab: PortfolioTab) => void;
  assets: PortfolioAsset[];
  activity: PortfolioActivity[];
  positions: PortfolioPosition[];
  assetsLoading?: boolean;
  activityLoading?: boolean;
  positionsLoading?: boolean;
  assetsError?: string | null;
  activityError?: string | null;
  positionsError?: string | null;
}

export function PortfolioTabs({
  selectedTab,
  onTabChange,
  assets,
  activity,
  positions,
  assetsLoading,
  activityLoading,
  positionsLoading,
  assetsError,
  activityError,
  positionsError,
}: PortfolioTabsProps) {
  return (
    <Tabs value={selectedTab} onValueChange={(value) => onTabChange(value as PortfolioTab)} className="space-y-5">
      <TabsList className="h-auto w-full flex-wrap justify-start gap-2 rounded-[1.5rem] border border-white/60 bg-surface/80 p-2 shadow-soft">
        <TabsTrigger value="overview" className="rounded-full px-4 py-2 text-sm data-[state=active]:bg-background">
          Overview
        </TabsTrigger>
        <TabsTrigger value="tokens" className="rounded-full px-4 py-2 text-sm data-[state=active]:bg-background">
          Tokens
        </TabsTrigger>
        <TabsTrigger value="activity" className="rounded-full px-4 py-2 text-sm data-[state=active]:bg-background">
          Activity
        </TabsTrigger>
        <TabsTrigger value="positions" className="rounded-full px-4 py-2 text-sm data-[state=active]:bg-background">
          Positions
        </TabsTrigger>
      </TabsList>

      <TabsContent value="overview">
        <motion.div
          key="overview"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="space-y-6"
        >
          <PortfolioOverviewPanels assets={assets} activity={activity} positions={positions} />
        </motion.div>
      </TabsContent>

      <TabsContent value="tokens">
        <motion.div
          key="tokens"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          <PortfolioTokensTable assets={assets} isLoading={assetsLoading} isError={Boolean(assetsError)} error={assetsError} />
        </motion.div>
      </TabsContent>

      <TabsContent value="activity">
        <motion.div
          key="activity"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          <PortfolioActivityTable activity={activity} isLoading={activityLoading} isError={Boolean(activityError)} error={activityError} />
        </motion.div>
      </TabsContent>

      <TabsContent value="positions">
        <motion.div
          key="positions"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          <PortfolioPositionsTable positions={positions} isLoading={positionsLoading} isError={Boolean(positionsError)} error={positionsError} />
        </motion.div>
      </TabsContent>
    </Tabs>
  );
}
