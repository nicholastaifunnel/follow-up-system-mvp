import type { Metadata } from "next";
import { ReviewQrLandingClient } from "./ReviewQrLandingClient";

export const metadata: Metadata = {
  title: "Review QR System — 美容店 Google / Facebook 评价",
  description:
    "很多美容店有满意顾客，但评价没有增加。Review QR System 帮顾客扫码后按步骤留下 Google / Facebook 真实评价。先免费试用 1 个月。",
};

export default function ReviewQrSystemLandingPage() {
  return <ReviewQrLandingClient />;
}
