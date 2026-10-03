import { useState, useEffect, useRef, useCallback } from "react";
import {
  Search,
  ShoppingCart,
  Building2,
  Boxes,
  CreditCard,
  FileText,
  Settings,
  X,
  ArrowRight,
  Package,
  User,
  Zap,
} from "lucide-react";
import {
  productService,
  customerService,
  Product,
  Customer,
} from "../../services/tauri";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tabId: string) => void;
}

interface PaletteItem {
  id: string;
  category: "Navigation" | "Products" | "Customers" | "Actions";
  title: string;
  subtitle?: string;
  icon: React.ElementType;
  hotkey?: string;
  action: () => void;
}

export function UniversalCommandPalette({
  isOpen,
  onClose,
  onNavigate,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Search products and customers when query changes
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length > 0) {
      productService.searchProducts(trimmed, 4).then((res) => setProducts(res.products));
      customerService.searchCustomers(trimmed).then((res) => setCustomers(res.slice(0, 3)));
    } else {
      setProducts([]);
      setCustomers([]);
    }
    setSelectedIdx(0);
  }, [query]);

  // Static Navigation Items
  const navigationItems: PaletteItem[] = [
    {
      id: "nav-pos",
      category: "Navigation",
      title: "Retail POS Billing",
      subtitle: "Fast counter billing with laser barcode scanning",
      icon: ShoppingCart,
      hotkey: "F1",
      action: () => {
        onNavigate("pos");
        onClose();
      },
    },
    {
      id: "nav-ws",
      category: "Navigation",
      title: "Wholesale Order Desk",
      subtitle: "B2B invoicing with tiered volume pricing slabs & batches",
      icon: Building2,
      hotkey: "F2",
      action: () => {
        onNavigate("wholesale");
        onClose();
      },
    },
    {
      id: "nav-inv",
      category: "Navigation",
      title: "Products & SKUs Master",
      subtitle: "Inventory catalog, pricing, margins, and low stock alerts",
      icon: Boxes,
      hotkey: "F3",
      action: () => {
        onNavigate("inventory");
        onClose();
      },
    },
    {
      id: "nav-khata",
      category: "Navigation",
      title: "Credit & Khata Ledger",
      subtitle: "Customer debt management, repayment settlements, WhatsApp reminders",
      icon: CreditCard,
      hotkey: "F4",
      action: () => {
        onNavigate("credit");
        onClose();
      },
    },
    {
      id: "nav-rep",
      category: "Navigation",
      title: "GST & Tax Reports",
      subtitle: "GSTR-1 summaries, HSN tables, and Tally Prime XML export",
      icon: FileText,
      hotkey: "F5",
      action: () => {
        onNavigate("reports");
        onClose();
      },
    },
    {
      id: "nav-set",
      category: "Navigation",
      title: "Store Settings & Printers",
      subtitle: "Configure hardware, receipt templates, and financial year",
      icon: Settings,
      hotkey: "F6",
      action: () => {
        onNavigate("settings");
        onClose();
      },
    },
  ];

  // Quick Action Items
  const actionItems: PaletteItem[] = [
    {
      id: "act-add-prod",
      category: "Actions",
      title: "Add New Product SKU",
      subtitle: "Create a new inventory item with barcode and tax rate",
      icon: Zap,
      action: () => {
        onNavigate("inventory");
        onClose();
      },
    },
    {
      id: "act-khata-pay",
      category: "Actions",
      title: "Record Khata Payment Collection",
      subtitle: "Record Cash/UPI settlement from a credit customer",
      icon: CreditCard,
      action: () => {
        onNavigate("credit");
        onClose();
      },
    },
  ];

  // Map dynamic Product Items
  const productItems: PaletteItem[] = products.map((p) => ({
    id: `prod-${p.id}`,
    category: "Products",
    title: p.name,
    subtitle: `₹${p.selling_price} | Stock: ${p.stock_qty} ${p.unit} | Barcode: ${p.barcode || "N/A"}`,
    icon: Package,
    action: () => {
      onNavigate("inventory");
      onClose();
    },
  }));

  // Map dynamic Customer Items
  const customerItems: PaletteItem[] = customers.map((c) => ({
    id: `cust-${c.id}`,
    category: "Customers",
    title: c.name,
    subtitle: `Phone: ${c.phone || "—"} | Khata Balance: ₹${c.current_balance.toFixed(2)}`,
    icon: User,
    action: () => {
      onNavigate("credit");
      onClose();
    },
  }));

  // Filter and Assemble All Palette Items
  const filteredNav = query.trim()
    ? navigationItems.filter(
        (i) =>
          i.title.toLowerCase().includes(query.toLowerCase()) ||
          i.subtitle?.toLowerCase().includes(query.toLowerCase())
      )
    : navigationItems;

  const allItems: PaletteItem[] = [
    ...productItems,
    ...customerItems,
    ...filteredNav,
    ...actionItems,
  ];

  // Keyboard navigation handler
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIdx((prev) => (prev < allItems.length - 1 ? prev + 1 : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIdx((prev) => (prev > 0 ? prev - 1 : allItems.length - 1));
      } else if (e.key === "Enter" && allItems.length > 0) {
        e.preventDefault();
        allItems[selectedIdx]?.action();
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    },
    [allItems, selectedIdx, onClose]
  );

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-start justify-center pt-20 p-4 z-(--z-modal) animate-in fade-in duration-100"
      onClick={onClose}
    >
      <div
        className="bg-(--color-bg-surface) border border-(--color-border-default) rounded-xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* SEARCH INPUT BAR */}
        <div className="p-3.5 border-b border-(--color-border-default) bg-(--color-bg-page) flex items-center gap-3">
          <Search className="w-5 h-5 text-(--color-action-primary) shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search products, customers, invoices, or jump to modules..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-sm text-(--color-text-primary) placeholder-(--color-text-muted) outline-none focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="p-1 rounded-sm text-(--color-text-muted) hover:text-(--color-text-primary) cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="px-2 py-0.5 rounded-sm bg-(--color-bg-subtle) text-[10px] font-mono text-(--color-text-secondary) border border-(--color-border-default) shrink-0">
            ESC
          </kbd>
        </div>

        {/* ITEMS LIST */}
        <div className="max-h-96 overflow-y-auto p-2 space-y-1">
          {allItems.length === 0 ? (
            <div className="py-12 text-center text-(--color-text-muted) text-xs">
              No matching products, customers, or actions found.
            </div>
          ) : (
            allItems.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = idx === selectedIdx;
              return (
                <div
                  key={item.id}
                  onClick={item.action}
                  onMouseEnter={() => setSelectedIdx(idx)}
                  className={`p-2.5 rounded-lg flex items-center justify-between cursor-pointer transition-colors ${
                    isSelected
                      ? "bg-(--color-action-primary) text-white"
                      : "text-(--color-text-primary) hover:bg-(--color-bg-subtle)"
                  }`}
                >
                  <div className="flex items-center gap-3 truncate">
                    <div
                      className={`p-1.5 rounded-md ${
                        isSelected
                          ? "bg-white/20 text-white"
                          : "bg-(--color-bg-subtle) text-(--color-action-primary)"
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                    </div>
                    <div className="truncate">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs truncate" title={item.title}>
                          {item.title}
                        </span>
                        <span
                          className={`text-[9px] font-mono uppercase px-1.5 py-0.2 rounded-sm ${
                            isSelected
                              ? "bg-white/20 text-white"
                              : "bg-(--color-bg-subtle) text-(--color-text-muted)"
                          }`}
                        >
                          {item.category}
                        </span>
                      </div>
                      {item.subtitle && (
                        <span
                          className={`text-[11px] font-mono block truncate ${
                            isSelected ? "text-white/80" : "text-(--color-text-secondary)"
                          }`}
                          title={item.subtitle}
                        >
                          {item.subtitle}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    {item.hotkey && (
                      <kbd
                        className={`px-1.5 py-0.5 rounded-sm text-[10px] font-mono ${
                          isSelected
                            ? "bg-white/20 text-white"
                            : "bg-(--color-bg-subtle) text-(--color-text-muted) border border-(--color-border-default)"
                        }`}
                      >
                        {item.hotkey}
                      </kbd>
                    )}
                    <ArrowRight
                      className={`w-3.5 h-3.5 ${
                        isSelected ? "text-white" : "text-(--color-text-muted)"
                      }`}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* PALETTE FOOTER */}
        <div className="p-2.5 bg-(--color-bg-page) border-t border-(--color-border-default) flex items-center justify-between text-[11px] font-mono text-(--color-text-muted)">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>ESC Close</span>
          </div>
          <span>Enterprise Universal Search</span>
        </div>
      </div>
    </div>
  );
}
