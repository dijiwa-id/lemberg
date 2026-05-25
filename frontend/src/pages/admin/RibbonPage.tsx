import { PageHeader } from "../../components/admin/PageHeader";
import { Card } from "../../components/admin/Card";
import { SelectField, TextField } from "../../components/admin/Field";
import { WineGallery } from "../../components/admin/WineGallery";
import type { AdminContext } from "../Admin";
import { parseRibbonImages, serializeRibbonImages } from "../../lib/types";

export function RibbonPage({ ctx }: { ctx: AdminContext }) {
  const { config, update } = ctx;

  const ribbonImages = parseRibbonImages(config.ribbonImages);

  return (
    <>
      <PageHeader
        title="Varietal ribbon"
        description="The infinite-scroll marquee that separates the Philosophy section from the Collection."
      />
      <div className="grid gap-6">
        <Card
          title="Format & content"
          description="Choose whether the ribbon displays a repeating text string or an image."
        >
          <div className="space-y-6">
            <SelectField
              label="Ribbon format"
              value={config.ribbonFormat || "text"}
              onChange={(v) => update({ ribbonFormat: v })}
              options={[
                { value: "text", label: "Text marquee" },
                { value: "image", label: "Image marquee" },
              ]}
              hint="Text is standard. Image can be used for custom typographic lockups or logos."
            />

            {config.ribbonFormat === "image" ? (
              <div className="pt-4 border-t border-[var(--color-ink-700)]">
                <p className="label-eyebrow mb-4 text-[var(--color-bone-300)]">Marquee images</p>
                <WineGallery 
                  images={ribbonImages} 
                  onChange={(next) => update({ ribbonImages: serializeRibbonImages(next) })} 
                />
              </div>
            ) : (
              <TextField
                label="Marquee text"
                value={config.ribbonText || ""}
                onChange={(v) => update({ ribbonText: v })}
                hint="Use · or similar characters to separate items if desired."
                placeholder="Cabernet Sauvignon · Pinotage · Chenin Blanc"
              />
            )}
          </div>
        </Card>
      </div>
    </>
  );
}
