import type { Issue } from "../rules";

export interface SlackAlertPayload {
  newIssues: Issue[];
  resolvedIssues: Issue[];
  isTest?: boolean;
}

interface SlackBlock {
  type: string;
  text?: { type: string; text: string };
  fields?: Array<{ type: string; text: string }>;
}

function severityEmoji(severity: Issue["severity"] | "resolved"): string {
  if (severity === "danger") return ":rotating_light:";
  if (severity === "warning") return ":warning:";
  return ":white_check_mark:";
}

export async function sendSlackAlert(
  webhookUrl: string,
  payload: SlackAlertPayload,
): Promise<void> {
  const blocks: SlackBlock[] = [];

  if (payload.isTest) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: ":test_tube: *DevPulse test alert* — your Slack webhook is wired up correctly.",
      },
    });
  } else {
    if (payload.newIssues.length > 0) {
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*DevPulse · ${payload.newIssues.length} new issue${payload.newIssues.length === 1 ? "" : "s"}*`,
        },
      });
      for (const i of payload.newIssues) {
        blocks.push({
          type: "section",
          text: {
            type: "mrkdwn",
            text: `${severityEmoji(i.severity)} ${i.label}`,
          },
        });
      }
    }
    if (payload.resolvedIssues.length > 0) {
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Resolved · ${payload.resolvedIssues.length}*`,
        },
      });
      for (const i of payload.resolvedIssues) {
        blocks.push({
          type: "section",
          text: {
            type: "mrkdwn",
            text: `${severityEmoji("resolved")} ${i.label}`,
          },
        });
      }
    }
  }

  if (blocks.length === 0) return;

  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ blocks }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Slack webhook ${res.status}: ${body.slice(0, 200)}`);
  }
}
