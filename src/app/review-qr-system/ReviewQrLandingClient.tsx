"use client";

import { useCallback, useState, type ReactNode } from "react";
import { ApplyTrialModal } from "./ApplyTrialModal";
import { DemoExperienceModal } from "./DemoExperienceModal";

const CTA_LABEL = "申请 1 个月免费试用";
const DEMO_LABEL = "先体验 Demo";

const REVIEW_QR_DEMO_URL =
  "https://nicholas-review-assistant.vercel.app/r/nicholasdemostudio/start";

const PROBLEMS = [
  "顾客当下满意，但离开后就忘了",
  "顾客不知道要写什么",
  "顾客不知道要去哪里写",
  "员工不好意思一直开口请顾客评价",
  "Google 和 Facebook 评价分散在不同地方",
  "老板想增加评价，但不想让顾客觉得被强迫",
];

const PRICE_INCLUDES = [
  "专属 Review QR 页面",
  "Google / Facebook 评价入口",
  "AI 协助顾客整理评价文字",
  "QR 立牌设计指导",
  "基础设置协助",
];

const SOLUTION_POINTS = [
  {
    title: "顾客扫码",
    desc: "顾客付款后扫描 QR，直接进入评价页面。",
  },
  {
    title: "选择平台",
    desc: "顾客可以选择 Google 或 Facebook。",
  },
  {
    title: "AI 协助整理文字",
    desc: "系统根据顾客的真实体验，帮顾客整理成自然的评价文字。",
  },
  {
    title: "顾客自己复制提交",
    desc: "顾客确认内容后，自己复制并提交到对应平台。",
  },
  {
    title: "老板更容易持续累积评价",
    desc: "不用每天硬开口，流程固定下来后更容易长期执行。",
  },
];

const HOW_IT_WORKS = [
  {
    step: "STEP 1",
    title: "扫码进入页面",
    desc: "顾客付款后，扫描店里的 Review QR。",
  },
  {
    step: "STEP 2",
    title: "选择 Google / Facebook",
    desc: "顾客选择想留下评价的平台。",
  },
  {
    step: "STEP 3",
    title: "复制并提交评价",
    desc: "顾客确认文字后，复制到平台自己提交。",
  },
];

const WHY_HELPS = [
  "更容易在合适时机提醒顾客评价",
  "减少员工开口的尴尬和压力",
  "让顾客知道下一步该怎么做",
  "帮 Google / Facebook 评价持续增加",
  "适合 facial、美甲、美睫、纹眉、spa、养生馆",
];

const FIT_FOR_ITEMS = [
  "让满意顾客更容易留下真实评价",
  "持续增加 Google / Facebook 评价",
  "减少员工开口请顾客评价的尴尬",
  "用简单流程引导顾客完成评价",
  "先免费试用，看顾客反应再决定",
];

const NOT_FIT_FOR_ITEMS = [
  "买假评价",
  "自动帮顾客乱写评价",
  "不经过顾客同意就提交评价",
  "一天内突然大量增加不真实评价",
  "完全不想参与设置和确认流程",
];

const FAQ_ITEMS = [
  {
    q: "这个系统会不会像买 review？",
    a: "不会。这个系统不是买 review，也不是假 review。顾客是根据真实体验自己提交评价，系统只是让顾客更容易完成这个动作。",
  },
  {
    q: "顾客会不会觉得很麻烦？",
    a: "不会。顾客只需要扫描 QR，跟着页面步骤走，系统会协助整理评价文字。比叫顾客自己打开 Google、慢慢想怎么写简单很多。",
  },
  {
    q: "可以同时收集 Google 和 Facebook 评价吗？",
    a: "可以，系统可以放 Google Review 和 Facebook 评价入口。不过实际使用时，我会建议每个 QR 页面先主打一个平台，例如先主打 Google Review。这样顾客选择更少，流程更简单，提交率也会比较高。如果之后想收集 Facebook 评价，也可以再安排另一个入口或另一个 QR 页面。",
  },
  {
    q: "顾客不会写评价怎么办？",
    a: "系统可以协助顾客整理评价文字。顾客不用从零开始想，只需要根据真实体验选择和调整内容，再自己复制提交。",
  },
  {
    q: "适合什么类型的店？",
    a: "特别适合美容、美甲、美睫、洗脸、纹眉、理发、按摩、护理类商家。只要你的顾客满意离开，但平时很少主动留下评价，就适合使用。",
  },
  {
    q: "需要安装 App 或登录账号吗？",
    a: "不需要。顾客用手机扫码就可以进入页面。商家也不需要复杂操作，我们会协助完成基础设置。",
  },
  {
    q: "免费试用后一定要继续吗？",
    a: "不需要。先免费试用 1 个月，真实看看顾客会不会使用、评价有没有增加。觉得有帮助，之后才决定要不要继续。",
  },
  {
    q: "试用后继续使用多少钱？",
    a: "Early Bird 优惠价是 RM199 / 年，只限首 50 位商家。之后价格会做调整。",
  },
];

