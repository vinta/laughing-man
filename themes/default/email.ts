import mjml2html from "mjml";
import type { IssueProps } from "../../src/types.js";
import { escapeHtml } from "./escape.js";

export function EmailPage({ title, issue, content, config }: IssueProps): string {
  const name = escapeHtml(config.name);
  const url = escapeHtml(config.url);

  const mjml = `
<mjml>
  <mj-head>
    <mj-attributes>
      <mj-all font-family="Georgia, 'Times New Roman', serif" color="#1a1a1a" />
      <mj-text line-height="1.7" font-size="16px" />
    </mj-attributes>
  </mj-head>
  <mj-body background-color="#ffffff">
    <mj-section padding="32px 24px 0">
      <mj-column>
        <mj-text padding-bottom="16px">
          <a href="${url}" style="font-weight:600;font-size:16px;color:#1a1a1a;text-decoration:none;letter-spacing:0.02em;">${name}</a>
        </mj-text>
        <mj-divider border-color="#e5e7eb" border-width="2px" padding="0" />
      </mj-column>
    </mj-section>
    <mj-section padding="32px 24px 0">
      <mj-column>
        <mj-text font-size="13px" color="#6b7280" padding-bottom="16px">
          Issue #${issue}
        </mj-text>
        <mj-text>
          ${content}
        </mj-text>
      </mj-column>
    </mj-section>
    <mj-section padding="32px 24px">
      <mj-column>
        <mj-divider border-color="#e5e7eb" border-width="1px" padding="0 0 24px 0" />
        <mj-text font-size="13px" color="#6b7280" align="center">
          You're receiving this because you subscribed to ${name}.
          <a href="{{{RESEND_UNSUBSCRIBE_URL}}}" style="color:#2563eb;">Unsubscribe</a>
        </mj-text>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>`;

  const { html, errors } = mjml2html(mjml);
  if (errors.length > 0) {
    throw new Error(`MJML compilation errors: ${errors.map((e) => e.message).join(", ")}`);
  }
  return html;
}
