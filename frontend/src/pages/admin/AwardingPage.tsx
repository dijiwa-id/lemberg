import { PageHeader } from "../../components/admin/PageHeader";
import { Card } from "../../components/admin/Card";
import { TextField } from "../../components/admin/Field";
import { ToggleField } from "../../components/admin/ToggleField";
import { WineGallery } from "../../components/admin/WineGallery";
import type { AdminContext } from "../Admin";
import { parseAwardingImages, serializeAwardingImages, flagValue } from "../../lib/types";

export function AwardingPage({ ctx }: { ctx: AdminContext }) {
  const { config, update } = ctx;

  const awardingImages = parseAwardingImages(config.awardingImages);

  return (
    <>
      <PageHeader
        title="Awarding section"
        description="Showcase your accolades and recognition in an elegant scrolling ribbon."
      />
      
      <div className="grid gap-6">
        <Card
          title="Visibility & Title"
          description="Control how the section appears on the landing page."
        >
          <div className="space-y-6">
            <ToggleField
              label="Show awarding section"
              value={config.showAwarding === "true"}
              onChange={(v) => update({ showAwarding: flagValue(v) })}
              hint="When enabled, this section appears below the Featured Wine section."
            />
            
            <TextField
              label="Section heading"
              value={config.awardingHeading || ""}
              onChange={(v) => update({ awardingHeading: v })}
              placeholder="Awarding"
              hint="The main title displayed above the award ribbon."
            />
          </div>
        </Card>

        <Card
          title="Award images"
          description="Upload PNG or JPG images of your awards, medals, or press logos."
        >
          <div className="pt-2">
            <p className="label-eyebrow mb-4 text-[var(--color-bone-300)]">Medals & Logos</p>
            <WineGallery 
              images={awardingImages} 
              onChange={(next) => update({ awardingImages: serializeAwardingImages(next) })} 
            />
            <p className="mt-4 text-xs text-[var(--color-bone-500)] italic">
              Tip: Use transparent PNGs for the cleanest look on the dark background.
            </p>
          </div>
        </Card>
      </div>
    </>
  );
}