function IconCheck({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`review-qr-icon ${className}`.trim()}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <path
        d="M20 6 9 17l-5-5"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconX({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`review-qr-icon ${className}`.trim()}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <path
        d="M18 6 6 18M6 6l12 12"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconStar() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.27 5.82 22 7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

function IconQr() {
  return (
    <svg width="56" height="56" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="3" width="7" height="7" stroke="currentColor" strokeWidth="2" />
      <rect x="14" y="3" width="7" height="7" stroke="currentColor" strokeWidth="2" />
      <rect x="3" y="14" width="7" height="7" stroke="currentColor" strokeWidth="2" />
      <path d="M14 14h3v3h-3v-3zm4 0h3v7h-7v-3h4v-4z" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function SectionTag({ number, children }: { number: string; children: ReactNode }) {
  return (
    <div className="review-qr-tag">
      <span className="review-qr-tag-num">{number}</span>
      <h2>{children}</h2>
    </div>
  );
}

function CtaButton({
  className = "",
  onOpen,
}: {
  className?: string;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      className={`review-qr-cta ${className}`.trim()}
      onClick={onOpen}
    >
      {CTA_LABEL}
    </button>
  );
}

function DemoButton({
  className = "",
  onOpen,
}: {
  className?: string;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      className={`review-qr-cta review-qr-cta-secondary ${className}`.trim()}
      onClick={onOpen}
    >
      {DEMO_LABEL}
    </button>
  );
}

export function ReviewQrLandingClient() {
  const [applyOpen, setApplyOpen] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);

  const openApply = useCallback(() => setApplyOpen(true), []);
  const closeApply = useCallback(() => setApplyOpen(false), []);

  const openDemo = useCallback(() => setDemoOpen(true), []);
  const closeDemo = useCallback(() => setDemoOpen(false), []);

  return (
    <main className="review-qr-landing">
      <ApplyTrialModal open={applyOpen} onClose={closeApply} />
      <DemoExperienceModal
        open={demoOpen}
        onClose={closeDemo}
        demoUrl={REVIEW_QR_DEMO_URL}
      />

      <nav className="review-qr-nav">
        <div className="review-qr-nav-inner">
          <div className="review-qr-brand">
            <div className="review-qr-brand-mark" aria-hidden>
              ★
            </div>
            <div>
              <div className="review-qr-brand-title">Review QR System</div>
              <div className="review-qr-brand-sub">美容店评价收集工具</div>
            </div>
          </div>
          <CtaButton className="review-qr-nav-cta" onOpen={openApply} />
        </div>
      </nav>

      <section className="review-qr-hero">
        <div className="review-qr-hero-grid">
          <div>
            <span className="review-qr-pill">⭐ 美容店评价收集工具</span>
            <h1 className="review-qr-hero-title">
              你服务到顾客满意
              <br />
              <span className="review-qr-hero-title-line2">不代表 Review 会留下</span>
            </h1>
            <p className="review-qr-lead">
              很多美容店不是没有满意顾客，而是顾客离开后就忘了写评价。
            </p>
            <p className="review-qr-lead">
              Review QR System 让顾客扫码后，按步骤完成 Google / Facebook 评价。
            </p>
            <div className="review-qr-cta-row">
              <CtaButton onOpen={openApply} />
              <DemoButton onOpen={openDemo} />
            </div>
          </div>
          <div className="review-qr-hero-visual" aria-hidden>
            <div className="review-qr-mock-qr">
              <div className="review-qr-mock-qr-title">Review QR</div>
              <div className="review-qr-mock-qr-sub">
                您的真实评价
                <br />
                是我们的进步动力
              </div>
              <div className="review-qr-mock-qr-box">
                <IconQr />
              </div>
              <div style={{ marginTop: "0.5rem", fontSize: "0.6rem", fontWeight: 700 }}>
                Google · Facebook
              </div>
            </div>
            <div className="review-qr-mock-phone">
              <h3>Thank You!</h3>
              <div className="review-qr-mock-stars">
                {[1, 2, 3, 4, 5].map((i) => (
                  <IconStar key={i} />
                ))}
              </div>
              <p style={{ margin: "0.5rem 0 0", fontSize: "0.55rem", color: "#64748b" }}>
                感谢您的评价
              </p>
              <div className="review-qr-mock-btns">
                <span>Google Review</span>
                <span>Facebook 评价</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="review-qr-section review-qr-section--light">
        <div className="review-qr-section-inner">
          <SectionTag number="01">为什么满意顾客没有变成评价？</SectionTag>
          <p className="review-qr-copy">
            很多老板以为顾客满意就会自然写评价。
            <br />
            但现实是，顾客离开店后通常已经去忙别的事，最后评价就没有留下。
          </p>
          <ul className="review-qr-problem-list">
            {PROBLEMS.map((item) => (
              <li key={item}>
                <IconCheck />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <div className="review-qr-mini-cta">
            <button
              type="button"
              className="review-qr-text-cta"
              onClick={openDemo}
            >
              看看顾客体验流程 →
            </button>
          </div>
        </div>
      </section>

      <section className="review-qr-section review-qr-section--dark">
        <div className="review-qr-section-inner">
          <SectionTag number="02">Review QR System 怎么帮你</SectionTag>
          <p className="review-qr-copy">
            它不是买评价，也不是假评价。
            <br />
            它只是把「提醒顾客写评价」这件事变得更简单、更自然。
          </p>
          <ul className="review-qr-feature-list">
            {SOLUTION_POINTS.map((item) => (
              <li key={item.title}>
                <IconCheck />
                <div>
                  <strong>{item.title}</strong>
                  <div
                    style={{
                      marginTop: "0.25rem",
                      fontSize: "0.9rem",
                      color: "var(--rqr-muted)",
                    }}
                  >
                    {item.desc}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="review-qr-section review-qr-section--gradient">
        <div className="review-qr-section-inner">
          <SectionTag number="03">顾客只需要 3 个步骤</SectionTag>
          <div className="review-qr-steps">
            {HOW_IT_WORKS.map((item) => (
              <article key={item.step} className="review-qr-step">
                <span className="review-qr-step-label">{item.step}</span>
                <h3>{item.title}</h3>
                <p>{item.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="review-qr-section review-qr-section--light">
        <div className="review-qr-section-inner">
          <SectionTag number="04">为什么对美容店老板有帮助</SectionTag>
          <ul className="review-qr-why-list">
            {WHY_HELPS.map((item) => (
              <li key={item}>
                <IconCheck />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="review-qr-section review-qr-section--gradient">
        <div className="review-qr-section-inner">
          <h2 className="review-qr-fit-title">适合什么老板？</h2>
          <div className="review-qr-fit-grid">
            <div className="review-qr-fit-card review-qr-fit-card--yes">
              <h3 className="review-qr-fit-card-title">适合你，如果你想要：</h3>
              <ul className="review-qr-fit-list">
                {FIT_FOR_ITEMS.map((item) => (
                  <li key={item}>
                    <IconCheck className="review-qr-icon--yes" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="review-qr-fit-card review-qr-fit-card--no">
              <h3 className="review-qr-fit-card-title">不适合你，如果你想要：</h3>
              <ul className="review-qr-fit-list">
                {NOT_FIT_FOR_ITEMS.map((item) => (
                  <li key={item}>
                    <IconX className="review-qr-icon--no" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="review-qr-section review-qr-section--dark">
        <div className="review-qr-section-inner">
          <SectionTag number="05">先免费试用 1 个月</SectionTag>
          <p className="review-qr-copy review-qr-offer-lead">
            先让顾客真实使用看看。
            <br />
            觉得有帮助，之后才决定要不要继续。
          </p>
          <div className="review-qr-offer-cta">
            <CtaButton onOpen={openApply} />
          </div>

          <div className="review-qr-price-wrap">
            <div className="review-qr-price-card">
              <h3 className="review-qr-price-heading">Early Bird 优惠价</h3>
              <div className="review-qr-price-amount-inline">
                <div className="review-qr-price-main">RM199 / 年</div>
                <p className="review-qr-price-limit">只限首50位商家</p>
              </div>
              <p className="review-qr-price-intro">
                适合想持续增加 Google / Facebook 评价的美容店。
              </p>
              <ul className="review-qr-price-list">
                {PRICE_INCLUDES.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <p className="review-qr-price-trial">
                第一个月免费试用，不满意可以不继续。
              </p>
              <p className="review-qr-price-note">
                Early Bird 价格只开放首50位商家，之后价格会做调整。
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="review-qr-section">
        <div className="review-qr-section-inner">
          <SectionTag number="06">常见问题</SectionTag>
          <div className="review-qr-faq">
            {FAQ_ITEMS.map((item) => (
              <details key={item.q} className="review-qr-faq-item">
                <summary>
                  <span className="review-qr-faq-q">{item.q}</span>
                  <span className="review-qr-faq-chevron" aria-hidden>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M6 9l6 6 6-6"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                </summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="review-qr-final">
        <h2>让满意顾客更容易留下真实评价</h2>
        <p>
          先试 1 个月，看看顾客愿不愿意使用。
          <br />
          如果觉得有帮助，再决定是否继续。
        </p>
        <CtaButton onOpen={openApply} />
      </section>

      <p className="review-qr-footer-note">Review QR System · 美容行业评价收集方案</p>
    </main>
  );
}
