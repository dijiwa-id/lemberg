import { PageHeader } from "../../components/admin/PageHeader";
import { Card } from "../../components/admin/Card";
import { ImageField, TextField } from "../../components/admin/Field";
import type { AdminContext } from "../Admin";

export function PhilosophyPage({ ctx }: { ctx: AdminContext }) {
  const { config, update } = ctx;
  return (
    <>
      <PageHeader
        eyebrow="Section 03"
        title="Philosophy"
        description="The estate story — soil, season, and the unhurried way the wines are made."
      />
      <div className="space-y-6 p-5 lg:p-10">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Card title="Copy" description="Two-line heading with an italic accent, plus body paragraphs.">
              <div className="grid gap-5">
                <TextField
                  label="Eyebrow"
                  value={config.philosophyEyebrow || ""}
                  onChange={(v) => update({ philosophyEyebrow: v })}
                  placeholder="The estate"
                />
                <TextField
                  label="Heading"
                  value={config.philosophyHeading || ""}
                  onChange={(v) => update({ philosophyHeading: v })}
                  placeholder="Rooted in the soil."
                />
                <TextField
                  label="Heading — italic accent"
                  value={config.philosophyHeadingItalic || ""}
                  onChange={(v) => update({ philosophyHeadingItalic: v })}
                  placeholder="Guided by the season."
                />
                <TextField
                  label="Body"
                  multiline
                  rows={8}
                  value={config.philosophyBody || ""}
                  onChange={(v) => update({ philosophyBody: v })}
                  hint="Use two newlines to separate paragraphs."
                />
                <TextField
                  label="Established label"
                  value={config.philosophyEstYear || ""}
                  onChange={(v) => update({ philosophyEstYear: v })}
                  placeholder="Est. 1978"
                />
              </div>
            </Card>
          </div>
          <div className="lg:col-span-1">
            <Card title="Image" description="Portrait orientation, 4:5 aspect.">
              <ImageField
                label="Section image"
                value={config.philosophyImage || ""}
                onChange={(v) => update({ philosophyImage: v })}
                aspect="aspect-[4/5]"
              />
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
