import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Barcode,
  Search,
  Plus,
  Trash2,
  Users,
  CreditCard,
  Banknote,
  QrCode,
  CheckCircle2,
  X,
  Printer,
  RotateCcw,
  Sliders,
} from "lucide-react";
import {
  productService,
  customerService,
  invoiceService,
  printerService,
  Product,
  Customer,
  PosInvoiceItemInput,
  PosInvoiceInput,
} from "../../services/tauri";
import { ThermalPrinterModal } from "./ThermalPrinterModal";

export interface CartItem {
  product: Product;
  qty: number;
  unitPrice: number;
  discountPct: number;
  taxRate: number;
}

export function PosBillingScreen() {
  // Cart & Items State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCartIdx, setSelectedCartIdx] = useState<number>(0);
  const [barcodeInput, setBarcodeInput] = useState<string>("");
  const [searchSuggestions, setSearchSuggestions] = useState<Product[]>([]);

  // Customer State
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer>({
    id: "cust-walkin",
    name: "Walk-in Retail Customer",
    phone: null,
    email: null,
    gstin: null,
    address: null,
    credit_limit: 0,
    current_balance: 0,
    loyalty_points: 0,
    is_active: true,
    created_at: "",
  });
  const [customerSearchQuery, setCustomerSearchQuery] = useState<string>("");
  const [customerModalOpen, setCustomerModalOpen] = useState<boolean>(false);
  const [newCustName, setNewCustName] = useState<string>("");
  const [newCustPhone, setNewCustPhone] = useState<string>("");

  // Payment & Bill Discount State
  const [billDiscountPct, setBillDiscountPct] = useState<number>(0);
  const [tenderMode, setTenderMode] = useState<"CASH" | "UPI" | "CARD" | "SPLIT">("CASH");
  const [cashTendered, setCashTendered] = useState<number>(0);
  const [upiTendered, setUpiTendered] = useState<number>(0);
  const [cardTendered, setCardTendered] = useState<number>(0);
  const [creditTendered, setCreditTendered] = useState<number>(0);

  // Thermal Printer & Feedback State
  const [printerModalOpen, setPrinterModalOpen] = useState<boolean>(false);
  const [lastInvoiceId, setLastInvoiceId] = useState<string | undefined>(undefined);
  const [autoPrintThermal, setAutoPrintThermal] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // References
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const scannerBuffer = useRef<string>("");
  const lastKeyTime = useRef<number>(0);

  // --------------------------------------------------------------------------
  // 1. INITIALIZATION & CUSTOMER LOADING
  // --------------------------------------------------------------------------
  useEffect(() => {
    async function init() {
      const custs = await customerService.searchCustomers("");
      setCustomers(custs);
      const walkin = custs.find((c) => c.id === "cust-walkin");
      if (walkin) setSelectedCustomer(walkin);
    }
    init();
    barcodeInputRef.current?.focus();
  }, []);

  // --------------------------------------------------------------------------
  // 2. LIVE SEARCH AUTOCOMPLETE (Sub-1ms)
  // --------------------------------------------------------------------------
  useEffect(() => {
    const trimmed = barcodeInput.trim();
    if (trimmed.length > 1) {
      productService.searchProducts(trimmed, 6).then((res) => {
        setSearchSuggestions(res.products);
      });
    } else {
      setSearchSuggestions([]);
    }
  }, [barcodeInput]);

  // --------------------------------------------------------------------------
  // 3. CART OPERATIONS
  // --------------------------------------------------------------------------
  const addItemToCart = useCallback((product: Product, qty: number = 1) => {
    setCart((prevCart) => {
      const existingIdx = prevCart.findIndex((item) => item.product.id === product.id);
      if (existingIdx >= 0) {
        const updated = [...prevCart];
        updated[existingIdx] = {
          ...updated[existingIdx],
          qty: updated[existingIdx].qty + qty,
        };
        setSelectedCartIdx(existingIdx);
        return updated;
      } else {
        const newItem: CartItem = {
          product,
          qty,
          unitPrice: product.selling_price,
          discountPct: 0,
          taxRate: product.tax_rate,
        };
        const updated = [...prevCart, newItem];
        setSelectedCartIdx(updated.length - 1);
        return updated;
      }
    });
    setBarcodeInput("");
    setSearchSuggestions([]);
    barcodeInputRef.current?.focus();
  }, []);

  const removeItem = useCallback((index: number) => {
    setCart((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      if (selectedCartIdx >= updated.length) {
        setSelectedCartIdx(Math.max(0, updated.length - 1));
      }
      return updated;
    });
  }, [selectedCartIdx]);

  const updateItemQty = useCallback((index: number, newQty: number) => {
    if (newQty <= 0) return;
    setCart((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], qty: newQty };
      return updated;
    });
  }, []);

  const updateItemDiscount = useCallback((index: number, newDisc: number) => {
    if (newDisc < 0 || newDisc > 100) return;
    setCart((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], discountPct: newDisc };
      return updated;
    });
  }, []);

  // --------------------------------------------------------------------------
  // 4. UNINTERRUPTIBLE HARDWARE BARCODE SCANNER BUFFER
  // --------------------------------------------------------------------------
  useEffect(() => {
    function handleGlobalKeyDown(e: KeyboardEvent) {
      // Don't capture when typing in text inputs other than barcode
      const target = e.target as HTMLElement;
      const isInput = target.tagName === "INPUT" || target.tagName === "SELECT";

      // Function Keys Shortcuts
      if (e.key === "F1") {
        e.preventDefault();
        setCustomerModalOpen(true);
        return;
      }
      if (e.key === "F2") {
        e.preventDefault();
        barcodeInputRef.current?.focus();
        return;
      }
      if (e.key === "F4") {
        e.preventDefault();
        handleCompleteSale();
        return;
      }
      if (e.key === "F5") {
        e.preventDefault();
        handleResetBill();
        return;
      }
      if (e.key === "F6") {
        e.preventDefault();
        setPrinterModalOpen(true);
        return;
      }

      // Quick Keypad Shortcuts for Cart Operations (when not in search box)
      if (!isInput && cart.length > 0) {
        if (e.key === "/") {
          e.preventDefault();
          const current = cart[selectedCartIdx]?.qty || 1;
          const val = prompt("Enter new quantity:", current.toString());
          if (val && !isNaN(Number(val))) {
            updateItemQty(selectedCartIdx, Number(val));
          }
          return;
        }
        if (e.key === "*") {
          e.preventDefault();
          const current = cart[selectedCartIdx]?.discountPct || 0;
          const val = prompt("Enter line discount %:", current.toString());
          if (val && !isNaN(Number(val))) {
            updateItemDiscount(selectedCartIdx, Number(val));
          }
          return;
        }
        if (e.key === "Delete" || e.key === "Backspace") {
          e.preventDefault();
          removeItem(selectedCartIdx);
          return;
        }
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setSelectedCartIdx((prev) => Math.min(cart.length - 1, prev + 1));
          return;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          setSelectedCartIdx((prev) => Math.max(0, prev - 1));
          return;
        }
      }

      // Hardware Barcode Scanner timing logic (rapid consecutive keystrokes < 60ms)
      const now = Date.now();
      if (now - lastKeyTime.current > 60) {
        scannerBuffer.current = "";
      }
      lastKeyTime.current = now;

      if (e.key === "Enter") {
        if (scannerBuffer.current.length >= 4) {
          const scannedCode = scannerBuffer.current.trim();
          scannerBuffer.current = "";
          productService.getProductByBarcode(scannedCode).then((prod) => {
            if (prod) {
              addItemToCart(prod, 1);
            }
          });
        }
      } else if (e.key.length === 1) {
        scannerBuffer.current += e.key;
      }
    }

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  });

  // --------------------------------------------------------------------------
  // 5. LIVE INDIAN GST CALCULATION ENGINE
  // --------------------------------------------------------------------------
  const calculatedItems = cart.map((item) => {
    const gross = item.unitPrice * item.qty;
    const itemDiscAmount = (gross * item.discountPct) / 100;
    const taxable = gross - itemDiscAmount;
    const taxAmount = (taxable * item.taxRate) / 100;
    const cgstAmount = taxAmount / 2;
    const sgstAmount = taxAmount / 2;
    const total = taxable + taxAmount;

    return {
      ...item,
      gross,
      itemDiscAmount,
      taxable,
      taxAmount,
      cgstAmount,
      sgstAmount,
      total,
    };
  });

  const rawSubtotal = calculatedItems.reduce((acc, it) => acc + it.taxable, 0);
  const totalItemDiscounts = calculatedItems.reduce((acc, it) => acc + it.itemDiscAmount, 0);
  const billDiscountAmount = (rawSubtotal * billDiscountPct) / 100;
  const taxableAfterBillDiscount = Math.max(0, rawSubtotal - billDiscountAmount);
  const totalTaxAmount = calculatedItems.reduce((acc, it) => acc + it.taxAmount, 0);
  const grossGrandTotal = taxableAfterBillDiscount + totalTaxAmount;
  const grandTotal = Math.round(grossGrandTotal);
  const roundOffAmount = Number((grandTotal - grossGrandTotal).toFixed(2));
  const totalItemsCount = cart.reduce((acc, it) => acc + it.qty, 0);

  // Auto-fill tender amounts when tender mode changes
  useEffect(() => {
    if (tenderMode === "CASH") {
      setCashTendered(grandTotal);
      setUpiTendered(0);
      setCardTendered(0);
      setCreditTendered(0);
    } else if (tenderMode === "UPI") {
      setUpiTendered(grandTotal);
      setCashTendered(0);
      setCardTendered(0);
      setCreditTendered(0);
    } else if (tenderMode === "CARD") {
      setCardTendered(grandTotal);
      setCashTendered(0);
      setUpiTendered(0);
      setCreditTendered(0);
    }
  }, [tenderMode, grandTotal]);

  const totalTendered = cashTendered + upiTendered + cardTendered + creditTendered;
  const changeToReturn = Math.max(0, cashTendered - grandTotal);
  const balanceRemaining = Math.max(0, grandTotal - totalTendered);

  // --------------------------------------------------------------------------
  // 6. INVOICE CHECKOUT & SILENT ESC/POS PRINT ACTION
  // --------------------------------------------------------------------------
  async function handleCompleteSale() {
    if (cart.length === 0) {
      alert("Cart is empty! Scan or select products first.");
      return;
    }

    if (totalTendered < grandTotal && creditTendered === 0) {
      alert(`Payment incomplete! Remaining balance: ₹${balanceRemaining}`);
      return;
    }

    setIsProcessing(true);

    const invoicePayload: PosInvoiceInput = {
      customer_id: selectedCustomer.id,
      customer_name: selectedCustomer.name,
      customer_phone: selectedCustomer.phone || undefined,
      items: calculatedItems.map(
        (it): PosInvoiceItemInput => ({
          product_id: it.product.id,
          product_name: it.product.name,
          barcode: it.product.barcode || undefined,
          hsn_code: it.product.hsn_code || undefined,
          qty: it.qty,
          unit: it.product.unit,
          unit_price: it.unitPrice,
          discount_amount: it.itemDiscAmount,
          tax_rate: it.taxRate,
          tax_amount: it.taxAmount,
          total_amount: it.total,
        })
      ),
      subtotal: rawSubtotal,
      discount_amount: totalItemDiscounts + billDiscountAmount,
      tax_amount: totalTaxAmount,
      round_off: roundOffAmount,
      total_amount: grandTotal,
      paid_amount: totalTendered,
      payment_method: tenderMode,
      payment_breakdown: {
        cash: cashTendered,
        upi: upiTendered,
        card: cardTendered,
        credit: creditTendered,
      },
    };

    try {
      const res = await invoiceService.createPosInvoice(invoicePayload);
      setLastInvoiceId(res.invoice_id);

      // Silent ESC/POS Background Printing (sub-200ms)
      if (autoPrintThermal) {
        printerService.printInvoiceThermal(res.invoice_id).catch((err) => {
          console.warn("Silent thermal print warning:", err);
        });
      }

      setSuccessToast(`Invoice #${res.invoice_no} completed & printed (${res.execution_time_ms}ms)`);
      handleResetBill();
      setTimeout(() => setSuccessToast(null), 4000);
    } catch (err) {
      alert(`Error creating invoice: ${err}`);
    } finally {
      setIsProcessing(false);
    }
  }

  function handleResetBill() {
    setCart([]);
    setSelectedCartIdx(0);
    setBarcodeInput("");
    setBillDiscountPct(0);
    setCashTendered(0);
    setUpiTendered(0);
    setCardTendered(0);
    setCreditTendered(0);
    barcodeInputRef.current?.focus();
  }

  async function handleCreateNewCustomer(e: React.FormEvent) {
    e.preventDefault();
    if (!newCustName.trim() || !newCustPhone.trim()) return;

    const created = await customerService.createCustomer({
      name: newCustName,
      phone: newCustPhone,
    });
    setSelectedCustomer(created);
    setCustomerModalOpen(false);
    setNewCustName("");
    setNewCustPhone("");
    barcodeInputRef.current?.focus();
  }

  return (
    <div className="flex flex-col h-full space-y-3 pos overflow-hidden select-none">
      {/* SUCCESS TOAST NOTIFICATION */}
      {successToast && (
        <div className="fixed top-18 right-6 z-(--z-toast) bg-(--color-success) text-white px-4 py-2.5 rounded-md shadow-lg flex items-center gap-2 text-sm font-medium animate-in fade-in duration-150">
          <CheckCircle2 className="w-5 h-5" />
          <span>{successToast}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3-COLUMN HIGH-DENSITY POS BILLING WORKSPACE                               */}
      {/* ========================================================================= */}
      <div className="flex-1 grid grid-cols-12 gap-3 min-h-0">
        {/* --------------------------------------------------------------------- */}
        {/* COLUMN 1: CUSTOMER PANEL (2.5 Cols / ~260px)                          */}
        {/* --------------------------------------------------------------------- */}
        <div className="col-span-12 lg:col-span-3 xl:col-span-2 bg-(--color-bg-surface) border border-(--color-border-default) rounded-lg p-3.5 flex flex-col justify-between shadow-xs">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-(--color-border-default) pb-2">
              <div className="flex items-center gap-1.5 font-semibold text-sm text-(--color-text-primary)">
                <Users className="w-4 h-4 text-(--color-action-primary)" />
                <span>Customer</span>
              </div>
              <kbd className="px-1.5 py-0.5 rounded-sm bg-(--color-bg-subtle) text-[10px] font-mono text-(--color-text-secondary) border border-(--color-border-default)">
                F1
              </kbd>
            </div>

            {/* ACTIVE CUSTOMER CARD */}
            <div className="p-2.5 rounded-md bg-(--color-bg-subtle) border border-(--color-border-default) space-y-1.5">
              <div className="flex items-start justify-between">
                <span className="font-bold text-sm text-(--color-text-primary) truncate">
                  {selectedCustomer.name}
                </span>
                {selectedCustomer.id === "cust-walkin" && (
                  <span className="px-1.5 py-0.2 rounded-sm text-[10px] font-mono bg-(--primitive-blue-100) text-(--color-action-primary-text)">
                    Walk-in
                  </span>
                )}
              </div>
              {selectedCustomer.phone && (
                <div className="text-xs font-mono text-(--color-text-secondary)">
                  {selectedCustomer.phone}
                </div>
              )}
              {selectedCustomer.id !== "cust-walkin" && (
                <div className="pt-1.5 border-t border-(--color-border-default) flex items-center justify-between text-xs font-mono">
                  <span className="text-(--color-text-muted)">Khata Balance:</span>
                  <span
                    className={
                      selectedCustomer.current_balance > 0
                        ? "text-(--color-danger) font-bold"
                        : "text-(--color-success) font-bold"
                    }
                  >
                    ₹{selectedCustomer.current_balance.toFixed(2)}
                  </span>
                </div>
              )}
            </div>

            {/* QUICK SWITCH CUSTOMER */}
            <button
              onClick={() => setCustomerModalOpen(true)}
              className="w-full h-9 px-3 flex items-center justify-center gap-2 rounded-md bg-(--color-bg-subtle) hover:bg-(--color-bg-hover) text-(--color-text-secondary) text-xs font-medium border border-(--color-border-default) transition-colors cursor-pointer"
            >
              <Search className="w-3.5 h-3.5 text-(--color-action-primary) shrink-0" />
              <span className="truncate">Change Customer</span>
            </button>
          </div>

          {/* PRINTER QUICK STATUS & DIAGNOSTICS */}
          <div className="pt-3 border-t border-(--color-border-default) space-y-2">
            <button
              onClick={() => setPrinterModalOpen(true)}
              className="w-full h-8 flex items-center justify-between px-2.5 rounded-md bg-(--color-bg-subtle) hover:bg-(--color-bg-hover) text-[11px] font-mono text-(--color-text-secondary) border border-(--color-border-default) transition-colors cursor-pointer"
              title="Configure Thermal ESC/POS Printer [F6]"
            >
              <div className="flex items-center gap-1.5">
                <Printer className="w-3.5 h-3.5 text-(--color-action-primary)" />
                <span>Thermal 80mm</span>
              </div>
              <Sliders className="w-3 h-3 text-(--color-text-muted)" />
            </button>

            <label className="flex items-center justify-between text-[11px] font-mono text-(--color-text-muted) cursor-pointer">
              <span>Auto-Print:</span>
              <input
                type="checkbox"
                checked={autoPrintThermal}
                onChange={(e) => setAutoPrintThermal(e.target.checked)}
                className="h-3.5 w-3.5 text-(--color-action-primary) rounded-sm"
              />
            </label>
          </div>
        </div>

        {/* --------------------------------------------------------------------- */}
        {/* COLUMN 2: BARCODE ENTRY & CART ITEMS GRID (6.5 Cols / Flex)          */}
        {/* --------------------------------------------------------------------- */}
        <div className="col-span-12 lg:col-span-6 xl:col-span-7 flex flex-col space-y-2 min-h-0">
          {/* BARCODE SCANNER FIELD */}
          <div className="relative">
            <Barcode className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-(--color-action-primary)" />
            <input
              ref={barcodeInputRef}
              type="text"
              placeholder="Scan Barcode (Instant) or Type Product Name / SKU... [F2]"
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && searchSuggestions.length > 0) {
                  addItemToCart(searchSuggestions[0], 1);
                }
              }}
              className="w-full h-11 pl-11 pr-20 bg-(--color-bg-surface) border border-(--primitive-blue-300) focus:border-(--color-action-primary) focus:ring-2 focus:ring-(--color-action-primary)/20 outline-none focus:outline-none rounded-lg text-sm font-medium text-(--color-text-primary) placeholder-(--color-text-muted) shadow-xs transition-all"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-xs text-(--color-text-muted) font-mono">
              <span className="px-1.5 py-0.5 rounded-sm bg-(--color-bg-subtle) text-[10px] border border-(--color-border-default)">
                F2
              </span>
            </div>

            {/* SEARCH SUGGESTIONS DROPDOWN */}
            {searchSuggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-12 z-(--z-popover) bg-(--color-bg-surface) border border-(--color-border-default) rounded-lg shadow-lg overflow-hidden max-h-60 overflow-y-auto">
                {searchSuggestions.map((prod, idx) => (
                  <div
                    key={prod.id}
                    onClick={() => addItemToCart(prod, 1)}
                    className={`p-2.5 flex items-center justify-between text-xs cursor-pointer border-b border-(--color-border-default) last:border-0 ${
                      idx === 0
                        ? "bg-(--color-action-primary-subtle) text-(--color-action-primary-text)"
                        : "hover:bg-(--color-bg-subtle) text-(--color-text-primary)"
                    }`}
                  >
                    <div className="truncate">
                      <span className="font-semibold block truncate" title={prod.name}>
                        {prod.name}
                      </span>
                      <span className="text-[10px] font-mono text-(--color-text-muted)">
                        Barcode: {prod.barcode || "—"} | SKU: {prod.sku || "—"}
                      </span>
                    </div>
                    <div className="text-right shrink-0 ml-2 font-mono">
                      <span className="font-bold text-(--color-text-primary) block">
                        ₹{prod.selling_price.toFixed(2)}
                      </span>
                      <span className="text-[10px] text-(--color-text-secondary)">
                        Stock: {prod.stock_qty} {prod.unit}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* CART ITEMS DATA GRID (High Density) */}
          <div className="flex-1 bg-(--color-bg-surface) border border-(--color-border-default) rounded-lg overflow-hidden flex flex-col shadow-xs min-h-0">
            <div className="flex-1 overflow-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 bg-(--color-bg-subtle) border-b border-(--color-border-default) z-(--z-sticky)">
                  <tr className="text-(--color-text-secondary) font-mono text-[11px] uppercase tracking-wider h-9">
                    <th className="py-2 px-3 w-8">#</th>
                    <th className="py-2 px-3">Item Description</th>
                    <th className="py-2 px-3 text-center w-24">Qty (/)</th>
                    <th className="py-2 px-3 text-right w-20">Rate (₹)</th>
                    <th className="py-2 px-3 text-center w-20">Disc % (*)</th>
                    <th className="py-2 px-3 text-center w-16">GST %</th>
                    <th className="py-2 px-3 text-right w-24">Amount (₹)</th>
                    <th className="py-2 px-2 text-center w-10"></th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-(--color-border-default)">
                  {calculatedItems.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-16 text-center text-(--color-text-muted)">
                        <Barcode className="w-10 h-10 mx-auto mb-2 text-(--color-text-disabled)" />
                        <span className="text-sm font-medium block">Cart is empty</span>
                        <span className="text-xs">Scan items with barcode or use search [F2]</span>
                      </td>
                    </tr>
                  ) : (
                    calculatedItems.map((item, idx) => {
                      const isSelected = selectedCartIdx === idx;
                      return (
                        <tr
                          key={item.product.id}
                          onClick={() => setSelectedCartIdx(idx)}
                          className={`h-11 transition-colors cursor-pointer ${
                            isSelected
                              ? "bg-(--color-action-primary-subtle) border-l-4 border-l-(--color-action-primary)"
                              : "hover:bg-(--color-bg-subtle)"
                          }`}
                        >
                          {/* INDEX */}
                          <td className="py-1.5 px-3 font-mono text-[11px] text-(--color-text-muted)">
                            {idx + 1}
                          </td>

                          {/* PRODUCT NAME & BARCODE */}
                          <td className="py-1.5 px-3">
                            <div
                              className="font-semibold text-(--color-text-primary) truncate max-w-xs cursor-help"
                              title={item.product.name}
                            >
                              {item.product.name}
                            </div>
                            <div className="text-[10px] font-mono text-(--color-text-muted)">
                              {item.product.barcode || item.product.sku || "—"}
                            </div>
                          </td>

                          {/* QTY WITH INLINE ADJUST */}
                          <td className="py-1.5 px-3 text-center font-mono">
                            <div className="inline-flex items-center border border-(--color-border-default) rounded-md overflow-hidden bg-(--color-bg-surface)">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateItemQty(idx, item.qty - 1);
                                }}
                                className="px-1.5 py-0.5 text-(--color-text-secondary) hover:bg-(--color-bg-subtle) font-bold cursor-pointer"
                              >
                                -
                              </button>
                              <span className="px-2 font-bold text-(--color-text-primary)">
                                {item.qty}
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateItemQty(idx, item.qty + 1);
                                }}
                                className="px-1.5 py-0.5 text-(--color-text-secondary) hover:bg-(--color-bg-subtle) font-bold cursor-pointer"
                              >
                                +
                              </button>
                            </div>
                          </td>

                          {/* UNIT PRICE */}
                          <td className="py-1.5 px-3 text-right font-mono text-(--color-text-secondary)">
                            ₹{item.unitPrice.toFixed(2)}
                          </td>

                          {/* LINE DISCOUNT */}
                          <td className="py-1.5 px-3 text-center font-mono">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={item.discountPct}
                              onChange={(e) => updateItemDiscount(idx, Number(e.target.value))}
                              onClick={(e) => e.stopPropagation()}
                              className="w-12 h-7 px-1 text-center bg-(--color-bg-page) border border-(--color-border-default) rounded-sm text-xs font-mono text-(--color-text-primary)"
                            />
                          </td>

                          {/* GST RATE */}
                          <td className="py-1.5 px-3 text-center font-mono text-[11px] text-(--color-text-muted)">
                            {item.taxRate}%
                          </td>

                          {/* TOTAL */}
                          <td className="py-1.5 px-3 text-right font-mono font-bold text-sm text-(--color-action-primary)">
                            ₹{item.total.toFixed(2)}
                          </td>

                          {/* DELETE */}
                          <td className="py-1.5 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => removeItem(idx)}
                              className="p-1 text-(--color-text-muted) hover:text-(--color-danger) rounded-sm hover:bg-(--color-danger-bg) transition-colors cursor-pointer"
                              title="Remove item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* HOTKEYS FOOTER LEGEND */}
            <div className="h-8 bg-(--color-bg-subtle) border-t border-(--color-border-default) px-3 flex items-center justify-between text-[11px] text-(--color-text-muted) font-mono">
              <div className="flex items-center gap-3">
                <span>[F1] Customer</span>
                <span>[F2] Scanner</span>
                <span>[/] Qty</span>
                <span>[*] Disc %</span>
                <span>[F6] Thermal Setup</span>
              </div>
              <div>
                <span>[F4 / Enter] Complete Sale & Print</span>
              </div>
            </div>
          </div>
        </div>

        {/* --------------------------------------------------------------------- */}
        {/* COLUMN 3: PERMANENTLY VISIBLE PAYMENT DESK (3 Cols / ~340px)          */}
        {/* --------------------------------------------------------------------- */}
        <div className="col-span-12 lg:col-span-3 xl:col-span-3 bg-(--color-bg-surface) border border-(--color-border-default) rounded-lg p-3.5 flex flex-col justify-between shadow-xs">
          <div className="space-y-3">
            {/* TOTAL ITEMS & GRAND TOTAL HEADER */}
            <div className="bg-(--color-bg-subtle) border border-(--color-border-default) rounded-md p-3 text-center space-y-1">
              <div className="text-[11px] font-mono text-(--color-text-muted) uppercase tracking-wider flex items-center justify-between">
                <span>Grand Total</span>
                <span>{totalItemsCount} Units</span>
              </div>
              <div className="text-3xl font-extrabold text-(--color-action-primary) font-mono tracking-tight">
                ₹{grandTotal.toLocaleString("en-IN")}
              </div>
              <div className="text-[10px] font-mono text-(--color-text-muted)">
                Includes GST ₹{totalTaxAmount.toFixed(2)}
              </div>
            </div>

            {/* BILL SUMMARY BREAKDOWN */}
            <div className="space-y-1.5 text-xs font-mono text-(--color-text-secondary) pt-1 border-t border-(--color-border-default)">
              <div className="flex items-center justify-between">
                <span>Subtotal (Taxable):</span>
                <span className="text-(--color-text-primary)">₹{rawSubtotal.toFixed(2)}</span>
              </div>

              {/* BILL DISCOUNT FIELD */}
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <span>Bill Disc %:</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={billDiscountPct}
                    onChange={(e) => setBillDiscountPct(Number(e.target.value))}
                    className="w-10 h-6 px-1 text-center bg-(--color-bg-page) border border-(--color-border-default) rounded-sm text-[11px]"
                  />
                </span>
                <span className="text-(--color-danger)">
                  -₹{(totalItemDiscounts + billDiscountAmount).toFixed(2)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span>CGST + SGST:</span>
                <span className="text-(--color-text-primary)">₹{totalTaxAmount.toFixed(2)}</span>
              </div>

              <div className="flex items-center justify-between text-[11px] text-(--color-text-muted)">
                <span>Round Off:</span>
                <span>₹{roundOffAmount.toFixed(2)}</span>
              </div>
            </div>

            {/* PAYMENT TENDER SELECTOR */}
            <div className="space-y-2 pt-2 border-t border-(--color-border-default)">
              <div className="text-[11px] font-semibold text-(--color-text-muted) uppercase tracking-wider font-mono">
                Tender Mode
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: "CASH", label: "Cash", icon: Banknote },
                  { id: "UPI", label: "UPI QR", icon: QrCode },
                  { id: "CARD", label: "Card", icon: CreditCard },
                ].map((t) => {
                  const Icon = t.icon;
                  const isActive = tenderMode === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setTenderMode(t.id as "CASH" | "UPI" | "CARD")}
                      className={`h-9 flex items-center justify-center gap-1 rounded-md text-xs font-semibold border transition-colors cursor-pointer ${
                        isActive
                          ? "bg-(--color-action-primary) text-white border-(--color-action-primary) shadow-xs"
                          : "bg-(--color-bg-subtle) text-(--color-text-secondary) border-(--color-border-default) hover:bg-(--color-bg-hover)"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{t.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* DYNAMIC UPI QR PREVIEW */}
              {tenderMode === "UPI" && (
                <div className="p-3 bg-(--color-bg-subtle) border border-(--primitive-blue-200) rounded-md flex items-center gap-3 animate-in fade-in">
                  <div className="w-14 h-14 bg-white p-1 rounded-md border border-(--color-border-default) flex items-center justify-center shrink-0">
                    <QrCode className="w-12 h-12 text-(--color-text-primary)" />
                  </div>
                  <div className="text-xs space-y-0.5 font-mono truncate">
                    <span className="font-bold text-(--color-action-primary) block">
                      UPI Amount: ₹{grandTotal}
                    </span>
                    <span className="text-[10px] text-(--color-text-muted) block truncate">
                      VPA: store.retail@icici
                    </span>
                    <span className="text-[10px] text-(--color-success) font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Auto-Verify Active
                    </span>
                  </div>
                </div>
              )}

              {/* CASH TENDER CALCULATION */}
              {tenderMode === "CASH" && (
                <div className="space-y-1.5 text-xs font-mono">
                  <div className="flex items-center justify-between">
                    <span className="text-(--color-text-secondary)">Cash Received (₹):</span>
                    <input
                      type="number"
                      value={cashTendered}
                      onChange={(e) => setCashTendered(Number(e.target.value))}
                      className="w-24 h-8 px-2 text-right bg-(--color-bg-page) border border-(--color-border-default) rounded-md text-sm font-bold text-(--color-text-primary)"
                    />
                  </div>
                  {changeToReturn > 0 && (
                    <div className="flex items-center justify-between p-2 rounded-md bg-(--color-success-bg) text-(--color-success-dark) font-bold">
                      <span>Change to Return:</span>
                      <span className="text-sm">₹{changeToReturn.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* PRIMARY ACTION BUTTONS (44px height) */}
          <div className="space-y-2 pt-3 border-t border-(--color-border-default)">
            <button
              onClick={handleCompleteSale}
              disabled={isProcessing || cart.length === 0}
              className="w-full h-11 flex items-center justify-center gap-2 rounded-md bg-(--color-action-primary) hover:bg-(--color-action-primary-hover) active:bg-(--color-action-primary-active) disabled:opacity-50 text-white font-bold text-sm shadow-md transition-all cursor-pointer"
            >
              {isProcessing ? (
                <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <>
                  <Printer className="w-4 h-4" />
                  <span>COMPLETE SALE & PRINT [F4]</span>
                </>
              )}
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPrinterModalOpen(true)}
                className="flex-1 h-8 flex items-center justify-center gap-1.5 rounded-md text-xs font-medium text-(--color-text-secondary) bg-(--color-bg-subtle) hover:bg-(--color-bg-hover) border border-(--color-border-default) transition-colors cursor-pointer"
                title="Reprint last thermal receipt / Diagnostics"
              >
                <Printer className="w-3.5 h-3.5 text-(--color-action-primary)" />
                <span>Thermal Setup [F6]</span>
              </button>

              <button
                onClick={handleResetBill}
                className="h-8 px-3 flex items-center justify-center gap-1 rounded-md text-xs font-medium text-(--color-text-muted) hover:text-(--color-text-primary) hover:bg-(--color-bg-subtle) transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* CUSTOMER SEARCH & ADD MODAL                                              */}
      {/* ========================================================================= */}
      {customerModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-(--z-modal) animate-in fade-in duration-100">
          <div className="bg-(--color-bg-surface) border border-(--color-border-default) rounded-xl w-full max-w-lg shadow-lg overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-(--color-border-default) flex items-center justify-between bg-(--color-bg-page)">
              <div className="flex items-center gap-2 font-semibold text-sm text-(--color-text-primary)">
                <Users className="w-4 h-4 text-(--color-action-primary)" />
                <span>Select or Create Customer</span>
              </div>
              <button
                onClick={() => setCustomerModalOpen(false)}
                className="p-1 text-(--color-text-muted) hover:text-(--color-text-primary) rounded-sm cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4 text-xs overflow-y-auto">
              {/* SEARCH INPUT */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-(--color-text-muted)" />
                <input
                  type="text"
                  placeholder="Search customer by name or phone..."
                  value={customerSearchQuery}
                  onChange={(e) => {
                    setCustomerSearchQuery(e.target.value);
                    customerService.searchCustomers(e.target.value).then(setCustomers);
                  }}
                  className="w-full h-9 pl-9 pr-3 bg-(--color-bg-page) border border-(--color-border-default) rounded-md text-xs text-(--color-text-primary)"
                />
              </div>

              {/* CUSTOMER LIST */}
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {customers.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => {
                      setSelectedCustomer(c);
                      setCustomerModalOpen(false);
                      barcodeInputRef.current?.focus();
                    }}
                    className={`p-2 rounded-md flex items-center justify-between cursor-pointer border ${
                      selectedCustomer.id === c.id
                        ? "bg-(--color-action-primary-subtle) border-(--primitive-blue-300)"
                        : "hover:bg-(--color-bg-subtle) border-(--color-border-default)"
                    }`}
                  >
                    <div>
                      <span className="font-semibold text-(--color-text-primary) block">{c.name}</span>
                      <span className="text-[10px] font-mono text-(--color-text-muted)">
                        {c.phone || "No phone"}
                      </span>
                    </div>
                    {c.current_balance > 0 && (
                      <span className="text-[11px] font-mono text-(--color-danger) font-bold">
                        Bal: ₹{c.current_balance}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {/* QUICK ADD NEW CUSTOMER */}
              <form
                onSubmit={handleCreateNewCustomer}
                className="pt-3 border-t border-(--color-border-default) space-y-2.5"
              >
                <span className="font-semibold text-xs text-(--color-text-primary) block">
                  Quick Add New Customer
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Customer Name *"
                    value={newCustName}
                    onChange={(e) => setNewCustName(e.target.value)}
                    className="h-9 px-3 bg-(--color-bg-page) border border-(--color-border-default) rounded-md text-xs"
                  />
                  <input
                    type="text"
                    required
                    placeholder="Phone Number *"
                    value={newCustPhone}
                    onChange={(e) => setNewCustPhone(e.target.value)}
                    className="h-9 px-3 bg-(--color-bg-page) border border-(--color-border-default) rounded-md text-xs font-mono"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full h-9 bg-(--color-action-primary) text-white font-semibold rounded-md text-xs hover:bg-(--color-action-primary-hover) transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create & Select Customer</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* THERMAL PRINTER SETUP & RECEIPT PREVIEW MODAL                            */}
      {/* ========================================================================= */}
      <ThermalPrinterModal
        isOpen={printerModalOpen}
        onClose={() => {
          setPrinterModalOpen(false);
          barcodeInputRef.current?.focus();
        }}
        lastInvoiceId={lastInvoiceId}
      />
    </div>
  );
}
