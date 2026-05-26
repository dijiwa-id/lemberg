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
            <div className="mb-6 rounded-lg border border-[var(--color-ink-700)] bg-[var(--color-ink-950)]/20 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-pearl-300)] mb-2">
                Image Recommendations
              </p>
              <ul className="list-disc list-inside space-y-1 text-xs text-[var(--color-bone-400)] leading-relaxed">
                <li><span className="text-[var(--color-bone-200)]">Format:</span> Transparent PNG (recommended) or high-quality JPG.</li>
                <li><span className="text-[var(--color-bone-200)]">Size:</span> 100px to 250px in height. Width can be proportional.</li>
                <li><span className="text-[var(--color-bone-200)]">Optimization:</span> Keep files under 500KB for faster loading.</li>
                <li><span className="text-[var(--color-bone-200)]">Style:</span> Use consistent lighting and contrast across all logos.</li>
              </ul>
            </div>

            <p className="label-eyebrow mb-4 text-[var(--color-bone-300)]">Medals & Logos</p>
            <WineGallery 
              images={awardingImages} 
              onChange={(next) => update({ awardingImages: serializeAwardingImages(next) })} 
            />
            
            <div className="mt-6 flex items-start gap-3 rounded border border-[var(--color-wine-900)]/30 bg-[var(--color-wine-950)]/10 p-3">
              <div className="mt-0.5 text-[var(--color-wine-500)]">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-[11px] italic text-[var(--color-bone-500)]">
                Note: Images are staged locally. Click the <span className="font-bold text-[var(--color-pearl-300)] uppercase">Publish</span> button in the top bar to save changes permanently to the live site.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}
