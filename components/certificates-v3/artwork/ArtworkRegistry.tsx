"use client";

import BirthdayBalloons from "./BirthdayBalloons";
import SpiritualBirthdayDove from "./SpiritualBirthdayDove";

export default function ArtworkRegistry({ certType }: { certType: string }) {
  if (certType === "birthday") return <BirthdayBalloons />;
  if (certType === "spiritual_birthday") return <SpiritualBirthdayDove />;
  return null;
}
