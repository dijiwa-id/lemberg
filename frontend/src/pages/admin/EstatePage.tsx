import { PageHeader } from "../../components/admin/PageHeader";
import { Card } from "../../components/admin/Card";
import { ImageField, TextField, RichTextField } from "../../components/admin/Field";
import type { AdminContext } from "../Admin";

export function EstatePage({ ctx }: { ctx: AdminContext }) {
  const { config, update } = ctx;
  return (
    <>
      <PageHeader
        eyebrow="Section 06"
        title="Estate"
        description="The full-bleed valley band — landscape image with poetic copy about Tulbagh."
      />
      <div className="space-y-6 p-5 lg:p-10">
        <Card title="Copy">
          <div className="grid gap-5">
            <TextField
              label="Eyebrow"
              value={config.estateEyebrow || ""}
              onChange={(v) => update({ estateEyebrow: v })}
              placeholder="The valley"
            />
            <TextField
              label="Heading"
              multiline
              rows={2}
              value={config.estateHeading || ""}
              onChange={(v) => update({ estateHeading: v })}
              hint="Use a line break for two-line layout"
            />
            <RichTextField
              label="Body"
              value={config.estateBody || ""}
              onChange={(v) => update({ estateBody: v })}
            />
          </div>
        </Card>

        <Card
          title="Background image"
          description="Cinematic landscape, 2400px wide. The image is treated with a dark vignette in production."
        >
          <ImageField
            label="Background image"
            value={config.estateImage || ""}
            onChange={(v) => update({ estateImage: v })}
            aspect="aspect-video"
          />
        </Card>
      </div>
    </>
  );
}
