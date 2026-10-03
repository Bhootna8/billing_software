import { useState } from "react";
import {
  Building2,
  FileText,
  MapPin,
  Printer,
  ChevronRight,
  ChevronLeft,
  Check,
  Zap,
} from "lucide-react";
import { storeService, StoreProfile, StoreProfileInput } from "../../services/tauri";

interface OnboardingModalProps {
  isOpen: boolean;
  onComplete: (profile: StoreProfile) => void;
  onSkip: () => void;
}

export function OnboardingModal({ isOpen, onComplete, onSkip }: OnboardingModalProps) {
  const [step, setStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Form State
  const [name, setName] = useState<string>("Main Retail Store & Warehouse");
  const [code, setCode] = useState<string>("STORE-01");
  const [tagline, setTagline] = useState<string>("Fresh Quality · Wholesale Rates");
  const [phone, setPhone] = useState<string>("+91 9876543210");
  const [email, setEmail] = useState<string>("contact@mainretailstore.com");

  const [gstin, setGstin] = useState<string>("27AAAAA0000A1Z5");
  const [stateCode, setStateCode] = useState<string>("27-Maharashtra");

  const [address, setAddress] = useState<string>("Ground Floor, Commercial Hub");
  const [city, setCity] = useState<string>("Mumbai");
  const [pincode, setPincode] = useState<string>("400001");

  const [thermalWidth, setThermalWidth] = useState<string>("80mm");
  const [currencySymbol, setCurrencySymbol] = useState<string>("₹");
  const [invoicePrefix, setInvoicePrefix] = useState<string>("INV-2627-");

  if (!isOpen) return null;

  async function handleFinishSetup() {
    setIsSubmitting(true);
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
      thermal_width: thermalWidth,
      currency_symbol: currencySymbol,
      invoice_prefix: invoicePrefix,
      terms_conditions: "Goods once sold cannot be returned without original cash receipt.",
    };

    try {
      const updated = await storeService.completeOnboarding(input);
      onComplete(updated);
    } catch (err) {
      alert(`Setup error: ${err}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSkip() {
    await storeService.skipOnboarding();
    onSkip();
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-(--z-modal) animate-in fade-in duration-150 select-none">
      <div className="bg-(--color-bg-surface) border border-(--color-border-default) rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* HEADER */}
        <div className="p-5 border-b border-(--color-border-default) bg-(--color-bg-page) flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-(--color-action-primary) flex items-center justify-center text-white font-bold shadow-xs">
              ⚡
            </div>
            <div>
              <h2 className="text-base font-bold text-(--color-text-primary)">
                Welcome to Enterprise OS Setup Wizard
              </h2>
              <p className="text-xs text-(--color-text-secondary)">
                Configure your retail & wholesale store details in under 1 minute.
              </p>
            </div>
          </div>

          <button
            onClick={handleSkip}
            className="px-3 py-1.5 rounded-md bg-(--color-bg-subtle) hover:bg-(--color-bg-hover) text-xs font-semibold text-(--color-text-secondary) border border-(--color-border-default) cursor-pointer"
            title="Skip wizard and use standard store defaults (can be edited anytime later)"
          >
            Skip for Now
          </button>
        </div>

        {/* STEP PROGRESS TRACKER */}
        <div className="grid grid-cols-4 border-b border-(--color-border-default) text-xs font-mono bg-(--color-bg-subtle)">
          {[
            { num: 1, label: "Identity", icon: Building2 },
            { num: 2, label: "Tax & GST", icon: FileText },
            { num: 3, label: "Address", icon: MapPin },
            { num: 4, label: "Hardware", icon: Printer },
          ].map((s) => {
            const Icon = s.icon;
            const isCurrent = step === s.num;
            const isCompleted = step > s.num;
            return (
              <div
                key={s.num}
                onClick={() => setStep(s.num)}
                className={`py-2.5 px-3 flex items-center justify-center gap-1.5 cursor-pointer border-r border-(--color-border-default) last:border-r-0 transition-colors ${
                  isCurrent
                    ? "bg-(--color-bg-surface) text-(--color-action-primary) font-bold border-b-2 border-b-(--color-action-primary)"
                    : isCompleted
                    ? "text-(--color-success)"
                    : "text-(--color-text-muted)"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>
                  {s.num}. {s.label}
                </span>
                {isCompleted && <Check className="w-3 h-3 text-(--color-success)" />}
              </div>
            );
          })}
        </div>

        {/* STEP BODY */}
        <div className="p-6 text-xs space-y-4 min-h-[320px] flex flex-col justify-between">
          {step === 1 && (
            <div className="space-y-3.5 animate-in fade-in duration-100">
              <div className="space-y-1">
                <label className="font-semibold text-(--color-text-primary)">
                  Business / Store Legal Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-10 px-3 bg-(--color-bg-page) border border-(--color-border-default) focus:border-(--color-action-primary) focus:ring-2 focus:ring-(--color-action-primary)/20 outline-none rounded-md text-sm font-semibold text-(--color-text-primary)"
                  placeholder="e.g. Balaji Supermarket & Wholesale"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-(--color-text-secondary)">Store Code / Branch</label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full h-9 px-3 bg-(--color-bg-page) border border-(--color-border-default) rounded-md font-mono uppercase"
                    placeholder="e.g. STORE-01"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-(--color-text-secondary)">Tagline / Punchline</label>
                  <input
                    type="text"
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value)}
                    className="w-full h-9 px-3 bg-(--color-bg-page) border border-(--color-border-default) rounded-md"
                    placeholder="e.g. Fresh Quality · Wholesale Rates"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-(--color-text-secondary)">Phone / WhatsApp Number</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full h-9 px-3 bg-(--color-bg-page) border border-(--color-border-default) rounded-md font-mono"
                    placeholder="+91 9876543210"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-(--color-text-secondary)">Billing Support Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-9 px-3 bg-(--color-bg-page) border border-(--color-border-default) rounded-md"
                    placeholder="billing@yourstore.com"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3.5 animate-in fade-in duration-100">
              <div className="space-y-1">
                <label className="font-semibold text-(--color-text-primary)">
                  Company GSTIN (15 Digits)
                </label>
                <input
                  type="text"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value)}
                  className="w-full h-10 px-3 bg-(--color-bg-page) border border-(--color-border-default) focus:border-(--color-action-primary) focus:ring-2 focus:ring-(--color-action-primary)/20 outline-none rounded-md text-sm font-mono uppercase font-bold text-(--color-text-primary)"
                  placeholder="27AAAAA0000A1Z5"
                />
                <p className="text-[11px] text-(--color-text-muted)">
                  Required for valid B2B Tax Invoices & GSTR-1 filings. Leave blank if non-GST retailer.
                </p>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-(--color-text-secondary)">
                  Home State & Place of Supply Code *
                </label>
                <select
                  value={stateCode}
                  onChange={(e) => setStateCode(e.target.value)}
                  className="w-full h-10 px-3 bg-(--color-bg-page) border border-(--color-border-default) rounded-md font-medium text-xs text-(--color-text-primary)"
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
                <p className="text-[11px] text-(--color-text-muted)">
                  Sales within this state calculate CGST + SGST. Sales to other states automatically calculate IGST.
                </p>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3.5 animate-in fade-in duration-100">
              <div className="space-y-1">
                <label className="font-semibold text-(--color-text-primary)">
                  Store / Warehouse Street Address *
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full h-10 px-3 bg-(--color-bg-page) border border-(--color-border-default) rounded-md text-xs text-(--color-text-primary)"
                  placeholder="e.g. Shop No. 4, Ground Floor, Market Road"
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
                    placeholder="Mumbai"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-(--color-text-secondary)">PIN Code</label>
                  <input
                    type="text"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    className="w-full h-9 px-3 bg-(--color-bg-page) border border-(--color-border-default) rounded-md font-mono"
                    placeholder="400001"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-3.5 animate-in fade-in duration-100">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-(--color-text-secondary)">
                    Thermal Printer Width Preference
                  </label>
                  <select
                    value={thermalWidth}
                    onChange={(e) => setThermalWidth(e.target.value)}
                    className="w-full h-9 px-3 bg-(--color-bg-page) border border-(--color-border-default) rounded-md font-mono"
                  >
                    <option value="80mm">3-inch (80mm / 48 Columns - Standard)</option>
                    <option value="58mm">2-inch (58mm / 32 Columns - Compact)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-(--color-text-secondary)">Currency Symbol</label>
                  <input
                    type="text"
                    value={currencySymbol}
                    onChange={(e) => setCurrencySymbol(e.target.value)}
                    className="w-full h-9 px-3 bg-(--color-bg-page) border border-(--color-border-default) rounded-md font-bold font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-(--color-text-secondary)">
                  Retail POS Invoice Number Prefix
                </label>
                <input
                  type="text"
                  value={invoicePrefix}
                  onChange={(e) => setInvoicePrefix(e.target.value)}
                  className="w-full h-9 px-3 bg-(--color-bg-page) border border-(--color-border-default) rounded-md font-mono"
                  placeholder="INV-2627-"
                />
              </div>

              <div className="p-3 bg-(--color-success-bg) border border-(--primitive-success-600)/20 rounded-lg text-[11px] text-(--color-success-dark) flex items-center gap-2">
                <Zap className="w-4 h-4 text-(--color-success) shrink-0" />
                <span>
                  Everything is saved securely to your offline embedded SQLite engine. You can change these details anytime from <strong>Company Profile</strong>.
                </span>
              </div>
            </div>
          )}

          {/* FOOTER ACTIONS */}
          <div className="pt-4 border-t border-(--color-border-default) flex items-center justify-between">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                className="h-9 px-3.5 flex items-center gap-1.5 rounded-md bg-(--color-bg-subtle) hover:bg-(--color-bg-hover) text-(--color-text-secondary) font-medium text-xs cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
            ) : (
              <div />
            )}

            {step < 4 ? (
              <button
                type="button"
                onClick={() => setStep((s) => s + 1)}
                className="h-9 px-5 flex items-center gap-1.5 rounded-md bg-(--color-action-primary) hover:bg-(--color-action-primary-hover) text-white font-semibold text-xs shadow-xs cursor-pointer"
              >
                <span>Next Step</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleFinishSetup}
                className="h-9 px-6 flex items-center gap-1.5 rounded-md bg-(--color-success) hover:bg-(--primitive-success-700) text-white font-bold text-xs shadow-sm cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>{isSubmitting ? "Saving Setup..." : "Save & Complete Setup"}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
