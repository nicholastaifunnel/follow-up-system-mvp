import type { Metadata } from "next";
import { ReviewQrLandingClient } from "./ReviewQrLandingClient";

export const metadata: Metadata = {
  title: "Review QR System — 美容店 Google / Facebook 评价",
  description:
    "Review QR System 帮美容店、facial、美甲、美睫、纹眉、spa 和美发店，让真实顾客扫码后更容易留下 Google / Facebook Review。先免费试用 1 个月。",
};

export default function ReviewQrSystemLandingPage() {
  return <ReviewQrLandingClient />;
}
