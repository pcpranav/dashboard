"use client";

import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { fetcher, SWR_CONFIG } from "@/lib/swr";
import type {
  DeploymentData,
  NetlifyAccountInfo,
  NetlifyBandwidthData,
  NetlifyFormData,
  NetlifyFunctionData,
} from "@/types";
import { DeploymentList } from "./DeploymentList";
import { ConnectCTA } from "./ConnectCTA";
import { formatBytes } from "@/lib/utils";

interface NetlifyResponse {
  deploys: DeploymentData[];
  buildMinutes: number;
}

const LIMIT = 300;

export function NetlifyCard({ connected }: { connected: boolean }) {
  const deploys = useSWR<NetlifyResponse>(
    connected ? "/api/netlify/deploys" : null,
    fetcher,
    SWR_CONFIG,
  );
  const forms = useSWR<NetlifyFormData[]>(
    connected ? "/api/netlify/forms" : null,
    fetcher,
    SWR_CONFIG,
  );
  const functions = useSWR<NetlifyFunctionData[]>(
    connected ? "/api/netlify/functions" : null,
    fetcher,
    SWR_CONFIG,
  );
  const bandwidth = useSWR<NetlifyBandwidthData>(
    connected ? "/api/netlify/bandwidth" : null,
    fetcher,
    SWR_CONFIG,
  );
  const account = useSWR<NetlifyAccountInfo>(
    connected ? "/api/netlify/account" : null,
    fetcher,
    SWR_CONFIG,
  );

  const pct = deploys.data ? Math.min(100, (deploys.data.buildMinutes / LIMIT) * 100) : 0;
  const indicator =
    pct >= 90 ? "bg-danger" : pct >= 70 ? "bg-warning" : "bg-blue";

  const bwPct =
    bandwidth.data?.available && bandwidth.data.included
      ? ((bandwidth.data.used ?? 0) / bandwidth.data.included) * 100
      : 0;
  const bwIndicator = bwPct >= 90 ? "bg-danger" : bwPct >= 70 ? "bg-warning" : "bg-blue";

  const totalUnread = (forms.data ?? []).reduce((a, f) => a + f.unreadCount, 0);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/[0.06] text-fg">
            <NetlifyLogo />
          </div>
          <CardTitle>Netlify</CardTitle>
        </div>
        {deploys.data && <Badge variant="muted">{deploys.data.deploys.length} recent</Badge>}
      </CardHeader>
      <CardContent className="space-y-4">
        {!connected && <ConnectCTA service="Netlify" />}
        {connected && deploys.isLoading && (
          <div className="space-y-2">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        )}
        {connected && deploys.error && <p className="text-sm text-danger">Failed to load deploys.</p>}
        {connected && deploys.data && (
          <>
            {account.data?.available && (
              <div className="flex items-center gap-2 text-[11px] mono text-muted">
                {account.data.type && <span className="text-fg">{account.data.type}</span>}
                {account.data.slug && (
                  <>
                    {account.data.type && <span>·</span>}
                    <span>{account.data.slug}</span>
                  </>
                )}
                {account.data.billingPeriod && (
                  <>
                    <span>·</span>
                    <span>{account.data.billingPeriod}</span>
                  </>
                )}
              </div>
            )}
            <DeploymentList deployments={deploys.data.deploys} />

            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-[11px] mono text-muted">
                <span>Build minutes · this month</span>
                <span className="text-fg">
                  {deploys.data.buildMinutes} / {LIMIT}
                </span>
              </div>
              <Progress value={pct} indicatorClassName={indicator} />
            </div>

            {bandwidth.data?.available && bandwidth.data.included && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] mono text-muted">
                  <span>Bandwidth · this month</span>
                  <span className="text-fg">
                    {formatBytes(bandwidth.data.used)} / {formatBytes(bandwidth.data.included)}
                  </span>
                </div>
                <Progress value={bwPct} indicatorClassName={bwIndicator} />
              </div>
            )}

            {forms.data && forms.data.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] mono text-muted">
                  <span>Forms</span>
                  <span className="text-fg">
                    {forms.data.length} form{forms.data.length === 1 ? "" : "s"}
                    {totalUnread > 0 && (
                      <span className="ml-2 text-warning">· {totalUnread} unread</span>
                    )}
                  </span>
                </div>
                <ul className="space-y-0.5">
                  {forms.data.slice(0, 4).map((f) => (
                    <li
                      key={f.formId}
                      className="flex items-center justify-between rounded-md px-2 py-1 text-[11px] hover:bg-white/[0.03]"
                    >
                      <span className="truncate text-fg">{f.formName}</span>
                      <span className="mono text-muted">
                        {f.submissionsCount} total
                        {f.unreadCount > 0 && (
                          <span className="ml-1.5 text-warning">· {f.unreadCount} unread</span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {functions.data && functions.data.length > 0 && (
              <div className="flex items-center justify-between text-[11px] mono text-muted">
                <span>Functions</span>
                <span className="text-fg">
                  {functions.data.length} across {new Set(functions.data.map((f) => f.siteName)).size} site
                  {new Set(functions.data.map((f) => f.siteName)).size === 1 ? "" : "s"}
                </span>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function NetlifyLogo() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M7 0.5L13 7L7 13.5L1 7L7 0.5Z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
      <circle cx="7" cy="7" r="1.5" fill="currentColor"/>
    </svg>
  );
}
