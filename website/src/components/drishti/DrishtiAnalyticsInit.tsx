import { useEffect } from "react";
import { initDrishtiAnalytics } from "../../lib/drishti-analytics";

export function DrishtiAnalyticsInit() {
  useEffect(() => initDrishtiAnalytics(), []);
  return null;
}
