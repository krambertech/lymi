import { useLingui } from "@lingui/react/macro";

/** Captures from the App Store listing (apps/mobile/store/screenshots/raw), one set per language. */
const LOCALES = ["en", "uk", "ru"];

interface PhoneProps {
  screen: string;
  width: number;
  className: string;
}

/** An iPhone frame around a 1320 by 2868 Simulator capture, with the Dynamic Island drawn over it. */
function Phone({ screen, width, className }: PhoneProps) {
  return (
    <div
      className={`absolute bg-[linear-gradient(150deg,oklch(0.42_0.004_60),oklch(0.2_0.004_60)_35%,oklch(0.16_0.004_60)_70%,oklch(0.36_0.004_60))] shadow-[inset_0_0_0_1px_oklch(1_0_0/0.14),0_0_0_1px_oklch(0.1_0_0/0.5),0_40px_60px_-28px_oklch(0.15_0.03_60/0.55),0_12px_24px_-12px_oklch(0.15_0.03_60/0.35)] ${className}`}
      style={{ width, padding: width * 0.032, borderRadius: width * 0.165 }}
    >
      <img
        src={screen}
        alt=""
        width={1320}
        height={2868}
        // The changelog frame places screenshot images absolutely; this one sits in its phone.
        className="relative! block aspect-[1320/2868] h-auto w-full"
        style={{ borderRadius: width * 0.135 }}
      />
      <span
        className="absolute start-1/2 -translate-x-1/2 rounded-full bg-black"
        style={{ top: width * 0.06, width: width * 0.29, height: width * 0.085 }}
      />
    </div>
  );
}

/** Three iPhones in a fan: a review card, Today in front, and the streak at night. */
export function IPhoneFigure() {
  const { i18n } = useLingui();
  const locale = LOCALES.includes(i18n.locale) ? i18n.locale : "en";
  const screen = (name: string) => `/iphone/${locale}/${name}.webp`;
  return (
    <div aria-hidden="true" className="relative h-[412px] w-[660px] overflow-hidden">
      <Phone
        screen={screen("review")}
        width={196}
        className="start-[92px] top-[70px] -rotate-9 brightness-[0.97]"
      />
      <Phone screen={screen("streak")} width={196} className="end-[92px] top-[70px] rotate-9" />
      <Phone screen={screen("today")} width={224} className="start-[218px] top-[30px] z-10" />
    </div>
  );
}
