import { useState, useEffect, useRef, useCallback } from "react";
import {
  Search,
  Plus,
  Boxes,
  Barcode,
  Sparkles,
  AlertTriangle,
  Check,
  X,
  Edit2,
  Trash2,
  Download,
} from "lucide-react";
import { productService, Product, NewProductInput, UpdateProductInput } from "../../services/tauri";

export function ProductMaster() {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLatency, setSearchLatency] = useState(0);
  const [totalFound, setTotalFound] = useState(0);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form State
  const [formName, setFormName] = useState("");
  const [formBarcode, setFormBarcode] = useState("");
  const [formSku, setFormSku] = useState("");
  const [formCategory, setFormCategory] = useState("General");
  const [formBrand, setFormBrand] = useState("");
  const [formUnit, setFormUnit] = useState("PCS");
  const [formHsn, setFormHsn] = useState("");
  const [formTaxRate, setFormTaxRate] = useState<number>(18);
  const [formPurchasePrice, setFormPurchasePrice] = useState<number>(0);
  const [formMrp, setFormMrp] = useState<number>(0);
  const [formSellingPrice, setFormSellingPrice] = useState<number>(0);
  const [formWholesalePrice, setFormWholesalePrice] = useState<number>(0);
  const [formStockQty, setFormStockQty] = useState<number>(0);
  const [formMinStock, setFormMinStock] = useState<number>(5);

  const searchInputRef = useRef<HTMLInputElement>(null);

  const loadProducts = useCallback(async (query: string = "") => {
    const result = await productService.searchProducts(query, 100);
    setProducts(result.products);
    setSearchLatency(result.execution_time_ms);
    setTotalFound(result.total_found);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadProducts(searchQuery);
  }, [searchQuery, loadProducts]);

  // Focus search input on mount
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  function handleOpenAddModal() {
    setEditingProduct(null);
    setFormName("");
    setFormBarcode("");
    setFormSku("");
    setFormCategory("General");
    setFormBrand("");
    setFormUnit("PCS");
    setFormHsn("");
    setFormTaxRate(18);
    setFormPurchasePrice(0);
    setFormMrp(0);
    setFormSellingPrice(0);
    setFormWholesalePrice(0);
    setFormStockQty(0);
    setFormMinStock(5);
    setModalOpen(true);
  }

  function handleOpenEditModal(p: Product) {
    setEditingProduct(p);
    setFormName(p.name);
    setFormBarcode(p.barcode || "");
    setFormSku(p.sku || "");
    setFormCategory(p.category || "General");
    setFormBrand(p.brand || "");
    setFormUnit(p.unit || "PCS");
    setFormHsn(p.hsn_code || "");
    setFormTaxRate(p.tax_rate);
    setFormPurchasePrice(p.purchase_price);
    setFormMrp(p.mrp);
    setFormSellingPrice(p.selling_price);
    setFormWholesalePrice(p.wholesale_price);
    setFormStockQty(p.stock_qty);
    setFormMinStock(p.min_stock_alert);
    setModalOpen(true);
  }

  async function handleSaveProduct(e: React.FormEvent) {
    e.preventDefault();
    if (!formName.trim()) return;

    if (editingProduct) {
      const updateData: UpdateProductInput = {
        id: editingProduct.id,
        name: formName,
        barcode: formBarcode || undefined,
        sku: formSku || undefined,
        category: formCategory || undefined,
        brand: formBrand || undefined,
        unit: formUnit,
        hsn_code: formHsn || undefined,
        tax_rate: Number(formTaxRate),
        purchase_price: Number(formPurchasePrice),
        mrp: Number(formMrp),
        selling_price: Number(formSellingPrice),
        wholesale_price: Number(formWholesalePrice),
        stock_qty: Number(formStockQty),
        min_stock_alert: Number(formMinStock),
      };
      await productService.updateProduct(updateData);
    } else {
      const newData: NewProductInput = {
        name: formName,
        barcode: formBarcode || undefined,
        sku: formSku || undefined,
        category: formCategory || undefined,
        brand: formBrand || undefined,
        unit: formUnit,
        hsn_code: formHsn || undefined,
        tax_rate: Number(formTaxRate),
        purchase_price: Number(formPurchasePrice),
        mrp: Number(formMrp),
        selling_price: Number(formSellingPrice),
        wholesale_price: Number(formWholesalePrice),
        stock_qty: Number(formStockQty),
        min_stock_alert: Number(formMinStock),
      };
      await productService.createProduct(newData);
    }

    setModalOpen(false);
    loadProducts(searchQuery);
  }

  async function handleDeleteProduct(id: string) {
    if (confirm("Are you sure you want to deactivate this product?")) {
      await productService.deleteProduct(id);
      loadProducts(searchQuery);
    }
  }

  async function handleSeedCatalog() {
    const sampleProducts: NewProductInput[] = [
      { name: "Amul Butter 500g", barcode: "8901262010052", sku: "AMUL-BUTTER-500", category: "Dairy", tax_rate: 12, purchase_price: 240, mrp: 275, selling_price: 270, stock_qty: 45 },
      { name: "Aashirvaad Shudh Chakki Atta 5kg", barcode: "8901030010109", sku: "AASH-ATTA-5KG", category: "Groceries", tax_rate: 5, purchase_price: 220, mrp: 260, selling_price: 250, stock_qty: 60 },
      { name: "Fortune Sunlite Refined Sunflower Oil 1L", barcode: "8906007280014", sku: "FORT-OIL-1L", category: "Edible Oils", tax_rate: 5, purchase_price: 130, mrp: 165, selling_price: 155, stock_qty: 80 },
      { name: "Surf Excel Easy Wash Detergent Powder 1kg", barcode: "8901030704404", sku: "SURF-EASY-1KG", category: "Cleaning", tax_rate: 18, purchase_price: 110, mrp: 145, selling_price: 138, stock_qty: 110 },
      { name: "Colgate Strong Teeth Toothpaste 200g", barcode: "8901314010544", sku: "COLG-TOOTH-200", category: "Personal Care", tax_rate: 18, purchase_price: 85, mrp: 115, selling_price: 108, stock_qty: 95 },
      { name: "Parle-G Original Gluco Biscuits 250g", barcode: "8901719101014", sku: "PARLE-G-250G", category: "Bakery", tax_rate: 18, purchase_price: 22, mrp: 30, selling_price: 28, stock_qty: 300 },
      { name: "Red Label Tea 500g", barcode: "8901030022201", sku: "RED-TEA-500", category: "Beverages", tax_rate: 5, purchase_price: 245, mrp: 310, selling_price: 295, stock_qty: 55 },
    ];

    await productService.batchImportProducts(sampleProducts);
    loadProducts(searchQuery);
  }

  // Margin calculation helper
  const marginPct =
    formSellingPrice > 0 && formPurchasePrice > 0
      ? (((formSellingPrice - formPurchasePrice) / formSellingPrice) * 100).toFixed(1)
      : "0.0";

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* 1. ACTION & SEARCH CONTROL BAR */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 bg-(--color-bg-surface) border border-(--color-border-default) rounded-lg shadow-xs">
        {/* FAST SEARCH BAR */}
        <div className="relative flex-1 max-w-lg">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-(--color-text-muted)" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search by Barcode (Scan), SKU, Name, or Category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-10 pr-24 bg-(--color-bg-page) border border-(--color-border-default) rounded-md text-[13px] text-(--color-text-primary) placeholder-(--color-text-muted) focus:border-(--color-focus) focus:bg-(--color-bg-surface) transition-all"
          />
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[11px] font-mono text-(--color-text-secondary) bg-(--color-bg-subtle) px-2 py-0.5 rounded-sm border border-(--color-border-default)">
            <span className="text-(--color-success) font-bold">{searchLatency}ms</span>
          </div>
        </div>

        {/* CONTROLS */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleSeedCatalog}
            className="h-9 flex items-center gap-1.5 px-3.5 rounded-md bg-(--color-bg-subtle) hover:bg-(--color-bg-hover) text-(--color-text-secondary) hover:text-(--color-text-primary) text-[13px] font-medium border border-(--color-border-default) transition-colors cursor-pointer"
            title="Seed standard Indian FMCG SKUs"
          >
            <Download className="w-3.5 h-3.5 text-(--color-action-primary)" />
            <span>Seed 7 FMCG SKUs</span>
          </button>

          <button
            onClick={handleOpenAddModal}
            className="h-9 flex items-center gap-1.5 px-4 rounded-md bg-(--color-action-primary) hover:bg-(--color-action-primary-hover) active:bg-(--color-action-primary-active) text-white text-[13px] font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Product</span>
            <kbd className="hidden sm:inline-block ml-1 px-1.5 py-0.2 bg-(--primitive-blue-700) text-[10px] rounded-sm text-white font-mono">
              F2
            </kbd>
          </button>
        </div>
      </div>

      {/* 2. METRICS ROW */}
      <div className="flex items-center justify-between px-1 text-xs text-(--color-text-muted) font-mono">
        <div className="flex items-center gap-3">
          <span>
            Total SKUs: <strong className="text-(--color-text-primary) font-semibold">{totalFound}</strong>
          </span>
          <span className="text-(--color-border-default)">|</span>
          <span className="flex items-center gap-1 text-(--color-text-secondary)">
            <Sparkles className="w-3.5 h-3.5 text-(--color-action-primary)" /> SQLite Indexed (Sub-1ms)
          </span>
        </div>
        <div>
          <span>Press </span>
          <kbd className="px-1.5 py-0.5 bg-(--color-bg-subtle) rounded-sm border border-(--color-border-default) text-(--color-text-secondary) text-[10px]">
            Ctrl+F
          </kbd>
          <span> or </span>
          <kbd className="px-1.5 py-0.5 bg-(--color-bg-subtle) rounded-sm border border-(--color-border-default) text-(--color-text-secondary) text-[10px]">
            F3
          </kbd>
          <span> to search</span>
        </div>
      </div>

      {/* 3. PRODUCT DATA GRID (44px row, 36px header -> h-11 / h-9) */}
      <div className="flex-1 bg-(--color-bg-surface) border border-(--color-border-default) rounded-lg overflow-hidden shadow-xs flex flex-col">
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-collapse text-[13px]">
            {/* STICKY TABLE HEADER (36px -> h-9) */}
            <thead className="sticky top-0 bg-(--color-bg-subtle) border-b border-(--color-border-default) z-(--z-sticky)">
              <tr className="text-(--color-text-secondary) font-mono text-[11px] uppercase tracking-wider h-9">
                <th className="py-2 px-3.5">Barcode / SKU</th>
                <th className="py-2 px-3.5">Product Name</th>
                <th className="py-2 px-3.5">Category</th>
                <th className="py-2 px-3.5 text-center">GST %</th>
                <th className="py-2 px-3.5 text-right">Purchase (₹)</th>
                <th className="py-2 px-3.5 text-right">MRP (₹)</th>
                <th className="py-2 px-3.5 text-right">Retail Sell (₹)</th>
                <th className="py-2 px-3.5 text-right">Stock</th>
                <th className="py-2 px-3.5 text-center">Actions</th>
              </tr>
            </thead>

            {/* TABLE BODY (44px rows -> h-11) */}
            <tbody className="divide-y divide-(--color-border-default)">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-(--color-text-muted)">
                    <div className="inline-block animate-spin h-5 w-5 border-2 border-(--color-action-primary) border-t-transparent rounded-full mr-2" />
                    Querying SQLite catalog...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-(--color-text-muted)">
                    <Boxes className="w-8 h-8 mx-auto mb-2 text-(--color-text-disabled)" />
                    No products found matching &ldquo;{searchQuery}&rdquo;.
                  </td>
                </tr>
              ) : (
                products.map((p) => {
                  const isLowStock = p.stock_qty <= p.min_stock_alert;
                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-(--color-bg-subtle) transition-colors group cursor-pointer h-11"
                      onClick={() => handleOpenEditModal(p)}
                    >
                      {/* BARCODE / SKU */}
                      <td className="py-2 px-3.5 font-mono text-(--color-text-primary)">
                        <div className="flex items-center gap-1.5">
                          <Barcode className="w-3.5 h-3.5 text-(--color-text-muted) group-hover:text-(--color-action-primary) transition-colors" />
                          <span className="font-semibold">{p.barcode || "—"}</span>
                        </div>
                        {p.sku && <span className="text-[10px] text-(--color-text-muted) block">{p.sku}</span>}
                      </td>

                      {/* NAME */}
                      <td
                        className="py-2 px-3.5 font-medium text-(--color-text-primary) max-w-xs truncate cursor-help"
                        title={p.name}
                      >
                        {p.name}
                        {p.brand && (
                          <span className="text-[10px] text-(--color-text-secondary) font-normal ml-1.5 px-1.5 py-0.5 bg-(--color-bg-subtle) rounded-sm border border-(--color-border-default)">
                            {p.brand}
                          </span>
                        )}
                      </td>

                      {/* CATEGORY */}
                      <td className="py-2 px-3.5 text-(--color-text-secondary)">
                        <span className="px-2 py-0.5 rounded-sm bg-(--color-bg-subtle) text-[11px] border border-(--color-border-default)">
                          {p.category || "General"}
                        </span>
                      </td>

                      {/* GST RATE */}
                      <td className="py-2 px-3.5 text-center font-mono">
                        <span className="px-1.5 py-0.5 rounded-sm bg-(--color-action-primary-subtle) text-(--color-action-primary-text) border border-(--primitive-blue-200) text-[11px] font-semibold">
                          {p.tax_rate}%
                        </span>
                      </td>

                      {/* PURCHASE PRICE */}
                      <td className="py-2 px-3.5 text-right font-mono text-(--color-text-secondary)">
                        ₹{p.purchase_price.toFixed(2)}
                      </td>

                      {/* MRP */}
                      <td className="py-2 px-3.5 text-right font-mono text-(--color-text-muted) line-through">
                        ₹{p.mrp.toFixed(2)}
                      </td>

                      {/* SELLING PRICE */}
                      <td className="py-2 px-3.5 text-right font-mono font-bold text-(--color-action-primary)">
                        ₹{p.selling_price.toFixed(2)}
                      </td>

                      {/* STOCK QTY */}
                      <td className="py-2 px-3.5 text-right font-mono">
                        <div className="flex items-center justify-end gap-1.5">
                          {isLowStock && (
                            <span title="Low stock warning">
                              <AlertTriangle className="w-3.5 h-3.5 text-(--color-warning)" />
                            </span>
                          )}
                          <span
                            className={`px-1.5 py-0.5 rounded-sm text-[11px] ${
                              isLowStock
                                ? "bg-(--color-warning-bg) text-(--color-warning-dark) font-bold"
                                : "text-(--color-text-primary) font-medium"
                            }`}
                          >
                            {p.stock_qty} {p.unit}
                          </span>
                        </div>
                      </td>

                      {/* ACTIONS */}
                      <td className="py-2 px-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenEditModal(p)}
                            className="p-1 rounded-sm text-(--color-text-secondary) hover:text-(--color-action-primary) hover:bg-(--color-bg-subtle) transition-colors cursor-pointer"
                            title="Edit product"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(p.id)}
                            className="p-1 rounded-sm text-(--color-text-secondary) hover:text-(--color-danger) hover:bg-(--color-danger-bg) transition-colors cursor-pointer"
                            title="Deactivate product"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. ADD / EDIT PRODUCT MODAL (Z-Index: Modal 400) */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-(--z-modal) animate-in fade-in duration-100">
          <div className="bg-(--color-bg-surface) border border-(--color-border-default) rounded-xl w-full max-w-2xl shadow-lg overflow-hidden flex flex-col max-h-[90vh]">
            {/* MODAL HEADER */}
            <div className="p-4 border-b border-(--color-border-default) flex items-center justify-between bg-(--color-bg-page)">
              <div className="flex items-center gap-2">
                <Boxes className="w-5 h-5 text-(--color-action-primary)" />
                <h3 className="font-semibold text-[15px] text-(--color-text-primary)">
                  {editingProduct ? "Edit Product Details" : "Add New SKU to Catalog"}
                </h3>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="text-(--color-text-muted) hover:text-(--color-text-primary) p-1 rounded-sm hover:bg-(--color-bg-subtle) transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* MODAL FORM */}
            <form onSubmit={handleSaveProduct} className="p-5 overflow-y-auto space-y-4 text-[13px]">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* NAME */}
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-(--color-text-secondary) font-medium">Product Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Britannia Good Day Cashew Cookies 200g"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full h-9 px-3 bg-(--color-bg-page) border border-(--color-border-default) rounded-md text-(--color-text-primary) focus:border-(--color-focus) focus:bg-(--color-bg-surface) transition-all"
                  />
                </div>

                {/* BARCODE */}
                <div className="space-y-1">
                  <label className="text-(--color-text-secondary) font-medium">Barcode / EAN (Scan)</label>
                  <input
                    type="text"
                    placeholder="e.g. 8901063012484"
                    value={formBarcode}
                    onChange={(e) => setFormBarcode(e.target.value)}
                    className="w-full h-9 px-3 bg-(--color-bg-page) border border-(--color-border-default) rounded-md font-mono text-(--color-text-primary) focus:border-(--color-focus) focus:bg-(--color-bg-surface) transition-all"
                  />
                </div>

                {/* SKU */}
                <div className="space-y-1">
                  <label className="text-(--color-text-secondary) font-medium">SKU / Item Code</label>
                  <input
                    type="text"
                    placeholder="e.g. BRIT-GOODDAY-200"
                    value={formSku}
                    onChange={(e) => setFormSku(e.target.value)}
                    className="w-full h-9 px-3 bg-(--color-bg-page) border border-(--color-border-default) rounded-md font-mono text-(--color-text-primary) focus:border-(--color-focus) focus:bg-(--color-bg-surface) transition-all"
                  />
                </div>

                {/* CATEGORY */}
                <div className="space-y-1">
                  <label className="text-(--color-text-secondary) font-medium">Category</label>
                  <input
                    type="text"
                    placeholder="e.g. Groceries, FMCG, Dairy"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full h-9 px-3 bg-(--color-bg-page) border border-(--color-border-default) rounded-md text-(--color-text-primary) focus:border-(--color-focus) focus:bg-(--color-bg-surface) transition-all"
                  />
                </div>

                {/* BRAND */}
                <div className="space-y-1">
                  <label className="text-(--color-text-secondary) font-medium">Brand</label>
                  <input
                    type="text"
                    placeholder="e.g. Britannia, Nestle, Amul"
                    value={formBrand}
                    onChange={(e) => setFormBrand(e.target.value)}
                    className="w-full h-9 px-3 bg-(--color-bg-page) border border-(--color-border-default) rounded-md text-(--color-text-primary) focus:border-(--color-focus) focus:bg-(--color-bg-surface) transition-all"
                  />
                </div>

                {/* HSN CODE */}
                <div className="space-y-1">
                  <label className="text-(--color-text-secondary) font-medium">HSN / SAC Code</label>
                  <input
                    type="text"
                    placeholder="e.g. 19053100"
                    value={formHsn}
                    onChange={(e) => setFormHsn(e.target.value)}
                    className="w-full h-9 px-3 bg-(--color-bg-page) border border-(--color-border-default) rounded-md font-mono text-(--color-text-primary) focus:border-(--color-focus) focus:bg-(--color-bg-surface) transition-all"
                  />
                </div>

                {/* GST TAX RATE */}
                <div className="space-y-1">
                  <label className="text-(--color-text-secondary) font-medium">GST Tax Slab</label>
                  <select
                    value={formTaxRate}
                    onChange={(e) => setFormTaxRate(Number(e.target.value))}
                    className="w-full h-9 px-3 bg-(--color-bg-page) border border-(--color-border-default) rounded-md font-mono text-(--color-text-primary) focus:border-(--color-focus) focus:bg-(--color-bg-surface) transition-all cursor-pointer"
                  >
                    <option value={0}>0% (Exempt)</option>
                    <option value={5}>5% GST</option>
                    <option value={12}>12% GST</option>
                    <option value={18}>18% GST (Standard)</option>
                    <option value={28}>28% GST</option>
                  </select>
                </div>
              </div>

              {/* PRICING & INVENTORY SECTION */}
              <div className="pt-3 border-t border-(--color-border-default)">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-(--color-action-primary) font-mono">
                    Pricing & Stock Control
                  </span>
                  <span className="text-[11px] font-mono text-(--color-text-secondary)">
                    Margin: <strong className="text-(--color-success) font-bold">{marginPct}%</strong>
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <label className="text-(--color-text-secondary) font-medium">Purchase Price (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formPurchasePrice}
                      onChange={(e) => setFormPurchasePrice(Number(e.target.value))}
                      className="w-full h-9 px-3 bg-(--color-bg-page) border border-(--color-border-default) rounded-md font-mono text-(--color-text-primary) focus:border-(--color-focus) focus:bg-(--color-bg-surface) transition-all"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-(--color-text-secondary) font-medium">MRP (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formMrp}
                      onChange={(e) => setFormMrp(Number(e.target.value))}
                      className="w-full h-9 px-3 bg-(--color-bg-page) border border-(--color-border-default) rounded-md font-mono text-(--color-text-primary) focus:border-(--color-focus) focus:bg-(--color-bg-surface) transition-all"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-(--color-text-secondary) font-medium">Retail Selling Price (₹) *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={formSellingPrice}
                      onChange={(e) => setFormSellingPrice(Number(e.target.value))}
                      className="w-full h-9 px-3 bg-(--color-bg-page) border border-(--primitive-blue-300) rounded-md font-mono font-bold text-(--color-action-primary) focus:border-(--color-focus) focus:bg-(--color-bg-surface) transition-all"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-(--color-text-secondary) font-medium">Wholesale Price (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formWholesalePrice}
                      onChange={(e) => setFormWholesalePrice(Number(e.target.value))}
                      className="w-full h-9 px-3 bg-(--color-bg-page) border border-(--color-border-default) rounded-md font-mono text-(--color-text-primary) focus:border-(--color-focus) focus:bg-(--color-bg-surface) transition-all"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-(--color-text-secondary) font-medium">Current Stock</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formStockQty}
                      onChange={(e) => setFormStockQty(Number(e.target.value))}
                      className="w-full h-9 px-3 bg-(--color-bg-page) border border-(--color-border-default) rounded-md font-mono text-(--color-text-primary) focus:border-(--color-focus) focus:bg-(--color-bg-surface) transition-all"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-(--color-text-secondary) font-medium">Min Stock Alert</label>
                    <input
                      type="number"
                      step="1"
                      value={formMinStock}
                      onChange={(e) => setFormMinStock(Number(e.target.value))}
                      className="w-full h-9 px-3 bg-(--color-bg-page) border border-(--color-border-default) rounded-md font-mono text-(--color-text-primary) focus:border-(--color-focus) focus:bg-(--color-bg-surface) transition-all"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-(--color-text-secondary) font-medium">Unit</label>
                    <select
                      value={formUnit}
                      onChange={(e) => setFormUnit(e.target.value)}
                      className="w-full h-9 px-3 bg-(--color-bg-page) border border-(--color-border-default) rounded-md font-mono text-(--color-text-primary) focus:border-(--color-focus) focus:bg-(--color-bg-surface) transition-all cursor-pointer"
                    >
                      <option value="PCS">PCS (Pieces)</option>
                      <option value="KG">KG (Kilograms)</option>
                      <option value="GM">GM (Grams)</option>
                      <option value="LTR">LTR (Litres)</option>
                      <option value="ML">ML (Millilitres)</option>
                      <option value="BOX">BOX</option>
                      <option value="PKT">PKT (Packets)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* MODAL FOOTER */}
              <div className="pt-4 border-t border-(--color-border-default) flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="h-9 px-4 rounded-md bg-(--color-bg-subtle) hover:bg-(--color-bg-hover) text-(--color-text-secondary) font-medium transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-9 flex items-center gap-1.5 px-5 rounded-md bg-(--color-action-primary) hover:bg-(--color-action-primary-hover) text-white font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingProduct ? "Update Product" : "Save Product"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
