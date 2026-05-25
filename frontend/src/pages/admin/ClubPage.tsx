import { PageHeader } from "../../components/admin/PageHeader";
import { Card } from "../../components/admin/Card";
import { TextField, RichTextField } from "../../components/admin/Field";
import type { AdminContext } from "../Admin";

export function ClubPage({ ctx }: { ctx: AdminContext }) {
  const { config, update } = ctx;
  return (
    <>
      <PageHeader
        eyebrow="Section 08"
        title="Wine club"
        description="The allocation list — newsletter signup that gives access to library releases."
      />
      <div className="space-y-6 p-5 lg:p-10">
        <Card title="Copy">
          <div className="grid gap-5">
            <TextField
              label="Eyebrow"
              value={config.clubEyebrow || ""}
              onChange={(v) => update({ clubEyebrow: v })}
              placeholder="Allocation list"
            />
            <TextField
              label="Heading"
              value={config.clubHeading || ""}
              onChange={(v) => update({ clubHeading: v })}
              placeholder="Join the club."
            />
            <RichTextField
              label="Body"
              value={config.clubBody || ""}
              onChange={(v) => update({ clubBody: v })}
            />
          </div>
        </Card>
      </div>
    </>
  );
}
