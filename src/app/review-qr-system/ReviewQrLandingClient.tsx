"use client";

import { useCallback, useState, type ReactNode } from "react";
import { ApplyTrialModal } from "./ApplyTrialModal";
import { DemoExperienceModal } from "./DemoExperienceModal";

const CTA_LABEL = "申请 1 个月免费试用";
const DEMO_LABEL = "先体验 Demo";

const REVIEW_QR_DEMO_URL =
  "https://nicholas-review-assistant.vercel.app/r/nicholasdemostudio/start";

const PROBLEMS = [
  "顾客满意离开，但没有留下 review",
  "员工不好意思开口请顾客评价",
  "顾客不知道怎样写、写什么",
  "Google 和 Facebook 评价分散在不同地方",
  "老板很难持续跟进和评价增长",
];

const SOLUTION_POINTS = [
  {
    title: "顾客扫描 QR",
    desc: "付款或服务结束时，柜台立牌让顾客马上进入专属评价页面。",
  },
  {
    title: "选择 Google 或 Facebook",
    desc: "同一入口引导顾客选择要留下的平台，流程清楚简单。",
  },
  {
    title: "AI 协助整理评价文字",
    desc: "提供提示与范例，帮助顾客把真实体验写成自然的评价内容。",
  },
  {
    title: "复制后自行提交",
    desc: "顾客使用自己的账号，复制内容后到 Google / Facebook 提交真实评价。",
  },
  {
    title: "老板更容易累积口碑",
    desc: "真实、持续的好评，让新顾客预约前更放心。",
  },
];

const HOW_IT_WORKS = [
  {
    step: "Step 1",
    title: "顾客扫描 QR",
    desc: "服务结束、付款时提醒顾客扫码，是最好时机。",
  },
  {
    step: "Step 2",
    title: "选择 Google / Facebook",
    desc: "顾客按提示选择要评价的平台。",
  },
  {
    step: "Step 3",
    title: "复制评价并提交",
    desc: "顾客复制整理好的文字，到自己的账号提交。",
  },
];

const WHY_HELPS = [
  "更容易在合适时机提醒顾客评价",
  "减少员工开口的尴尬和压力",
  "让顾客更容易写出完整、真实的评价",
  "帮助 Google / Facebook 评价持续增加",
  "适合美容店、护肤、美甲、半永久、SPA 等行业",
];

const FAQ_ITEMS = [
  {
    q: "是否是真实评价？",
    a: "是。我们不买 review，也不代替顾客刷好评。顾客使用自己的 Google / Facebook 账号，根据真实体验手动提交。",
  },
  {
    q: "需要顾客自己提交吗？",
    a: "需要。系统协助整理文字与引导流程，最终仍由顾客在自己的平台账号提交，符合平台规范。",
  },
  {
    q: "可以同时收 Google 和 Facebook 吗？",
    a: "可以。专属 Review QR 页面集合两个平台入口，顾客可按需要选择。",
  },
  {
    q: "试用需要付费吗？",
    a: "第一个月免费试用。适合想先测试顾客反应的美容店，觉得有帮助才继续。",
  },
  {
    q: "适合什么行业？",
    a: "适合美容店、脸部护理、皮肤护理、美甲、美睫纹眉、发廊、SPA 等注重口碑的服务行业。",
  },
];

function IconCheck() {
  return (
    <svg className="review-qr-icon" viewBox="0 0 24 24" fill="none" aria-hidden>
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
              <div className="review-qr-brand-sub">美容店评价收集</div>
            </div>
          </div>
          <CtaButton className="review-qr-nav-cta" onOpen={openApply} />
        </div>
      </nav>

      <section className="review-qr-hero">
        <div className="review-qr-hero-grid">
          <div>
            <span className="review-qr-pill">⭐ 第一个月免费试用，觉得有帮助才继续</span>
            <h1>
              顾客满意离开，
              <br />
              不代表好评会留下。
            </h1>
            <p className="review-qr-lead">
              Review QR System 帮美容店更轻松收集 Google Review 和 Facebook 评价。
            </p>
            <p className="review-qr-lead">
              很多美容店都有满意的顾客，但线上评价却没有跟着增加。我们把 ask review
              的流程变简单，让顾客在付款时 scan QR 就能完成。
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
          <SectionTag number="01">很多老板都会遇到这种情况</SectionTag>
          <p className="review-qr-copy">
            做完 facial、美甲、美睫、纹眉或护理，顾客说很满意、会再来，但 Google / Facebook
            评价却没有增加。
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
              查看顾客体验流程 →
            </button>
          </div>
        </div>
      </section>

      <section className="review-qr-section review-qr-section--dark">
        <div className="review-qr-section-inner">
          <SectionTag number="02">Review QR System 怎样帮你</SectionTag>
          <p className="review-qr-copy">
            不需要复杂流程。顾客 scan QR，系统引导选择平台，AI 协助整理评价文字，顾客复制后到
            Google / Facebook 提交。
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
          <SectionTag number="03">怎样运作</SectionTag>
          <p className="review-qr-copy">三个简单步骤，员工只需提醒 + 扫码。</p>
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
          <SectionTag number="04">为什么对老板有帮助</SectionTag>
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

      <section className="review-qr-section review-qr-section--dark">
        <div className="review-qr-section-inner">
          <SectionTag number="05">1 个月免费试用</SectionTag>
          <p className="review-qr-copy">
            适合想先测试顾客反应的美容店。第一个月可以先试用，觉得有帮助才继续，不需要 hard
            sell。
          </p>
          <div className="review-qr-trial-box">
            <CtaButton className="review-qr-cta--wide" onOpen={openApply} />
            <p>包含专属 Review QR 页面、QR 立牌设计指引、Google / Facebook 链接与简单员工说明。</p>
          </div>

          <div className="review-qr-price-wrap">
            <div className="review-qr-price-tag">试用后价格简单透明</div>
            <div className="review-qr-price-card">
              <div className="review-qr-price-head">
                <div>
                  <div className="review-qr-price-title">Early Bird</div>
                  <div className="review-qr-price-sub">第一个月免费试用，觉得有帮助才继续。</div>
                </div>
                <div className="review-qr-price-amount">
                  <div className="review-qr-price-main">RM199 / year</div>
                  <div className="review-qr-price-alt">或 RM29 / month</div>
                </div>
              </div>

              <ul className="review-qr-price-list">
                <li>包含 Review QR 页面</li>
                <li>Google / Facebook 评价入口</li>
                <li>AI 协助顾客写评价</li>
                <li>QR 立牌设计指引</li>
                <li>基础设置协助</li>
              </ul>

              <p className="review-qr-price-note">
                Early Bird 价格只开放给早期试用商家。之后正常价可能调整为 RM399/year 或 RM39/month。
              </p>

              <CtaButton className="review-qr-cta--wide" onOpen={openApply} />
            </div>
          </div>
        </div>
      </section>

      <section className="review-qr-section">
        <div className="review-qr-section-inner">
          <SectionTag number="06">常见问题</SectionTag>
          <div className="review-qr-faq">
            {FAQ_ITEMS.map((item) => (
              <details key={item.q}>
                <summary>{item.q}</summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="review-qr-final">
        <h2>让真实好评，为你的美容店带来更多新顾客</h2>
        <p>现在申请 1 个月免费试用，先测试顾客反应，再决定是否继续。</p>
        <CtaButton onOpen={openApply} />
      </section>

      <p className="review-qr-footer-note">Review QR System · 美容行业评价收集方案</p>
    </main>
  );
}
