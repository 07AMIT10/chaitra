import { useCallback, useEffect, useState } from "react";
import { migratePasses } from "../../lib/drishti-return";
import { readPassesFromStorage, type DrishtiPassState } from "../../lib/drishti-pass";
import { DrishtiEchoBanner } from "./DrishtiEchoBanner";
import { DrishtiPassJournal } from "./DrishtiPassJournal";

export function DrishtiHubReturn() {
  const [passes, setPasses] = useState<DrishtiPassState[]>([]);
  const [mounted, setMounted] = useState(false);

  const refresh = useCallback(() => {
    if (typeof localStorage === "undefined") return;
    setPasses(migratePasses(readPassesFromStorage(localStorage)));
  }, []);

  useEffect(() => {
    setMounted(true);
    refresh();
  }, [refresh]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key === "chaitra_drishti_pass") refresh();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("drishti:passes-updated", refresh);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("drishti:passes-updated", refresh);
    };
  }, [refresh]);

  const reopenPass = (passId: string, scrollToBeforeAfter = false) => {
    window.dispatchEvent(
      new CustomEvent("drishti:reopen-pass", {
        detail: { passId, scrollToBeforeAfter },
      })
    );
  };

  if (!mounted) return null;

  return (
    <>
      <DrishtiEchoBanner
        passes={passes}
        onPassesChange={setPasses}
        onChanged={(passId) => reopenPass(passId, true)}
      />
      <DrishtiPassJournal
        passes={passes}
        onReopen={(passId) => reopenPass(passId)}
        onContinue={() => window.dispatchEvent(new Event("drishti:continue-pass"))}
      />
    </>
  );
}
