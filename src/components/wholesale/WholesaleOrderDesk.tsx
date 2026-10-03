import { useState, useEffect, useRef, useCallback } from "react";
import {
  Building2,
  Truck,
  FileText,
  Search,
  Trash2,
  CheckCircle2,
  Printer,
  X,
} from "lucide-react";
import {
  productService,
  customerService,
  wholesaleService,
  Product,
  Customer,
  ProductBatch,
  PricingSlab,
  B2bInvoiceItemInput,
  B2bInvoiceInput,
} from "../../services/tauri";

interface WholesaleCartItem {
  product: Product;
  batch: ProductBatch | null;
  slabs: PricingSlab[];
  qty: number;
  unitPrice: number;
  discountPct: number;
  taxRate: number;
}

export function WholesaleOrderDesk() {
  const [invoiceType, setInvoiceType] = useState<"B2B_INVOICE" | "DELIVERY_CHALLAN">("B2B_INVOICE");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [buyerGstin, setBuyerGstin] = useState<string>("");
  const [placeOfSupply, setPlaceOfSupply] = useState<string>("27-Maharashtra");
  const [isInterstate, setIsInterstate] = useState<boolean>(false);

  // Transport Details
  const [transportMode, setTransportMode] = useState<string>("ROAD");
  const [vehicleNo, setVehicleNo] = useState<string>("");

  // Cart & Search State
  const [cart, setCart] = useState<WholesaleCartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const [selectedCartIdx, setSelectedCartIdx] = useState<number>(0);

  // Payment & Terms
  const [paymentMethod, setPaymentMethod] = useState<string>("CREDIT");
  const [billDiscountPct, setBillDiscountPct] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // A4 Preview Modal
  const [previewModalOpen, setPreviewModalOpen] = useState<boolean>(false);
  const [lastInvoiceNo, setLastInvoiceNo] = useState<string>("");

  const searchInputRef = useRef<HTMLInputElement>(null);

  // --------------------------------------------------------------------------
  // 1. INITIALIZATION & CUSTOMERS
  // --------------------------------------------------------------------------
  useEffect(() => {
    async function init() {
      const custs = await customerService.searchCustomers("");
      const b2bCusts = custs.filter((c) => c.id !== "cust-walkin");
      setCustomers(b2bCusts);
      if (b2bCusts.length > 0) {
        setSelectedCustomer(b2bCusts[0]);
        setBuyerGstin(b2bCusts[0].gstin || "");
      }
    }
    init();
    searchInputRef.current?.focus();
  }, []);

  // Update Interstate tax logic when Place of Supply changes
  useEffect(() => {
    const isStateOut = !placeOfSupply.startsWith("27");
    setIsInterstate(isStateOut);
  }, [placeOfSupply]);

  // Product Autocomplete
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (trimmed.length > 1) {
      productService.searchProducts(trimmed, 6).then((res) => {
        setSuggestions(res.products);
      });
    } else {
      setSuggestions([]);
    }
  }, [searchQuery]);

  // --------------------------------------------------------------------------
  // 2. ADD ITEM TO WHOLESALE CART (Loads Batches & Pricing Slabs)
  // --------------------------------------------------------------------------
  const addItemToCart = useCallback(async (product: Product, initialQty: number = 10) => {
    const [batches, slabs] = await Promise.all([
      wholesaleService.getProductBatches(product.id),
      wholesaleService.getProductPricingSlabs(product.id),
    ]);

    const activeBatch = batches.length > 0 ? batches[0] : null;

    // Determine initial unit price based on volume pricing slabs
    let applicablePrice = product.wholesale_price > 0 ? product.wholesale_price : product.selling_price;
    const matchingSlab = slabs.find(
      (s) => initialQty >= s.min_qty && (s.max_qty === null || initialQty <= s.max_qty)
    );
    if (matchingSlab) {
      applicablePrice = matchingSlab.slab_price;
    }

    const newItem: WholesaleCartItem = {
      product,
      batch: activeBatch,
      slabs,
      qty: initialQty,
      unitPrice: applicablePrice,
      discountPct: 0,
      taxRate: product.tax_rate,
    };

    setCart((prev) => [...prev, newItem]);
    setSelectedCartIdx(cart.length);
    setSearchQuery("");
    setSuggestions([]);
    searchInputRef.current?.focus();
  }, [cart.length]);

  const updateItemQty = useCallback((index: number, newQty: number) => {
    if (newQty <= 0) return;
    setCart((prev) => {
      const updated = [...prev];
      const item = updated[index];

      // Auto-recalculate tiered volume price from slabs
      let unitPrice = item.product.wholesale_price > 0 ? item.product.wholesale_price : item.product.selling_price;
      const matchingSlab = item.slabs.find(
        (s) => newQty >= s.min_qty && (s.max_qty === null || newQty <= s.max_qty)
      );
      if (matchingSlab) {
        unitPrice = matchingSlab.slab_price;
      }

      updated[index] = { ...item, qty: newQty, unitPrice };
      return updated;
    });
  }, []);

  const removeItem = useCallback((index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // --------------------------------------------------------------------------
  // 3. TAX & B2B TOTALS ENGINE
  // --------------------------------------------------------------------------
  const calculatedItems = cart.map((item) => {
    const gross = item.unitPrice * item.qty;
    const discAmount = (gross * item.discountPct) / 100;
    const taxable = gross - discAmount;
    const totalTax = (taxable * item.taxRate) / 100;

    const cgst = isInterstate ? 0 : totalTax / 2;
    const sgst = isInterstate ? 0 : totalTax / 2;
    const igst = isInterstate ? totalTax : 0;
    const lineTotal = taxable + totalTax;

    return {
      ...item,
      gross,
      discAmount,
      taxable,
      cgst,
      sgst,
      igst,
      totalTax,
      lineTotal,
    };
  });

  const rawSubtotal = calculatedItems.reduce((acc, it) => acc + it.taxable, 0);
  const totalItemDiscounts = calculatedItems.reduce((acc, it) => acc + it.discAmount, 0);
  const billDiscountAmount = (rawSubtotal * billDiscountPct) / 100;
  const taxableAfterBillDisc = Math.max(0, rawSubtotal - billDiscountAmount);

  const totalCgst = calculatedItems.reduce((acc, it) => acc + it.cgst, 0);
  const totalSgst = calculatedItems.reduce((acc, it) => acc + it.sgst, 0);
  const totalIgst = calculatedItems.reduce((acc, it) => acc + it.igst, 0);
  const totalTaxAmount = totalCgst + totalSgst + totalIgst;

  const grossGrandTotal = taxableAfterBillDisc + totalTaxAmount;
  const grandTotal = Math.round(grossGrandTotal);
  const roundOff = Number((grandTotal - grossGrandTotal).toFixed(2));
  const totalUnitsCount = cart.reduce((acc, it) => acc + it.qty, 0);

  // --------------------------------------------------------------------------
  // 4. DISPATCH INVOICE ACTION
  // --------------------------------------------------------------------------
  async function handleCreateWholesaleInvoice() {
    if (!selectedCustomer) {
      alert("Please select a registered B2B customer");
      return;
    }
    if (cart.length === 0) {
      alert("Add items to the wholesale order first");
      return;
    }

    setIsProcessing(true);

    const payload: B2bInvoiceInput = {
      customer_id: selectedCustomer.id,
      customer_name: selectedCustomer.name,
      customer_phone: selectedCustomer.phone || undefined,
      buyer_gstin: buyerGstin || undefined,
      place_of_supply: placeOfSupply,
      is_interstate: isInterstate,
      invoice_type: invoiceType,
      transport_mode: transportMode,
      vehicle_no: vehicleNo || undefined,
      items: calculatedItems.map(
        (it): B2bInvoiceItemInput => ({
          product_id: it.product.id,
          product_name: it.product.name,
          barcode: it.product.barcode || undefined,
          hsn_code: it.product.hsn_code || undefined,
          batch_no: it.batch?.batch_no || undefined,
          exp_date: it.batch?.exp_date || undefined,
          qty: it.qty,
          unit: it.product.unit,
          unit_price: it.unitPrice,
          discount_amount: it.discAmount,
          tax_rate: it.taxRate,
          tax_amount: it.totalTax,
          igst_amount: it.igst,
          total_amount: it.lineTotal,
        })
      ),
      subtotal: rawSubtotal,
      discount_amount: totalItemDiscounts + billDiscountAmount,
      tax_amount: totalTaxAmount,
      round_off: roundOff,
      total_amount: grandTotal,
      paid_amount: paymentMethod === "CREDIT" ? 0 : grandTotal,
      payment_method: paymentMethod,
      payment_breakdown: {
        cash: paymentMethod === "CASH" ? grandTotal : 0,
        upi: paymentMethod === "UPI" ? grandTotal : 0,
        card: paymentMethod === "CARD" ? grandTotal : 0,
        credit: paymentMethod === "CREDIT" ? grandTotal : 0,
        notes: `Transport: ${transportMode} ${vehicleNo ? `(${vehicleNo})` : ""}`,
      },
      notes: `${invoiceType === "DELIVERY_CHALLAN" ? "Delivery Challan" : "B2B Tax Invoice"} dispatched via ${transportMode}`,
    };

    try {
      const res = await wholesaleService.createB2bInvoice(payload);
      setLastInvoiceNo(res.invoice_no);
      setToastMsg(`Order #${res.invoice_no} generated in ${res.execution_time_ms}ms!`);
      setPreviewModalOpen(true);
      setCart([]);
      setVehicleNo("");
      setTimeout(() => setToastMsg(null), 4000);
    } catch (err) {
      alert(`Wholesale invoice error: ${err}`);
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <div className="flex flex-col h-full space-y-3 overflow-hidden select-none pos">
      {/* TOAST NOTIFICATION */}
      {toastMsg && (
        <div className="fixed top-18 right-6 z-(--z-toast) bg-(--color-success) text-white px-4 py-2.5 rounded-md shadow-lg flex items-center gap-2 text-sm font-medium animate-in fade-in duration-150">
          <CheckCircle2 className="w-5 h-5" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* 1. B2B WHOLESALE ORDER HEADER */}
      <div className="bg-(--color-bg-surface) border border-(--color-border-default) rounded-lg p-3.5 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* LEFT: INVOICE TYPE & BUYER */}
        <div className="flex items-center gap-3">
          {/* INVOICE TYPE TOGGLE */}
          <div className="inline-flex border border-(--color-border-default) rounded-md overflow-hidden bg-(--color-bg-page) p-0.5">
            <button
              onClick={() => setInvoiceType("B2B_INVOICE")}
              className={`px-3 py-1.5 rounded-sm text-xs font-semibold transition-colors cursor-pointer ${
                invoiceType === "B2B_INVOICE"
                  ? "bg-(--color-action-primary) text-white shadow-xs"
                  : "text-(--color-text-secondary) hover:text-(--color-text-primary)"
              }`}
            >
              Tax Invoice (B2B)
            </button>
            <button
              onClick={() => setInvoiceType("DELIVERY_CHALLAN")}
              className={`px-3 py-1.5 rounded-sm text-xs font-semibold transition-colors cursor-pointer ${
                invoiceType === "DELIVERY_CHALLAN"
                  ? "bg-(--color-action-primary) text-white shadow-xs"
                  : "text-(--color-text-secondary) hover:text-(--color-text-primary)"
              }`}
            >
              Delivery Challan
            </button>
          </div>

          {/* CUSTOMER SELECTOR */}
          <div className="flex items-center gap-2">
            <select
              value={selectedCustomer?.id || ""}
              onChange={(e) => {
                const c = customers.find((cust) => cust.id === e.target.value);
                if (c) {
                  setSelectedCustomer(c);
                  setBuyerGstin(c.gstin || "");
                }
              }}
              className="h-9 px-3 bg-(--color-bg-page) border border-(--color-border-default) rounded-md text-xs font-semibold text-(--color-text-primary) cursor-pointer"
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.gstin ? `(${c.gstin})` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* RIGHT: PLACE OF SUPPLY & TRANSPORT FIELDS */}
        <div className="flex items-center gap-2.5 text-xs font-mono">
          <div className="flex items-center gap-1">
            <span className="text-(--color-text-muted)">State of Supply:</span>
            <select
              value={placeOfSupply}
              onChange={(e) => setPlaceOfSupply(e.target.value)}
              className="h-9 px-2 bg-(--color-bg-page) border border-(--color-border-default) rounded-md text-xs text-(--color-text-primary)"
            >
              <option value="27-Maharashtra">27 - Maharashtra (Intrastate)</option>
              <option value="29-Karnataka">29 - Karnataka (IGST)</option>
              <option value="24-Gujarat">24 - Gujarat (IGST)</option>
              <option value="07-Delhi">07 - Delhi (IGST)</option>
              <option value="33-Tamil Nadu">33 - Tamil Nadu (IGST)</option>
            </select>
          </div>

          <div className="flex items-center gap-1">
            <Truck className="w-3.5 h-3.5 text-(--color-action-primary)" />
            <select
              value={transportMode}
              onChange={(e) => setTransportMode(e.target.value)}
              className="h-9 px-1.5 bg-(--color-bg-page) border border-(--color-border-default) rounded-md text-xs font-mono text-(--color-text-primary)"
            >
              <option value="ROAD">Road</option>
              <option value="RAIL">Rail</option>
              <option value="AIR">Air</option>
            </select>
            <input
              type="text"
              placeholder="Vehicle No"
              value={vehicleNo}
              onChange={(e) => setVehicleNo(e.target.value)}
              className="h-9 w-28 px-2 bg-(--color-bg-page) border border-(--color-border-default) rounded-md text-xs uppercase"
            />
          </div>

          <span
            className={`px-2 py-1 rounded-sm text-[11px] font-bold ${
              isInterstate
                ? "bg-(--color-warning-bg) text-(--color-warning-dark)"
                : "bg-(--primitive-blue-100) text-(--color-action-primary-text)"
            }`}
          >
            {isInterstate ? "IGST (Interstate)" : "CGST+SGST"}
          </span>
        </div>
      </div>

      {/* 2. ORDER DESK WORKSPACE */}
      <div className="flex-1 grid grid-cols-12 gap-3 min-h-0">
        {/* LEFT COLUMN: ITEM SEARCH & WHOLESALE CART (8.5 Cols) */}
        <div className="col-span-12 lg:col-span-8 xl:col-span-9 flex flex-col space-y-2 min-h-0">
          {/* PRODUCT SEARCH */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-(--color-text-muted)" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search wholesale products, FMCG items, or SKUs... [F2]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-11 pl-10 pr-20 bg-(--color-bg-surface) border border-(--color-border-default) focus:border-(--color-action-primary) rounded-lg text-sm text-(--color-text-primary) shadow-xs"
            />

            {/* AUTOCOMPLETE SUGGESTIONS */}
            {suggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-12 z-(--z-popover) bg-(--color-bg-surface) border border-(--color-border-default) rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {suggestions.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => addItemToCart(p, 10)}
                    className="p-3 flex items-center justify-between hover:bg-(--color-bg-subtle) cursor-pointer border-b border-(--color-border-default) last:border-0 text-xs"
                  >
                    <div>
                      <span className="font-semibold text-(--color-text-primary) block">{p.name}</span>
                      <span className="text-[10px] font-mono text-(--color-text-muted)">
                        HSN: {p.hsn_code || "—"} | Stock: {p.stock_qty} {p.unit}
                      </span>
                    </div>
                    <div className="text-right font-mono">
                      <span className="text-sm font-bold text-(--color-action-primary) block">
                        ₹{p.wholesale_price || p.selling_price}
                      </span>
                      <span className="text-[10px] text-(--color-text-muted)">GST {p.tax_rate}%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* WHOLESALE ITEMS TABLE */}
          <div className="flex-1 bg-(--color-bg-surface) border border-(--color-border-default) rounded-lg overflow-hidden flex flex-col shadow-xs min-h-0">
            <div className="flex-1 overflow-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 bg-(--color-bg-subtle) border-b border-(--color-border-default) z-(--z-sticky)">
                  <tr className="text-(--color-text-secondary) font-mono text-[11px] uppercase tracking-wider h-9">
                    <th className="py-2 px-3">#</th>
                    <th className="py-2 px-3">Product Description</th>
                    <th className="py-2 px-3">Batch & Expiry</th>
                    <th className="py-2 px-3 text-center w-24">Order Qty</th>
                    <th className="py-2 px-3 text-right">Slab Rate (₹)</th>
                    <th className="py-2 px-3 text-center">Disc %</th>
                    <th className="py-2 px-3 text-center">GST</th>
                    <th className="py-2 px-3 text-right">Total (₹)</th>
                    <th className="py-2 px-2 text-center w-8"></th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-(--color-border-default)">
                  {calculatedItems.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-16 text-center text-(--color-text-muted)">
                        <Building2 className="w-10 h-10 mx-auto mb-2 text-(--color-text-disabled)" />
                        <span className="text-sm font-medium block">Wholesale Order Desk Ready</span>
                        <span className="text-xs">Search and add bulk FMCG products above</span>
                      </td>
                    </tr>
                  ) : (
                    calculatedItems.map((item, idx) => {
                      const isSelected = selectedCartIdx === idx;
                      return (
                        <tr
                          key={item.product.id}
                          onClick={() => setSelectedCartIdx(idx)}
                          className={`h-11 transition-colors ${
                            isSelected ? "bg-(--color-action-primary-subtle)" : "hover:bg-(--color-bg-subtle)"
                          }`}
                        >
                          <td className="py-2 px-3 font-mono text-[11px] text-(--color-text-muted)">
                            {idx + 1}
                          </td>

                          <td className="py-2 px-3">
                            <span
                              className="font-semibold text-(--color-text-primary) block truncate max-w-xs cursor-help"
                              title={item.product.name}
                            >
                              {item.product.name}
                            </span>
                            <span className="text-[10px] font-mono text-(--color-text-muted)">
                              HSN: {item.product.hsn_code || "—"}
                            </span>
                          </td>

                          {/* BATCH SELECTOR */}
                          <td className="py-2 px-3 font-mono">
                            {item.batch ? (
                              <div className="flex items-center gap-1 text-[11px]">
                                <span className="px-1.5 py-0.5 rounded-sm bg-(--color-bg-page) border border-(--color-border-default) font-bold text-(--color-action-primary)">
                                  {item.batch.batch_no}
                                </span>
                                <span className="text-[10px] text-(--color-text-muted)">
                                  Exp: {item.batch.exp_date}
                                </span>
                              </div>
                            ) : (
                              <span className="text-(--color-text-muted)">Standard</span>
                            )}
                          </td>

                          {/* QTY */}
                          <td className="py-2 px-3 text-center font-mono">
                            <input
                              type="number"
                              min="1"
                              value={item.qty}
                              onChange={(e) => updateItemQty(idx, Number(e.target.value))}
                              className="w-16 h-7 px-1 text-center bg-(--color-bg-page) border border-(--primitive-blue-300) rounded-sm text-xs font-bold text-(--color-text-primary)"
                            />
                          </td>

                          {/* TIERED SLAB RATE */}
                          <td className="py-2 px-3 text-right font-mono">
                            <span className="font-bold text-(--color-text-primary)">
                              ₹{item.unitPrice.toFixed(2)}
                            </span>
                            {item.slabs.length > 0 && (
                              <span className="text-[9px] text-(--color-success) block font-sans">
                                Tier Slab Active
                              </span>
                            )}
                          </td>

                          {/* DISCOUNT */}
                          <td className="py-2 px-3 text-center font-mono">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={item.discountPct}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setCart((prev) => {
                                  const up = [...prev];
                                  up[idx] = { ...up[idx], discountPct: val };
                                  return up;
                                });
                              }}
                              className="w-12 h-7 px-1 text-center bg-(--color-bg-page) border border-(--color-border-default) rounded-sm text-xs"
                            />
                          </td>

                          {/* GST */}
                          <td className="py-2 px-3 text-center font-mono text-[11px] text-(--color-text-muted)">
                            {item.taxRate}%
                          </td>

                          {/* TOTAL */}
                          <td className="py-2 px-3 text-right font-mono font-bold text-sm text-(--color-action-primary)">
                            ₹{item.lineTotal.toFixed(2)}
                          </td>

                          {/* DELETE */}
                          <td className="py-2 px-2 text-center">
                            <button
                              onClick={() => removeItem(idx)}
                              className="p-1 text-(--color-text-muted) hover:text-(--color-danger) rounded-sm cursor-pointer"
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

            {/* FOOTER */}
            <div className="h-8 bg-(--color-bg-subtle) border-t border-(--color-border-default) px-3 flex items-center justify-between text-[11px] font-mono text-(--color-text-muted)">
              <span>Total Line Items: {cart.length} | Volume: {totalUnitsCount} Units</span>
              <span>Subtotal: ₹{rawSubtotal.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: B2B SUMMARY & DISPATCH (3.5 Cols) */}
        <div className="col-span-12 lg:col-span-4 xl:col-span-3 bg-(--color-bg-surface) border border-(--color-border-default) rounded-lg p-3.5 flex flex-col justify-between shadow-xs">
          <div className="space-y-3">
            {/* TOTAL HEADER */}
            <div className="bg-(--color-bg-subtle) border border-(--color-border-default) rounded-md p-3 text-center space-y-1">
              <div className="text-[11px] font-mono text-(--color-text-muted) uppercase tracking-wider flex items-center justify-between">
                <span>{invoiceType === "DELIVERY_CHALLAN" ? "Challan Value" : "Invoice Value"}</span>
                <span>{totalUnitsCount} Units</span>
              </div>
              <div className="text-3xl font-extrabold text-(--color-action-primary) font-mono tracking-tight">
                ₹{grandTotal.toLocaleString("en-IN")}
              </div>
              <div className="text-[10px] font-mono text-(--color-text-muted)">
                Taxable: ₹{taxableAfterBillDisc.toFixed(2)} | GST: ₹{totalTaxAmount.toFixed(2)}
              </div>
            </div>

            {/* GST BREAKDOWN */}
            <div className="space-y-1.5 text-xs font-mono text-(--color-text-secondary) pt-1 border-t border-(--color-border-default)">
              <div className="flex items-center justify-between">
                <span>Taxable Amount:</span>
                <span className="text-(--color-text-primary)">₹{rawSubtotal.toFixed(2)}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <span>Special Discount %:</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={billDiscountPct}
                    onChange={(e) => setBillDiscountPct(Number(e.target.value))}
                    className="w-10 h-6 px-1 text-center bg-(--color-bg-page) border border-(--color-border-default) rounded-sm text-[11px]"
                  />
                </span>
                <span className="text-(--color-danger)">-₹{billDiscountAmount.toFixed(2)}</span>
              </div>

              {!isInterstate ? (
                <>
                  <div className="flex items-center justify-between">
                    <span>CGST:</span>
                    <span className="text-(--color-text-primary)">₹{totalCgst.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>SGST:</span>
                    <span className="text-(--color-text-primary)">₹{totalSgst.toFixed(2)}</span>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-between text-(--color-warning-dark) font-bold">
                  <span>IGST (Integrated):</span>
                  <span>₹{totalIgst.toFixed(2)}</span>
                </div>
              )}

              <div className="flex items-center justify-between text-[11px] text-(--color-text-muted)">
                <span>Round Off:</span>
                <span>₹{roundOff.toFixed(2)}</span>
              </div>
            </div>

            {/* PAYMENT TERMS */}
            <div className="space-y-2 pt-2 border-t border-(--color-border-default)">
              <span className="text-[11px] font-semibold text-(--color-text-muted) uppercase tracking-wider font-mono block">
                Payment & Billing Terms
              </span>

              <div className="grid grid-cols-3 gap-1.5 text-xs">
                {[
                  { id: "CREDIT", label: "Credit (Khata)" },
                  { id: "BANK_TRANSFER", label: "Bank Transfer" },
                  { id: "UPI", label: "UPI" },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaymentMethod(m.id)}
                    className={`h-8 rounded-md font-semibold text-[11px] border transition-colors cursor-pointer ${
                      paymentMethod === m.id
                        ? "bg-(--color-action-primary) text-white border-(--color-action-primary)"
                        : "bg-(--color-bg-subtle) text-(--color-text-secondary) border-(--color-border-default)"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ACTION BUTTON */}
          <div className="space-y-2 pt-3 border-t border-(--color-border-default)">
            <button
              onClick={handleCreateWholesaleInvoice}
              disabled={isProcessing || cart.length === 0}
              className="w-full h-11 flex items-center justify-center gap-2 rounded-md bg-(--color-action-primary) hover:bg-(--color-action-primary-hover) active:bg-(--color-action-primary-active) disabled:opacity-50 text-white font-bold text-sm shadow-md transition-all cursor-pointer"
            >
              {isProcessing ? (
                <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <>
                  <Printer className="w-4 h-4" />
                  <span>
                    {invoiceType === "DELIVERY_CHALLAN"
                      ? "GENERATE CHALLAN & DISPATCH"
                      : "CREATE B2B TAX INVOICE"}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. A4 TAX INVOICE PREVIEW MODAL                                           */}
      {/* ========================================================================= */}
      {previewModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-(--z-modal) animate-in fade-in duration-100">
          <div className="bg-(--color-bg-surface) border border-(--color-border-default) rounded-xl w-full max-w-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-(--color-border-default) flex items-center justify-between bg-(--color-bg-page)">
              <div className="flex items-center gap-2 font-semibold text-sm text-(--color-text-primary)">
                <FileText className="w-5 h-5 text-(--color-action-primary)" />
                <span>B2B Tax Invoice Document Generated (#{lastInvoiceNo})</span>
              </div>
              <button
                onClick={() => setPreviewModalOpen(false)}
                className="p-1 text-(--color-text-muted) hover:text-(--color-text-primary)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs font-mono bg-white text-black border m-4 rounded-md shadow-inner">
              <div className="text-center pb-3 border-b space-y-0.5">
                <h1 className="text-base font-bold uppercase tracking-wide">Main Store & Warehouse</h1>
                <p className="text-[11px]">Ground Floor, Commercial Hub | GSTIN: 27AAAAA0000A1Z5</p>
                <p className="text-[11px] font-bold uppercase text-blue-800">
                  {invoiceType === "DELIVERY_CHALLAN" ? "DELIVERY CHALLAN" : "TAX INVOICE (B2B)"}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 py-2 border-b text-[11px]">
                <div>
                  <span className="font-bold block">Billed To (Buyer):</span>
                  <span>{selectedCustomer?.name}</span>
                  <span className="block">GSTIN: {buyerGstin || "Unregistered"}</span>
                  <span className="block">Place of Supply: {placeOfSupply}</span>
                </div>
                <div className="text-right">
                  <span className="font-bold block">Invoice No: {lastInvoiceNo}</span>
                  <span>Date: {new Date().toLocaleDateString("en-IN")}</span>
                  <span className="block">Vehicle No: {vehicleNo || "Direct Dispatch"}</span>
                </div>
              </div>

              <div className="text-center py-3 text-xs text-green-700 font-bold">
                ✓ Document Saved to SQLite & Stock Deducted from Warehouses
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  onClick={() => setPreviewModalOpen(false)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md font-semibold text-xs cursor-pointer"
                >
                  Close & Ready Next Order
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
