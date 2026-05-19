import { useState } from "react";
import type { SiteConfig } from "../../lib/types";
import { Reveal, RevealLines } from "../motion/Reveal";
import { motion, AnimatePresence } from "motion/react";
import { createSubscriber, errorMessage } from "../../services/api";

interface ClubProps {
  config: SiteConfig;
}

type SubmitState = "idle" | "submitting" | "success";

const EMAIL_RE = /^\S+@\S+\.\S+$/;

export function Club({ config }: ClubProps) {
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);
  const [state, setState] = useState<SubmitState>("idle");
  const [serverError, setServerError] = useState<string | null>(null);

  const emailInvalid = touched && !EMAIL_RE.test(email);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    setServerError(null);
    if (!EMAIL_RE.test(email)) return;

    setState("submitting");
    try {
      await createSubscriber({ email: email.trim().toLowerCase(), source: "club" });
      setState("success");
    } catch (err) {
      setServerError(
        errorMessage(
          err,
          "Could not save your email — please try again, or write to us directly."
        )
      );
      setState("idle");
    }
  }

  return (
    <section
      id="club"
      className="relative border-t border-[var(--border-subtle)] bg-[var(--color-ink-850)] px-6 py-32 md:px-10 md:py-44"
    >
      <div className="mx-auto max-w-[1100px] text-center">
        <Reveal y={12} className="mb-8 flex items-center justify-center gap-4">
          <span className="block h-px w-10 bg-[var(--color-pearl-300)]/60" />
          <span className="label-eyebrow text-[var(--color-bone-400)]">
            {config.clubEyebrow || "Allocation list"}
          </span>
          <span className="block h-px w-10 bg-[var(--color-pearl-300)]/60" />
        </Reveal>

        <h2 className="font-display text-[clamp(2.4rem,5vw,4.5rem)] font-light leading-[1] tracking-[-0.015em] text-[var(--color-bone-50)]">
          <RevealLines text={config.clubHeading || "Join the club."} italicLines={[0]} />
        </h2>

        <Reveal y={16} delay={0.2} className="mx-auto mt-8 max-w-lg">
          <p className="body-editorial">{config.clubBody}</p>
        </Reveal>

        <Reveal y={16} delay={0.32} className="mx-auto mt-12 max-w-md">
          <AnimatePresence mode="wait">
            {state !== "success" ? (
              <motion.form
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, y: -6 }}
                onSubmit={onSubmit}
                noValidate
                className="flex w-full flex-col gap-3"
              >
                <div className="group relative flex w-full items-center border-b border-[var(--border-default)] focus-within:border-[var(--color-pearl-300)]">
                  <input
                    type="email"
                    placeholder="Your email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (serverError) setServerError(null);
                    }}
                    onBlur={() => setTouched(true)}
                    disabled={state === "submitting"}
                    aria-invalid={emailInvalid}
                    aria-describedby={emailInvalid ? "club-email-error" : undefined}
                    className="w-full bg-transparent py-3 text-sm tracking-wide text-[var(--color-bone-100)] placeholder:text-[var(--color-bone-500)] focus:outline-none disabled:opacity-60"
                  />
                  <button
                    type="submit"
                    disabled={state === "submitting"}
                    className="label-eyebrow shrink-0 px-3 py-3 text-[var(--color-bone-200)] transition-colors hover:text-[var(--color-pearl-300)] disabled:opacity-60"
                  >
                    {state === "submitting" ? "Sending…" : "Subscribe →"}
                  </button>
                </div>
                {emailInvalid && (
                  <p
                    id="club-email-error"
                    role="alert"
                    className="label-eyebrow text-left text-[var(--color-wine-500)]"
                  >
                    Please enter a valid email
                  </p>
                )}
                {serverError && (
                  <p
                    role="alert"
                    className="label-eyebrow text-left text-[var(--color-wine-500)]"
                  >
                    {serverError}
                  </p>
                )}
                <p className="label-eyebrow mt-1 text-left text-[var(--color-bone-500)]">
                  Two letters a year. Unsubscribe anytime.
                </p>
              </motion.form>
            ) : (
              <motion.div
                key="thanks"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                role="status"
                className="border-b border-[var(--border-default)] py-6 text-center"
              >
                <p className="font-display text-2xl italic text-[var(--color-pearl-300)]">
                  Thank you — welcome to the table.
                </p>
                <p className="label-eyebrow mt-3 text-[var(--color-bone-500)]">
                  We've added {email.toLowerCase()} to the allocation list.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </Reveal>
      </div>
    </section>
  );
}
