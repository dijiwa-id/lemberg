import { useState, type CSSProperties } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { ShoppingBag, Trash2, Plus, Minus, ArrowRight, CheckCircle2, Loader2, ChevronLeft } from "lucide-react";
import { Nav } from "../components/Nav";
import { Footer } from "../components/sections/Footer";
import { useCart } from "../lib/useCart";
import { useSiteData } from "../lib/useSiteData";
import { currencySymbol, configFlag } from "../lib/types";
import { useDocumentMeta, useLandingTheme } from "../lib/useDocumentMeta";
import { resolveAsset, createWineOrder, errorMessage } from "../services/api";
import { cn } from "../lib/utils";

export default function CartPage() {
  const { config, menu } = useSiteData();
  const { items, updateQuantity, removeFromCart, totalPrice, clearCart } = useCart();
  const navigate = useNavigate();

  // SEO meta + favicon + <html lang>
  useDocumentMeta(config);

  const theme = useLandingTheme(config.landingTheme);

  // Brand accent overrides the iridescent pearl.
  const accentStyle: CSSProperties = config.brandAccent
    ? ({ "--color-pearl-300": config.brandAccent } as CSSProperties)
    : {};

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    notes: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await createWineOrder({
        customer_name: formData.name,
        email: formData.email,
        phone_number: formData.phone,
        address: formData.address,
        notes: formData.notes,
        items: items.map(item => ({
          wine_id: item.wineId,
          name: item.name,
          vintage: item.vintage,
          price: item.price,
          quantity: item.quantity
        })),
        source_page: window.location.pathname,
      });

      setIsSuccess(true);
      clearCart();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const symbol = currencySymbol(config.currency);

  if (isSuccess) {
    return (
      <div 
        data-theme={theme} 
        style={accentStyle} 
        className="min-h-screen bg-[var(--color-ink-900)] text-[var(--color-bone-100)] flex flex-col"
      >
        <Nav config={config} menu={menu} />
        <main className="flex-1 flex items-center justify-center p-6 pt-32">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-md w-full text-center"
          >
            <div className="mb-8 flex justify-center">
              <div className="h-20 w-20 rounded-full bg-green-500/10 flex items-center justify-center text-green-500">
                <CheckCircle2 size={48} strokeWidth={1} />
              </div>
            </div>
            <h1 className="font-display text-4xl font-light mb-4">Order Received.</h1>
            <p className="body-editorial text-[var(--color-bone-300)] mb-10">
              Thank you for your order. We have received your request and our estate manager will contact you at <strong>{formData.email}</strong> shortly to finalize the details.
            </p>
            <Link 
              to="/" 
              className="inline-flex items-center gap-3 bg-[var(--color-bone-50)] text-[var(--color-ink-900)] px-8 py-4 label-eyebrow transition-colors hover:bg-[var(--color-bone-100)]"
            >
              Return to the estate
              <ArrowRight size={16} />
            </Link>
          </motion.div>
        </main>
        <Footer config={config} />
      </div>
    );
  }

  return (
    <div 
      data-theme={theme} 
      style={accentStyle} 
      className="min-h-screen bg-[var(--color-ink-900)] text-[var(--color-bone-100)] flex flex-col"
    >
      <Nav config={config} menu={menu} />
      
      <main className="flex-1 w-full max-w-[1480px] mx-auto px-6 py-32 md:px-10">
        <header className="mb-16">
          <Link to="/" className="inline-flex items-center gap-2 text-[var(--color-bone-500)] hover:text-[var(--color-bone-100)] transition-colors mb-6 label-eyebrow group">
            <ChevronLeft size={14} className="transition-transform group-hover:-translate-x-1" />
            Back to collection
          </Link>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <span className="label-eyebrow text-[var(--color-pearl-300)] mb-2 block">Shopping Cart</span>
              <h1 className="font-display text-5xl md:text-6xl font-light tracking-tight">Your Selection.</h1>
            </div>
            <p className="body-editorial text-[var(--color-bone-400)] max-w-sm">
              Review your collection and provide your details below to request an order from the cellar.
            </p>
          </div>
        </header>

        {items.length === 0 ? (
          <div className="py-20 border-t border-[var(--border-subtle)] text-center">
            <div className="mb-6 opacity-20 flex justify-center">
              <ShoppingBag size={64} strokeWidth={1} />
            </div>
            <p className="body-editorial text-[var(--color-bone-400)] mb-10 text-xl">The cellar is empty.</p>
            <Link 
              to="/" 
              className="inline-flex items-center gap-3 bg-[var(--color-bone-50)] text-[var(--color-ink-900)] px-8 py-4 label-eyebrow transition-colors hover:bg-[var(--color-bone-100)]"
            >
              Explore the collection
              <ArrowRight size={16} />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
            {/* Cart Items List */}
            <div className="lg:col-span-7 space-y-8">
              <div className="space-y-0">
                <AnimatePresence mode="popLayout">
                  {items.map((item) => (
                    <motion.div 
                      key={item.wineId}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="group flex gap-6 py-8 border-b border-[var(--border-subtle)] items-center"
                    >
                      <div className="h-24 w-20 shrink-0 overflow-hidden bg-[var(--color-ink-850)] border border-[var(--border-subtle)]">
                        {item.image ? (
                          <img 
                            src={resolveAsset(item.image)} 
                            alt={item.name} 
                            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center opacity-20">
                            <ShoppingBag size={24} />
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start gap-4">
                          <div>
                            <h3 className="font-display text-2xl font-light text-[var(--color-bone-100)] mb-1">
                              {item.name}
                            </h3>
                            {item.vintage && (
                              <span className="font-display italic text-lg text-[var(--color-pearl-300)]">
                                {item.vintage}
                              </span>
                            )}
                          </div>
                          <span className="font-mono text-sm text-[var(--color-bone-100)] pt-1">
                            {symbol}{item.price.toFixed(0)}
                          </span>
                        </div>
                        
                        <div className="mt-6 flex items-center justify-between">
                          <div className="flex items-center border border-[var(--border-subtle)] bg-[var(--color-ink-950)]/50">
                            <button 
                              onClick={() => updateQuantity(item.wineId, item.quantity - 1)}
                              className="p-2 text-[var(--color-bone-500)] hover:text-[var(--color-bone-100)] transition-colors"
                            >
                              <Minus size={14} />
                            </button>
                            <span className="w-10 text-center font-mono text-sm border-x border-[var(--border-subtle)] py-1">
                              {item.quantity}
                            </span>
                            <button 
                              onClick={() => updateQuantity(item.wineId, item.quantity + 1)}
                              className="p-2 text-[var(--color-bone-500)] hover:text-[var(--color-bone-100)] transition-colors"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                          
                          <button 
                            onClick={() => removeFromCart(item.wineId)}
                            className="text-[var(--color-bone-500)] hover:text-red-400 transition-colors p-2 flex items-center gap-2 label-eyebrow text-[10px]"
                          >
                            <Trash2 size={14} strokeWidth={1.5} />
                            Remove
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              <div className="pt-4 flex justify-between items-center">
                <span className="label-eyebrow text-[var(--color-bone-500)]">Subtotal</span>
                <span className="font-display text-4xl font-light text-[var(--color-bone-50)]">
                  {symbol}{totalPrice.toFixed(0)}
                </span>
              </div>
            </div>

            {/* Checkout Form */}
            <div className="lg:col-span-5">
              <div className="sticky top-32 bg-[var(--color-ink-850)]/50 border border-[var(--border-subtle)] p-8 md:p-10 backdrop-blur-md">
                <h2 className="font-display text-3xl font-light mb-8">Checkout.</h2>
                
                <form onSubmit={handleSubmit} className="space-y-6">
                  {error && (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-200 text-sm flex gap-3">
                      <div className="shrink-0 pt-0.5">⚠️</div>
                      {error}
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="label-eyebrow text-[var(--color-bone-400)]">Full Name</label>
                    <input 
                      required
                      type="text"
                      className="w-full bg-[var(--color-ink-900)] border border-[var(--border-subtle)] px-4 py-3 text-[var(--color-bone-100)] focus:outline-none focus:border-[var(--color-pearl-300)] transition-colors"
                      placeholder="Enter your name"
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="label-eyebrow text-[var(--color-bone-400)]">Email Address</label>
                      <input 
                        required
                        type="email"
                        className="w-full bg-[var(--color-ink-900)] border border-[var(--border-subtle)] px-4 py-3 text-[var(--color-bone-100)] focus:outline-none focus:border-[var(--color-pearl-300)] transition-colors"
                        placeholder="your@email.com"
                        value={formData.email}
                        onChange={e => setFormData({...formData, email: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="label-eyebrow text-[var(--color-bone-400)]">Phone Number</label>
                      <input 
                        required
                        type="tel"
                        className="w-full bg-[var(--color-ink-900)] border border-[var(--border-subtle)] px-4 py-3 text-[var(--color-bone-100)] focus:outline-none focus:border-[var(--color-pearl-300)] transition-colors"
                        placeholder="+27..."
                        value={formData.phone}
                        onChange={e => setFormData({...formData, phone: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="label-eyebrow text-[var(--color-bone-400)]">Delivery Address</label>
                    <textarea 
                      required
                      className="w-full bg-[var(--color-ink-900)] border border-[var(--border-subtle)] px-4 py-3 text-[var(--color-bone-100)] focus:outline-none focus:border-[var(--color-pearl-300)] transition-colors min-h-[100px] resize-none"
                      placeholder="Enter full shipping address"
                      value={formData.address}
                      onChange={e => setFormData({...formData, address: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="label-eyebrow text-[var(--color-bone-400)]">Notes (Optional)</label>
                    <textarea 
                      className="w-full bg-[var(--color-ink-900)] border border-[var(--border-subtle)] px-4 py-3 text-[var(--color-bone-100)] focus:outline-none focus:border-[var(--color-pearl-300)] transition-colors min-h-[80px] resize-none"
                      placeholder="Any special instructions..."
                      value={formData.notes}
                      onChange={e => setFormData({...formData, notes: e.target.value})}
                    />
                  </div>

                  <button 
                    disabled={isSubmitting}
                    className="w-full bg-[var(--color-bone-50)] text-[var(--color-ink-900)] py-4 label-eyebrow flex items-center justify-center gap-3 transition-colors hover:bg-[var(--color-bone-100)] disabled:opacity-50 disabled:cursor-not-allowed mt-4"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="animate-spin" size={16} />
                        Processing...
                      </>
                    ) : (
                      <>
                        Submit Order Request
                        <ArrowRight size={16} />
                      </>
                    )}
                  </button>
                  
                  <p className="text-[10px] text-[var(--color-bone-500)] text-center mt-6 uppercase tracking-wider">
                    Our estate manager will verify your request and contact you to finalize shipping and payment.
                  </p>
                </form>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer config={config} />
    </div>
  );
}
