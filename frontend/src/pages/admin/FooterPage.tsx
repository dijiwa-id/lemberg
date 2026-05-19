import { PageHeader } from "../../components/admin/PageHeader";
import { Card } from "../../components/admin/Card";
import { TextField } from "../../components/admin/Field";
import type { AdminContext } from "../Admin";

export function FooterPage({ ctx }: { ctx: AdminContext }) {
  const { config, update } = ctx;
  return (
    <>
      <PageHeader
        eyebrow="Section 09"
        title="Footer"
        description="Address, opening hours, and contact details that anchor the bottom of the page."
      />
      <div className="space-y-6 p-5 lg:p-10">
        <Card title="Visit" description="Where, and when you are open.">
          <div className="grid gap-5 md:grid-cols-2">
            <TextField
              label="Address"
              value={config.footerAddress || ""}
              onChange={(v) => update({ footerAddress: v })}
              placeholder="Lemberg Estate, Tulbagh Valley, 6820, Western Cape"
            />
            <TextField
              label="Opening hours"
              value={config.footerHours || ""}
              onChange={(v) => update({ footerHours: v })}
              placeholder="Tue–Sat · 10:00 — 16:00"
            />
          </div>
        </Card>

        <Card title="Contact" description="How visitors get in touch.">
          <div className="grid gap-5 md:grid-cols-3">
            <TextField
              label="Email"
              value={config.footerEmail || ""}
              onChange={(v) => update({ footerEmail: v })}
              placeholder="info@lemberg.co.za"
            />
            <TextField
              label="Phone"
              value={config.footerPhone || ""}
              onChange={(v) => update({ footerPhone: v })}
              placeholder="+27 23 230 0735"
            />
            <TextField
              label="Instagram handle"
              value={config.footerInstagram || ""}
              onChange={(v) => update({ footerInstagram: v })}
              placeholder="@lembergwinery"
            />
          </div>
        </Card>
      </div>
    </>
  );
}
