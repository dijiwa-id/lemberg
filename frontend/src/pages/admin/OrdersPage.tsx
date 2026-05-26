import { useEffect, useState } from "react";
import { 
  ShoppingBag, 
  Search, 
  Filter, 
  ChevronRight, 
  Clock, 
  CheckCircle2, 
  Package, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  ArrowLeft,
  Calendar,
  CreditCard,
  Send,
  Download
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { AdminContext } from "../Admin";
import { PageHeader } from "../../components/admin/PageHeader";
import { Card } from "../../components/admin/Card";
import { Badge } from "../../components/admin/Badge";
import { http, errorMessage, notifyOrder } from "../../services/api";
import { useToast } from "../../lib/toast";
import { currencySymbol } from "../../lib/types";
import { cn } from "../../lib/utils";

interface OrderItem {
  wine_id: number;
  name: string;
  vintage?: string;
  price: number;
  quantity: number;
}

interface Order {
  id: number;
  customer_name: string;
  email: string;
  phone_number: string;
  address: string;
  wine_product_id?: number | null;
  quantity?: number | null;
  items?: OrderItem[] | null;
  notes?: string | null;
  status: string;
  source_page?: string | null;
  createdAt: string;
  updatedAt: string;
}

export function OrdersPage({ ctx }: { ctx: AdminContext }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [search, setSearch] = useState("");
  const toast = useToast();

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const { data } = await http.get<Order[]>("/admin/wine-orders");
      // Sort by newest first
      setOrders(data);
    } catch (e) {
      toast.error("Failed to load orders", errorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const updateOrderStatus = async (id: number, status: string) => {
    try {
      await http.patch(`/admin/wine-orders/${id}`, { status });
      setOrders(os => os.map(o => o.id === id ? { ...o, status } : o));
      if (selectedOrder?.id === id) setSelectedOrder({ ...selectedOrder, status });
      toast.success("Order updated", `Order #${id} is now ${status}.`);
    } catch (e) {
      toast.error("Failed to update status", errorMessage(e));
    }
  };

  const filteredOrders = orders.filter(o => 
    o.customer_name.toLowerCase().includes(search.toLowerCase()) ||
    o.email.toLowerCase().includes(search.toLowerCase()) ||
    String(o.id).includes(search)
  );

  const symbol = currencySymbol(ctx.config.currency);

  const formatDate = (dateStr: string) => {
    try {
      return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(new Date(dateStr));
    } catch {
      return dateStr;
    }
  };

  const formatDateTime = (dateStr: string) => {
    try {
      return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(dateStr));
    } catch {
      return dateStr;
    }
  };

  if (selectedOrder) {
    return <OrderDetails 
      order={selectedOrder} 
      onBack={() => setSelectedOrder(null)} 
      onUpdateStatus={updateOrderStatus}
      symbol={symbol}
      formatDateTime={formatDateTime}
      ctx={ctx}
    />;
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Wine Orders" 
        description="Manage collection orders and customer requests from the cart."
      />

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-bone-500)]" size={16} />
          <input 
            type="text"
            placeholder="Search by name, email or ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-[var(--color-ink-850)] border border-[var(--border-subtle)] pl-10 pr-4 py-2.5 text-sm text-[var(--color-bone-100)] focus:outline-none focus:border-[var(--color-pearl-300)] transition-colors"
          />
        </div>
      </div>

      <Card className="overflow-hidden border-[var(--border-subtle)] bg-[var(--color-ink-900)]/20 backdrop-blur-sm">
        {loading ? (
          <div className="py-32 flex flex-col items-center justify-center gap-4 text-[var(--color-bone-500)]">
            <div className="h-10 w-10 border-2 border-[var(--color-pearl-300)] border-t-transparent animate-spin rounded-full" />
            <p className="label-eyebrow tracking-widest opacity-50">Loading orders...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="py-32 flex flex-col items-center justify-center gap-6 text-[var(--color-bone-500)]">
            <div className="h-20 w-20 flex items-center justify-center rounded-full bg-[var(--color-ink-800)]/50 border border-[var(--border-subtle)]">
              <ShoppingBag size={32} strokeWidth={1} className="opacity-40" />
            </div>
            <div className="text-center space-y-1">
              <p className="label-eyebrow text-[var(--color-bone-200)]">No orders found</p>
              <p className="text-xs opacity-50">Try adjusting your search or filters.</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] bg-[var(--color-ink-950)]/50">
                  <th className="pl-8 pr-6 py-5 label-eyebrow text-[var(--color-bone-500)] text-[10px] tracking-[0.2em]">Ref.</th>
                  <th className="px-6 py-5 label-eyebrow text-[var(--color-bone-500)] text-[10px] tracking-[0.2em]">Customer</th>
                  <th className="px-6 py-5 label-eyebrow text-[var(--color-bone-500)] text-[10px] tracking-[0.2em]">Date</th>
                  <th className="px-6 py-5 label-eyebrow text-[var(--color-bone-500)] text-[10px] tracking-[0.2em] text-center">Items</th>
                  <th className="px-6 py-5 label-eyebrow text-[var(--color-bone-500)] text-[10px] tracking-[0.2em]">Total</th>
                  <th className="px-6 py-5 label-eyebrow text-[var(--color-bone-500)] text-[10px] tracking-[0.2em]">Status</th>
                  <th className="px-6 py-5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {filteredOrders.map(order => {
                  const itemCount = order.items 
                    ? order.items.reduce((sum, i) => sum + i.quantity, 0)
                    : 0;
                  const total = order.items 
                    ? order.items.reduce((sum, i) => sum + (i.price * i.quantity), 0)
                    : 0;
                  
                  return (
                    <tr 
                      key={order.id} 
                      className="group hover:bg-[var(--color-pearl-300)]/[0.03] transition-colors cursor-pointer"
                      onClick={() => setSelectedOrder(order)}
                    >
                      <td className="pl-8 pr-6 py-5">
                        <span className="font-mono text-sm text-[var(--color-bone-400)] group-hover:text-[var(--color-pearl-300)] transition-colors">#{order.id}</span>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-[var(--color-bone-100)] group-hover:text-white transition-colors">{order.customer_name}</span>
                          <span className="text-xs text-[var(--color-bone-500)] font-mono">{order.email}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-col">
                          <span className="text-sm text-[var(--color-bone-300)]">
                            {formatDate(order.createdAt)}
                          </span>
                          <span className="text-[10px] text-[var(--color-bone-600)] uppercase tracking-tighter">
                            {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-[var(--color-ink-800)] border border-[var(--border-subtle)] text-[10px] font-mono text-[var(--color-bone-400)]">
                          {itemCount}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <span className="text-sm font-medium text-[var(--color-bone-100)]">
                          {symbol}{total.toLocaleString(undefined, { minimumFractionDigits: 0 })}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <StatusBadge status={order.status} />
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="h-8 w-8 inline-flex items-center justify-center rounded-full border border-transparent group-hover:border-[var(--border-subtle)] group-hover:bg-[var(--color-ink-800)] transition-all">
                          <ChevronRight size={14} className="text-[var(--color-bone-600)] group-hover:text-[var(--color-bone-100)] transition-transform group-hover:translate-x-0.5" />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function OrderDetails({ order, onBack, onUpdateStatus, symbol, formatDateTime, ctx }: { 
  order: Order; 
  onBack: () => void; 
  onUpdateStatus: (id: number, status: string) => void;
  symbol: string;
  formatDateTime: (d: string) => string;
  ctx: AdminContext;
}) {
  const [isNotifying, setIsNotifying] = useState(false);
  const toast = useToast();

  const handleNotify = async () => {
    setIsNotifying(true);
    try {
      await notifyOrder(order.id);
      toast.success("Notification sent", "An email notification has been sent to the seller.");
    } catch (e) {
      toast.error("Failed to send notification", errorMessage(e));
    } finally {
      setIsNotifying(false);
    }
  };

  const total = order.items 
    ? order.items.reduce((sum, i) => sum + (i.price * i.quantity), 0)
    : 0;

  const handleExportPDF = () => {
    const doc = new jsPDF();
    const studioName = ctx.config.studioName || "Lemberg";
    
    // --- Header ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(40, 40, 40);
    doc.text(studioName.toUpperCase(), 14, 25);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text("OFFICIAL PURCHASE ORDER", 14, 32);
    
    // Accent line
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.line(14, 38, 196, 38);
    
    // Order Info Block
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text("ORDER REFERENCE", 14, 48);
    doc.text("DATE PLACED", 140, 48);
    
    doc.setFontSize(12);
    doc.setTextColor(40, 40, 40);
    doc.text(`#${order.id}`, 14, 55);
    doc.text(formatDateTime(order.createdAt), 140, 55);
    
    // --- Customer & Shipping ---
    doc.setDrawColor(240, 240, 240);
    doc.setFillColor(250, 250, 250);
    doc.rect(14, 65, 182, 45, "F");
    
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text("CUSTOMER DETAILS", 20, 75);
    
    doc.setFontSize(11);
    doc.setTextColor(40, 40, 40);
    doc.setFont("helvetica", "bold");
    doc.text(order.customer_name, 20, 83);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    doc.text([
      order.email,
      order.phone_number,
    ], 20, 89);
    
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text("SHIPPING ADDRESS", 110, 75);
    
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    const splitAddress = doc.splitTextToSize(order.address || "No address provided", 80);
    doc.text(splitAddress, 110, 83);
    
    // --- Items Table ---
    const tableData = order.items?.map(item => [
      { content: `${item.name}${item.vintage ? ` (${item.vintage})` : ""}`, styles: { fontStyle: 'bold' } },
      { content: item.quantity.toString(), styles: { halign: 'center' } },
      { content: `${symbol}${item.price.toLocaleString()}`, styles: { halign: 'right' } },
      { content: `${symbol}${(item.price * item.quantity).toLocaleString()}`, styles: { halign: 'right', fontStyle: 'bold' } }
    ]) || [];
    
    autoTable(doc, {
      startY: 120,
      head: [['Product Description', 'Quantity', 'Unit Price', 'Total']],
      body: tableData as any,
      theme: 'striped',
      headStyles: { 
        fillColor: [30, 30, 30], 
        textColor: [255, 255, 255], 
        fontSize: 10,
        cellPadding: 5
      },
      bodyStyles: { 
        fontSize: 9,
        cellPadding: 4,
        textColor: [60, 60, 60]
      },
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { cellWidth: 30 },
        2: { cellWidth: 35 },
        3: { cellWidth: 35 }
      },
      foot: [[
        { content: 'ORDER TOTAL', colSpan: 3, styles: { halign: 'right', fontStyle: 'bold' } },
        { content: `${symbol}${total.toLocaleString()}`, styles: { halign: 'right', fontStyle: 'bold', fontSize: 11 } }
      ]],
      footStyles: { fillColor: [245, 245, 245], textColor: [20, 20, 20] }
    });
    
    const finalY = (doc as any).lastAutoTable.finalY || 150;
    
    // --- Notes ---
    if (order.notes) {
      doc.setFontSize(9);
      doc.setTextColor(120, 120, 120);
      doc.text("CUSTOMER NOTES", 14, finalY + 15);
      
      doc.setFontSize(10);
      doc.setTextColor(80, 80, 80);
      doc.setFont("helvetica", "italic");
      const splitNotes = doc.splitTextToSize(`"${order.notes}"`, 180);
      doc.text(splitNotes, 14, finalY + 22);
    }
    
    // --- Footer ---
    const pageHeight = doc.internal.pageSize.height;
    doc.setDrawColor(230, 230, 230);
    doc.line(14, pageHeight - 30, 196, pageHeight - 30);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    const footerText = ctx.config.footerAddress || "Lemberg Winery, Tulbagh Valley";
    doc.text(footerText, 14, pageHeight - 20);
    doc.text(`Generated on ${new Date().toLocaleDateString()} — ${studioName} Studio`, 14, pageHeight - 15);
    
    doc.save(`Order_${order.id}_${order.customer_name.replace(/\s+/g, '_')}.pdf`);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="flex items-start gap-5">
          <button 
            onClick={onBack}
            className="mt-1 h-12 w-12 flex items-center justify-center rounded-full border border-[var(--border-subtle)] text-[var(--color-bone-400)] hover:text-[var(--color-bone-100)] hover:border-[var(--color-bone-100)] hover:bg-[var(--color-ink-800)] transition-all group"
          >
            <ArrowLeft size={20} className="group-hover:-translate-x-0.5 transition-transform" />
          </button>
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <span className="label-eyebrow text-[var(--color-bone-500)] tracking-[0.2em]">Order Details</span>
              <StatusBadge status={order.status} />
            </div>
            <h1 className="font-display text-4xl font-light text-[var(--color-bone-50)]">
              #{order.id} — <span className="opacity-60">{order.customer_name}</span>
            </h1>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportPDF}
            className="inline-flex items-center gap-2 bg-[var(--color-ink-800)] border border-[var(--border-subtle)] text-[var(--color-bone-100)] px-5 py-3 text-[10px] label-eyebrow transition-all hover:bg-[var(--color-ink-700)] hover:border-[var(--color-bone-400)] active:scale-[0.98]"
          >
            <Download size={14} className="opacity-60" />
            Export PDF
          </button>

          <button
            onClick={handleNotify}
            disabled={isNotifying}
            className="inline-flex items-center gap-2 bg-[var(--color-pearl-300)] text-[var(--color-ink-950)] px-5 py-3 text-[10px] label-eyebrow transition-all hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
          >
            <Send size={14} />
            {isNotifying ? "Sending..." : "Notify Seller"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Order Items */}
          <Card className="p-0 overflow-hidden border-[var(--border-subtle)] bg-[var(--color-ink-900)]/40">
            <div className="px-8 py-5 border-b border-[var(--border-subtle)] bg-[var(--color-ink-950)]/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Package size={18} className="text-[var(--color-pearl-300)]" />
                <h3 className="label-eyebrow text-[var(--color-bone-100)] tracking-widest text-[11px]">Items Summary</h3>
              </div>
              <span className="text-[10px] font-mono text-[var(--color-bone-500)] uppercase">
                {order.items?.length || 0} unique lines
              </span>
            </div>
            <div className="p-0 overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-[var(--border-subtle)]/50">
                    <th className="pl-8 pr-6 py-4 text-[10px] uppercase tracking-[0.2em] text-[var(--color-bone-500)]">Product</th>
                    <th className="px-6 py-4 text-[10px] uppercase tracking-[0.2em] text-[var(--color-bone-500)] text-center">Qty</th>
                    <th className="px-6 py-4 text-[10px] uppercase tracking-[0.2em] text-[var(--color-bone-500)] text-right">Price</th>
                    <th className="px-6 py-4 text-[10px] uppercase tracking-[0.2em] text-[var(--color-bone-500)] text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]/30">
                  {order.items?.map((item, idx) => (
                    <tr key={idx} className="group hover:bg-[var(--color-bone-100)]/[0.02] transition-colors">
                      <td className="pl-8 pr-6 py-5">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-[var(--color-bone-100)] group-hover:text-white transition-colors">{item.name}</span>
                          {item.vintage && <span className="text-[10px] text-[var(--color-pearl-300)] italic tracking-wider mt-0.5">{item.vintage}</span>}
                        </div>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <span className="text-sm font-mono text-[var(--color-bone-400)]">{item.quantity}</span>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <span className="text-sm font-mono text-[var(--color-bone-400)]">{symbol}{item.price.toLocaleString()}</span>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <span className="text-sm font-mono font-medium text-[var(--color-bone-100)]">{symbol}{(item.price * item.quantity).toLocaleString()}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-[var(--color-ink-950)]/50">
                    <td colSpan={3} className="pl-8 pr-6 py-8 text-right font-medium text-[var(--color-bone-400)] label-eyebrow tracking-widest text-[11px]">Total Order Value</td>
                    <td className="px-6 py-8 text-right font-display text-3xl text-[var(--color-pearl-300)] font-light">{symbol}{total.toLocaleString()}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>

          {/* Notes */}
          {order.notes && (
            <Card className="p-8 space-y-4 border-l-4 border-l-[var(--color-pearl-300)] bg-[var(--color-ink-900)]/40">
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-[var(--color-bone-500)]" />
                <h3 className="label-eyebrow text-[var(--color-bone-500)] text-[10px] tracking-widest">Customer Request</h3>
              </div>
              <p className="body-editorial text-[var(--color-bone-200)] italic whitespace-pre-wrap leading-relaxed text-lg">
                "{order.notes}"
              </p>
            </Card>
          )}
        </div>

        <div className="space-y-8">
          {/* Status Actions */}
          <Card className="p-8 space-y-6 border-[var(--border-subtle)] bg-[var(--color-ink-900)]/40">
            <div className="flex items-center justify-between">
              <h3 className="label-eyebrow text-[var(--color-bone-500)] text-[10px] tracking-widest">Status Lifecycle</h3>
              <Clock size={14} className="text-[var(--color-bone-600)]" />
            </div>
            <div className="flex flex-col gap-2">
              <StatusButton active={order.status === "new"} status="new" onClick={() => onUpdateStatus(order.id, "new")} />
              <StatusButton active={order.status === "processing"} status="processing" onClick={() => onUpdateStatus(order.id, "processing")} />
              <StatusButton active={order.status === "contacted"} status="contacted" onClick={() => onUpdateStatus(order.id, "contacted")} />
              <StatusButton active={order.status === "completed"} status="completed" onClick={() => onUpdateStatus(order.id, "completed")} />
              <StatusButton active={order.status === "cancelled"} status="cancelled" onClick={() => onUpdateStatus(order.id, "cancelled")} />
            </div>
          </Card>

          {/* Customer Info */}
          <Card className="p-0 overflow-hidden border-[var(--border-subtle)] bg-[var(--color-ink-900)]/40">
            <div className="px-8 py-5 border-b border-[var(--border-subtle)] bg-[var(--color-ink-950)]/50">
              <h3 className="label-eyebrow text-[var(--color-bone-100)] text-[10px] tracking-widest">Customer Record</h3>
            </div>
            <div className="p-8 space-y-6">
              <div className="flex gap-5">
                <div className="h-12 w-12 shrink-0 flex items-center justify-center bg-[var(--color-ink-800)] border border-[var(--border-subtle)] text-[var(--color-bone-400)] rounded-xl">
                  <User size={20} />
                </div>
                <div className="min-w-0">
                  <p className="label-eyebrow text-[9px] text-[var(--color-bone-500)] tracking-widest uppercase">Full Name</p>
                  <p className="text-base font-medium text-[var(--color-bone-100)] truncate">{order.customer_name}</p>
                </div>
              </div>

              <div className="flex gap-5">
                <div className="h-12 w-12 shrink-0 flex items-center justify-center bg-[var(--color-ink-800)] border border-[var(--border-subtle)] text-[var(--color-bone-400)] rounded-xl">
                  <Mail size={20} />
                </div>
                <div className="min-w-0">
                  <p className="label-eyebrow text-[9px] text-[var(--color-bone-500)] tracking-widest uppercase">Email Address</p>
                  <p className="text-sm font-mono text-[var(--color-bone-300)] truncate select-all">{order.email}</p>
                </div>
              </div>

              <div className="flex gap-5">
                <div className="h-12 w-12 shrink-0 flex items-center justify-center bg-[var(--color-ink-800)] border border-[var(--border-subtle)] text-[var(--color-bone-400)] rounded-xl">
                  <Phone size={20} />
                </div>
                <div>
                  <p className="label-eyebrow text-[9px] text-[var(--color-bone-500)] tracking-widest uppercase">Phone Number</p>
                  <p className="text-base font-medium text-[var(--color-bone-100)]">{order.phone_number}</p>
                </div>
              </div>

              <div className="flex gap-5">
                <div className="h-12 w-12 shrink-0 flex items-center justify-center bg-[var(--color-ink-800)] border border-[var(--border-subtle)] text-[var(--color-bone-400)] rounded-xl">
                  <MapPin size={20} />
                </div>
                <div>
                  <p className="label-eyebrow text-[9px] text-[var(--color-bone-500)] tracking-widest uppercase">Delivery Address</p>
                  <p className="text-sm text-[var(--color-bone-300)] leading-relaxed">{order.address}</p>
                </div>
              </div>
            </div>
          </Card>

          {/* Timeline Info */}
          <Card className="p-8 space-y-6 border-[var(--border-subtle)] bg-[var(--color-ink-900)]/40">
            <h3 className="label-eyebrow text-[var(--color-bone-500)] text-[10px] tracking-widest">Metadata</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-[var(--color-bone-500)] uppercase tracking-wider">Placed</span>
                <span className="text-[var(--color-bone-200)] font-mono">{formatDateTime(order.createdAt)}</span>
              </div>
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-[var(--color-bone-500)] uppercase tracking-wider">Source</span>
                <span className="text-[var(--color-pearl-300)] px-2 py-0.5 bg-[var(--color-pearl-300)]/10 rounded font-mono lowercase">{order.source_page || "cart"}</span>
              </div>
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-[var(--color-bone-500)] uppercase tracking-wider">Modified</span>
                <span className="text-[var(--color-bone-400)] font-mono">{formatDateTime(order.updatedAt)}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const tones: Record<string, any> = {
    new: "warning",
    processing: "info",
    contacted: "info",
    completed: "success",
    cancelled: "critical",
  };
  
  return <Badge tone={tones[status] || "default"}>{status}</Badge>;
}

function StatusButton({ active, status, onClick }: { active: boolean, status: string, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex items-center justify-between px-4 py-2.5 text-xs label-eyebrow transition-all duration-300 group",
        active 
          ? "bg-[var(--color-ink-700)] text-[var(--color-bone-100)] border border-[var(--border-subtle)]" 
          : "text-[var(--color-bone-400)] border border-[var(--border-subtle)] hover:border-[var(--color-bone-200)] hover:text-[var(--color-bone-100)]"
      )}
    >
      <span>{status}</span>
      {active && <CheckCircle2 size={12} className="text-[var(--color-pearl-300)]" />}
      {!active && <div className="h-1.5 w-1.5 rounded-full bg-[var(--color-bone-600)] opacity-0 group-hover:opacity-100 transition-opacity" />}
    </button>
  );
}
