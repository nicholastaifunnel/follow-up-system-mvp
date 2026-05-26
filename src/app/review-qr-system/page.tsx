import type { Metadata } from "next";
import { ReviewQrLandingClient } from "./ReviewQrLandingClient";

export const metadata: Metadata = {
  title: "Review QR System — 美容店 Google / Facebook 评价",
  description:
    "Review QR System 帮美容店更轻松收集 Google Review 和 Facebook 评价。申请 1 个月免费试用。",
};

export default function ReviewQrSystemLandingPage() {
  return <ReviewQrLandingClient />;
}
