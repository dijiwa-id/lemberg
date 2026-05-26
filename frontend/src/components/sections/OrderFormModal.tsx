import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { X, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import type { SiteConfig, Wine } from "../../lib/types";
import { resolveAsset } from "../../services/api";
import { cn } from "../../lib/utils";
import axios from "axios";

interface OrderFormModalProps {
  wine: Wine | null;
  wines: Wine[];
  config: SiteConfig;
  isOpen: boolean;
  onClose: () => void;
}

export function OrderFormModal({ wine, wines, config, isOpen, onClose }: OrderFormModalProps) {
  const [formData, setFormData] = useState({
    customer_name: "",
    email: "",
    phone_number: "",
    wine_product_id: wine?.id || (wines.length > 0 ? wines[0].id : 0),
    quantity: 1,
    notes: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (wine) {
      setFormData(prev => ({ ...prev, wine_product_id: wine.id }));
    }
  }, [wine]);

  // Body-scroll lock
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || "/api";
      await axios.post(`${apiUrl}/wine-orders`, {
        ...formData,
        source_page: window.location.pathname,
      });
      setIsSuccess(true);
      setTimeout(() => {
        onClose();
        setIsSuccess(false);
        setFormData({
            customer_name: "",
            email: "",
            phone_number: "",
            wine_product_id: wine?.id || (wines.length > 0 ? wines[0].id : 0),
            quantity: 1,
            notes: "",
        });
      }, 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedWine = wines.find(w => w.id === formData.wine_product_id);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-[rgba(7,7,10,0.85)] backdrop-blur-md p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-[600px] bg-[var(--color-ink-900)] border border-[var(--border-subtle)] p-8 md:p-12 overflow-hidden shadow-2xl"
          >
            <button
              onClick={onClose}
              className="absolute right-6 top-6 text-[var(--color-bone-500)] hover:text-[var(--color-bone-100)] transition-colors"
            >
              <X size={20} />
            </button>

            {isSuccess ? (
              <div className="py-12 flex flex-col items-center text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", damping: 12 }}
                  className="mb-6 text-[var(--color-pearl-300)]"
                >
                  <CheckCircle2 size={64} strokeWidth={1} />
                </motion.div>
                <h3 className="font-display text-3xl font-light text-[var(--color-bone-50)] mb-4">
                  Order Received
                </h3>
                <p className="body-editorial text-[var(--color-bone-300)] max-w-sm">
                  Thank you for your order. Our estate manager will contact you shortly to finalize your request.
                </p>
              </div>
            ) : (
              <>
                <div className="mb-10">
                  <span className="label-eyebrow text-[var(--color-pearl-300)] mb-2 block">
                    Wine Collection
                  </span>
                  <h3 className="font-display text-4xl font-light text-[var(--color-bone-50)]">
                    Order Request
                  </h3>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  {error && (
                    <div className="bg-red-500/10 border border-red-500/20 p-4 flex items-center gap-3 text-red-200 text-sm">
                      <AlertCircle size={16} />
                      {error}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="label-eyebrow text-[var(--color-bone-400)]">Full Name</label>
                      <input
                        required
                        type="text"
                        className="w-full bg-[var(--color-ink-850)] border border-[var(--border-subtle)] px-4 py-3 text-[var(--color-bone-100)] focus:outline-none focus:border-[var(--color-pearl-300)] transition-colors"
                        value={formData.customer_name}
                        onChange={e => setFormData({ ...formData, customer_name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="label-eyebrow text-[var(--color-bone-400)]">Phone Number</label>
                      <input
                        required
                        type="tel"
                        className="w-full bg-[var(--color-ink-850)] border border-[var(--border-subtle)] px-4 py-3 text-[var(--color-bone-100)] focus:outline-none focus:border-[var(--color-pearl-300)] transition-colors"
                        value={formData.phone_number}
                        onChange={e => setFormData({ ...formData, phone_number: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="label-eyebrow text-[var(--color-bone-400)]">Email Address</label>
                    <input
                      required
                      type="email"
                      className="w-full bg-[var(--color-ink-850)] border border-[var(--border-subtle)] px-4 py-3 text-[var(--color-bone-100)] focus:outline-none focus:border-[var(--color-pearl-300)] transition-colors"
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2 space-y-2">
                      <label className="label-eyebrow text-[var(--color-bone-400)]">Select Wine</label>
                      <select
                        className="w-full bg-[var(--color-ink-850)] border border-[var(--border-subtle)] px-4 py-3 text-[var(--color-bone-100)] focus:outline-none focus:border-[var(--color-pearl-300)] transition-colors appearance-none"
                        value={formData.wine_product_id}
                        onChange={e => setFormData({ ...formData, wine_product_id: Number(e.target.value) })}
                      >
                        {wines.map(w => (
                          <option key={w.id} value={w.id}>
                            {w.name} {w.vintage && `(${w.vintage})`}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="label-eyebrow text-[var(--color-bone-400)]">Quantity</label>
                      <input
                        required
                        type="number"
                        min="1"
                        className="w-full bg-[var(--color-ink-850)] border border-[var(--border-subtle)] px-4 py-3 text-[var(--color-bone-100)] focus:outline-none focus:border-[var(--color-pearl-300)] transition-colors"
                        value={formData.quantity}
                        onChange={e => setFormData({ ...formData, quantity: Number(e.target.value) })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="label-eyebrow text-[var(--color-bone-400)]">Additional Notes</label>
                    <textarea
                      className="w-full bg-[var(--color-ink-850)] border border-[var(--border-subtle)] px-4 py-3 text-[var(--color-bone-100)] focus:outline-none focus:border-[var(--color-pearl-300)] transition-colors min-h-[100px] resize-none"
                      placeholder="Special requests or shipping preferences..."
                      value={formData.notes}
                      onChange={e => setFormData({ ...formData, notes: e.target.value })}
                    />
                  </div>

                  <button
                    disabled={isSubmitting}
                    className="w-full bg-[var(--color-bone-50)] text-[var(--color-ink-900)] py-4 font-mono text-[13px] tracking-widest uppercase hover:bg-[var(--color-bone-200)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Processing...
                      </>
                    ) : (
                      "Submit Order Request"
                    )}
                  </button>
                </form>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
