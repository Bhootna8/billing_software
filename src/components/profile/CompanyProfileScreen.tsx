import React, { useState, useEffect } from "react";
import {
  Building2,
  FileText,
  MapPin,
  Printer,
  CheckCircle2,
  Save,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { storeService, StoreProfile, StoreProfileInput } from "../../services/tauri";

interface CompanyProfileScreenProps {
  onProfileUpdated?: (updated: StoreProfile) => void;
}

export function CompanyProfileScreen({ onProfileUpdated }: CompanyProfileScreenProps) {
  const [profile, setProfile] = useState<StoreProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<"A4" | "THERMAL">("A4");

  // Editable Form State
  const [name, setName] = useState<string>("");
  const [code, setCode] = useState<string>("");
  const [tagline, setTagline] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [gstin, setGstin] = useState<string>("");
  const [stateCode, setStateCode] = useState<string>("27-Maharashtra");
  const [address, setAddress] = useState<string>("");
  const [city, setCity] = useState<string>("");
  const [pincode, setPincode] = useState<string>("");
  const [terms, setTerms] = useState<string>("");
  const [thermalWidth, setThermalWidth] = useState<string>("80mm");
  const [currencySymbol, setCurrencySymbol] = useState<string>("₹");
  const [invoicePrefix, setInvoicePrefix] = useState<string>("INV-2627-");

  useEffect(() => {
    async function load() {
      const p = await storeService.getStoreProfile();
      setProfile(p);
      setName(p.name);
      setCode(p.code);
      setTagline(p.tagline || "");
      setPhone(p.phone || "");
      setEmail(p.email || "");
      setGstin(p.gstin || "");
      setStateCode(p.state_code || "27-Maharashtra");
      setAddress(p.address || "");
      setCity(p.city || "");
      setPincode(p.pincode || "");
      setTerms(p.terms_conditions || "");
      setThermalWidth(p.thermal_width || "80mm");
      setCurrencySymbol(p.currency_symbol || "₹");
      setInvoicePrefix(p.invoice_prefix || "INV-2627-");
      setLoading(false);
    }
    load();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const input: StoreProfileInput = {
      name,
      code,
      tagline,
      phone,
      email,
      gstin: gstin || undefined,
      state_code: stateCode,
      address,
      city,
      pincode,
      terms_conditions: terms,
      thermal_width: thermalWidth,
      currency_symbol: currencySymbol,
      invoice_prefix: invoicePrefix,
    };

    try {
      const updated = await storeService.updateStoreProfile(input);
      setProfile(updated);
      onProfileUpdated?.(updated);
      setToastMsg("Company Profile & Store Branding updated successfully!");
      setTimeout(() => setToastMsg(null), 3500);
    } catch (err) {
      alert(`Save error: ${err}`);
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    if (!profile) return;
    setName(profile.name);
    setCode(profile.code);
    setTagline(profile.tagline || "");
    setPhone(profile.phone || "");
    setEmail(profile.email || "");
    setGstin(profile.gstin || "");
    setStateCode(profile.state_code);
    setAddress(profile.address || "");
    setCity(profile.city || "");
    setPincode(profile.pincode || "");
    setTerms(profile.terms_conditions || "");
    setThermalWidth(profile.thermal_width);
    setCurrencySymbol(profile.currency_symbol);
    setInvoicePrefix(profile.invoice_prefix);
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center text-xs text-(--color-text-muted)">
        Loading Company Profile...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full space-y-3 overflow-hidden select-none">
      {/* TOAST */}
      {toastMsg && (
        <div className="fixed top-18 right-6 z-(--z-toast) bg-(--color-success) text-white px-4 py-2.5 rounded-md shadow-lg flex items-center gap-2 text-sm font-medium animate-in fade-in duration-150">
          <CheckCircle2 className="w-5 h-5" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* HEADER BANNER */}
      <div className="bg-(--color-bg-surface) border border-(--color-border-default) rounded-lg p-4 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-(--color-action-primary) flex items-center justify-center text-white font-bold shadow-xs">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-(--color-text-primary)">
              Company Profile & Store Master
            </h1>
            <p className="text-xs text-(--color-text-secondary)">
              Manage your legal business name, GST credentials, receipt templates, and branding.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleReset}
            className="h-9 px-3.5 flex items-center gap-1.5 rounded-md bg-(--color-bg-subtle) hover:bg-(--color-bg-hover) text-(--color-text-secondary) font-medium text-xs border border-(--color-border-default) cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="h-9 px-4 flex items-center gap-1.5 rounded-md bg-(--color-action-primary) hover:bg-(--color-action-primary-hover) text-white font-semibold text-xs shadow-xs cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? "Saving Changes..." : "Save Profile Changes"}</span>
          </button>
        </div>
      </div>

      {/* 2-COLUMN SPLIT WORKSPACE: EDIT FORM ON LEFT, LIVE BILL PREVIEW ON RIGHT */}
      <div className="flex-1 grid grid-cols-12 gap-3 min-h-0">
        {/* LEFT COLUMN: EDIT FORM (7 Cols) */}
        <div className="col-span-12 lg:col-span-7 bg-(--color-bg-surface) border border-(--color-border-default) rounded-lg p-5 overflow-y-auto shadow-xs flex flex-col space-y-4 text-xs">
          {/* SECTION 1: BUSINESS IDENTITY */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 font-bold text-xs text-(--color-text-primary) border-b border-(--color-border-default) pb-2 uppercase tracking-wider font-mono">
              <Building2 className="w-4 h-4 text-(--color-action-primary)" />
              <span>1. Business Identity & Branding</span>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-(--color-text-primary)">Store / Trade Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-9 px-3 bg-(--color-bg-page) border border-(--color-border-default) focus:border-(--color-action-primary) focus:ring-2 focus:ring-(--color-action-primary)/20 outline-none rounded-md font-semibold text-sm text-(--color-text-primary)"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-semibold text-(--color-text-secondary)">Store Code / Terminal</label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full h-9 px-3 bg-(--color-bg-page) border border-(--color-border-default) rounded-md font-mono uppercase"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-(--color-text-secondary)">Tagline / Header Line</label>
                <input
                  type="text"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  className="w-full h-9 px-3 bg-(--color-bg-page) border border-(--color-border-default) rounded-md"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-semibold text-(--color-text-secondary)">Phone / Support Contact</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full h-9 px-3 bg-(--color-bg-page) border border-(--color-border-default) rounded-md font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-(--color-text-secondary)">Support Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-9 px-3 bg-(--color-bg-page) border border-(--color-border-default) rounded-md"
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: STATUTORY GST */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-2 font-bold text-xs text-(--color-text-primary) border-b border-(--color-border-default) pb-2 uppercase tracking-wider font-mono">
              <FileText className="w-4 h-4 text-(--color-action-primary)" />
              <span>2. Statutory GST & Place of Supply</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-semibold text-(--color-text-primary)">Store GSTIN</label>
                <input
                  type="text"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value)}
                  className="w-full h-9 px-3 bg-(--color-bg-page) border border-(--color-border-default) rounded-md font-mono uppercase font-bold"
                  placeholder="27AAAAA0000A1Z5"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-(--color-text-secondary)">Home State of Supply</label>
                <select
                  value={stateCode}
                  onChange={(e) => setStateCode(e.target.value)}
                  className="w-full h-9 px-3 bg-(--color-bg-page) border border-(--color-border-default) rounded-md text-xs"
                >
                  <option value="27-Maharashtra">27 - Maharashtra</option>
                  <option value="29-Karnataka">29 - Karnataka</option>
                  <option value="24-Gujarat">24 - Gujarat</option>
                  <option value="07-Delhi">07 - Delhi</option>
                  <option value="33-Tamil Nadu">33 - Tamil Nadu</option>
                  <option value="09-Uttar Pradesh">09 - Uttar Pradesh</option>
                  <option value="19-West Bengal">19 - West Bengal</option>
                  <option value="06-Haryana">06 - Haryana</option>
                </select>
              </div>
            </div>
          </div>

          {/* SECTION 3: LOCATION & BILLING ADDRESS */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-2 font-bold text-xs text-(--color-text-primary) border-b border-(--color-border-default) pb-2 uppercase tracking-wider font-mono">
              <MapPin className="w-4 h-4 text-(--color-action-primary)" />
              <span>3. Location & Billing Address</span>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-(--color-text-secondary)">Street Address</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full h-9 px-3 bg-(--color-bg-page) border border-(--color-border-default) rounded-md text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-semibold text-(--color-text-secondary)">City / District</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full h-9 px-3 bg-(--color-bg-page) border border-(--color-border-default) rounded-md"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-(--color-text-secondary)">PIN Code</label>
                <input
                  type="text"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  className="w-full h-9 px-3 bg-(--color-bg-page) border border-(--color-border-default) rounded-md font-mono"
                />
              </div>
            </div>
          </div>

          {/* SECTION 4: INVOICE & RECEIPT CUSTOMIZATION */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-2 font-bold text-xs text-(--color-text-primary) border-b border-(--color-border-default) pb-2 uppercase tracking-wider font-mono">
              <Printer className="w-4 h-4 text-(--color-action-primary)" />
              <span>4. Invoice & Receipt Customization</span>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-(--color-text-secondary)">Terms & Conditions Text (Footer)</label>
              <textarea
                rows={2}
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                className="w-full p-2.5 bg-(--color-bg-page) border border-(--color-border-default) rounded-md text-xs"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="font-semibold text-(--color-text-secondary)">Thermal Width</label>
                <select
                  value={thermalWidth}
                  onChange={(e) => setThermalWidth(e.target.value)}
                  className="w-full h-9 px-2 bg-(--color-bg-page) border border-(--color-border-default) rounded-md font-mono"
                >
                  <option value="80mm">80mm (3-inch)</option>
                  <option value="58mm">58mm (2-inch)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-(--color-text-secondary)">Currency Symbol</label>
                <input
                  type="text"
                  value={currencySymbol}
                  onChange={(e) => setCurrencySymbol(e.target.value)}
                  className="w-full h-9 px-2 text-center bg-(--color-bg-page) border border-(--color-border-default) rounded-md font-bold font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-(--color-text-secondary)">Invoice Prefix</label>
                <input
                  type="text"
                  value={invoicePrefix}
                  onChange={(e) => setInvoicePrefix(e.target.value)}
                  className="w-full h-9 px-2 bg-(--color-bg-page) border border-(--color-border-default) rounded-md font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: LIVE BRANDED INVOICE PREVIEW (5 Cols) */}
        <div className="col-span-12 lg:col-span-5 bg-(--color-bg-surface) border border-(--color-border-default) rounded-lg p-4 shadow-xs flex flex-col justify-between overflow-hidden">
          <div className="flex items-center justify-between border-b border-(--color-border-default) pb-2">
            <span className="font-bold text-xs text-(--color-text-primary) flex items-center gap-1.5 font-mono">
              <Sparkles className="w-3.5 h-3.5 text-(--color-action-primary)" />
              <span>Live Branded Template Preview</span>
            </span>

            <div className="inline-flex border border-(--color-border-default) rounded-md overflow-hidden bg-(--color-bg-page) p-0.5 text-[11px] font-semibold">
              <button
                type="button"
                onClick={() => setPreviewMode("A4")}
                className={`px-2.5 py-1 rounded-sm cursor-pointer transition-colors ${
                  previewMode === "A4"
                    ? "bg-(--color-action-primary) text-white"
                    : "text-(--color-text-secondary)"
                }`}
              >
                A4 Tax Bill
              </button>
              <button
                type="button"
                onClick={() => setPreviewMode("THERMAL")}
                className={`px-2.5 py-1 rounded-sm cursor-pointer transition-colors ${
                  previewMode === "THERMAL"
                    ? "bg-(--color-action-primary) text-white"
                    : "text-(--color-text-secondary)"
                }`}
              >
                ESC/POS Thermal
              </button>
            </div>
          </div>

          {/* PREVIEW CONTAINER */}
          <div className="flex-1 my-3 bg-white border border-(--color-border-default) rounded-md shadow-inner overflow-y-auto p-4 text-black font-mono text-[11px]">
            {previewMode === "A4" ? (
              /* A4 TAX INVOICE PREVIEW */
              <div className="space-y-3">
                <div className="text-center pb-2 border-b space-y-0.5">
                  <h2 className="text-sm font-bold uppercase tracking-wide">{name || "Store Name"}</h2>
                  <p className="text-[10px] text-gray-600">{tagline}</p>
                  <p className="text-[10px] text-gray-700">
                    {address}, {city} - {pincode}
                  </p>
                  <p className="text-[10px] text-gray-700">Phone: {phone} | Email: {email}</p>
                  <p className="text-[10px] font-bold text-blue-900 mt-1">GSTIN: {gstin || "Unregistered"}</p>
                  <p className="text-xs font-bold text-gray-900 mt-1 border-t pt-1">TAX INVOICE (B2B / B2C)</p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10px] border-b pb-2">
                  <div>
                    <span className="font-bold block">Invoice No: {invoicePrefix}0001</span>
                    <span>Date: {new Date().toLocaleDateString("en-IN")}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold block">State of Supply:</span>
                    <span>{stateCode}</span>
                  </div>
                </div>

                <table className="w-full text-left border-collapse text-[10px]">
                  <thead>
                    <tr className="border-b bg-gray-100">
                      <th className="py-1 px-1">Item</th>
                      <th className="py-1 px-1 text-center">Qty</th>
                      <th className="py-1 px-1 text-right">Rate</th>
                      <th className="py-1 px-1 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    <tr>
                      <td className="py-1 px-1">Dove Bathing Bar 100g</td>
                      <td className="py-1 px-1 text-center">2</td>
                      <td className="py-1 px-1 text-right">₹58.00</td>
                      <td className="py-1 px-1 text-right">₹116.00</td>
                    </tr>
                    <tr>
                      <td className="py-1 px-1">Lays Magic Masala 50g</td>
                      <td className="py-1 px-1 text-center">3</td>
                      <td className="py-1 px-1 text-right">₹20.00</td>
                      <td className="py-1 px-1 text-right">₹60.00</td>
                    </tr>
                  </tbody>
                </table>

                <div className="border-t pt-2 space-y-0.5 text-right font-bold text-[10px]">
                  <div>Total Amount: ₹176.00</div>
                  <div className="text-gray-600 font-normal">GST Included: ₹24.50</div>
                </div>

                <div className="border-t pt-2 text-[9px] text-gray-500 text-center">
                  {terms || "Thank you for your business!"}
                </div>
              </div>
            ) : (
              /* ESC/POS THERMAL RECEIPT PREVIEW */
              <div
                className={`mx-auto bg-yellow-50/50 p-3 border border-dashed border-gray-400 text-center space-y-1 text-[10px] ${
                  thermalWidth === "58mm" ? "max-w-[200px]" : "max-w-[280px]"
                }`}
              >
                <div className="font-bold uppercase text-xs">{name || "Store Name"}</div>
                <div className="text-[9px] text-gray-600">{tagline}</div>
                <div className="text-[9px] text-gray-600">GSTIN: {gstin || "N/A"}</div>
                <div className="text-[9px] text-gray-600">Ph: {phone}</div>
                <div className="border-t border-dashed my-1" />
                <div className="flex justify-between text-[9px] font-bold">
                  <span>Bill #{invoicePrefix}0001</span>
                  <span>{new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>
                </div>
                <div className="border-t border-dashed my-1" />
                <div className="text-left space-y-1">
                  <div className="flex justify-between">
                    <span>Dove Soap 100g x 2</span>
                    <span>116.00</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Lays Masala x 3</span>
                    <span>60.00</span>
                  </div>
                </div>
                <div className="border-t border-dashed my-1" />
                <div className="flex justify-between font-bold text-xs">
                  <span>GRAND TOTAL:</span>
                  <span>₹176.00</span>
                </div>
                <div className="text-[9px] text-gray-500 pt-1">
                  {terms || "Thank you for shopping!"}
                </div>
              </div>
            )}
          </div>

          <div className="text-[11px] font-mono text-(--color-text-muted) text-center">
            Branding updates reflect instantly on all counter registers.
          </div>
        </div>
      </div>
    </div>
  );
}
