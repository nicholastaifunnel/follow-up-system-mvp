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

const REAL_SCENES = [
  "顾客刚做完服务，满意度最高",
  "员工不需要尴尬开口催评价",
  "顾客扫码后，系统一步一步引导完成",
];

const TRUST_POINTS = [
  {
    title: "真实顾客",
    desc: "只有真实消费或体验后的顾客，才适合留下评价。",
  },
  {
    title: "真实体验",
    desc: "评价内容来自顾客自己的体验，不是虚假内容。",
  },
  {
    title: "顾客自己提交",
    desc: "系统只是让流程更简单，最后由顾客自己提交到平台。",
  },
];

const SOLUTION_POINTS = [
  {
    title: "顾客扫码",
    desc: "顾客扫码进入专属评价页面。",
  },
  {
    title: "选择平台",
    desc: "选择 Google Review 或 Facebook 评价。",
  },
  {
    title: "AI 协助整理文字",
    desc: "顾客输入简单体验，系统协助整理成自然的评价文字。",
  },
  {
    title: "顾客自己复制提交",
    desc: "顾客确认内容后，自己复制并提交到平台。",
  },
  {
    title: "老板更容易持续累积评价",
    desc: "老板更容易持续收集真实评价。",
  },
];

const HOW_IT_WORKS = [
  {
    step: "Step 1",
    title: "扫描进入页面",
    desc: "顾客付款后，扫描店里的 Review QR。",
  },
  {
    step: "Step 2",
    title: "选择 Google / Facebook",
    desc: "顾客选择想留下评价的平台。",
  },
  {
    step: "Step 3",
    title: "复制并提交评价",
    desc: "顾客确认文字后，复制到平台自己提交。",
  },
];

const WHY_HELPS = [
  "更容易在合适时机提醒顾客评价",
  "减少员工开口的尴尬和压力",
  "让顾客知道下一步该怎么做",
  "帮 Google / Facebook 评价持续累积",
  "适合美容店、美甲、美睫、纹眉、spa、养生馆",
];

const FIT_FOR_ITEMS = [
  "认真服务顾客，想累积真实评价",
  "想增加 Google / Facebook 评价",
  "员工开口请顾客评价会尴尬",
  "用简单方式长期收集评价",
  "美容店、美甲、美睫、纹眉、spa、养生馆",
];

const NOT_FIT_FOR_ITEMS = [
  "买假评价",
  "想自动刷评价",
  "不想让顾客自己提交评价",
  "完全不想参与后续跟进",
  "只想一次设置后完全不用理",
];

const PRICE_INCLUDES = [
  "专属 Review QR 页面",
  "Google / Facebook 评价入口",
  "AI 协助顾客整理评价文字",
  "QR 立牌设计指导",
  "基础设置协助",
];

const FAQ_ITEMS = [
  {
    q: "这个系统会不会拿假 Review？",
    a: "不会。系统不会帮你写假评价，也不会帮你刷评价。顾客必须根据自己的真实体验确认内容，并自己提交到 Google 或 Facebook。",
  },
  {
    q: "顾客会不会觉得很麻烦？",
    a: "不会。流程设计成扫码、选择平台、整理文字、复制提交。重点是让顾客少想一点、少找一点，更容易完成评价。",
  },
  {
    q: "可以同时收集 Google 和 Facebook 评价吗？",
    a: "可以，系统可以放 Google Review 和 Facebook 评价入口。不过实际使用时，我会建议每个 QR 页面先主打一个平台，例如先主打 Google Review。这样顾客选择更少，流程更简单，提交率也会比较高。如果之后想收集 Facebook 评价，也可以再安排另一个入口或另一个 QR 页面。",
  },
  {
    q: "顾客不会写评价怎么办？",
    a: "顾客只需要输入简单体验，系统会协助整理成比较自然的评价文字。顾客确认后，再自己复制并提交。",
  },
  {
    q: "适合什么类型的店？",
    a: "适合美容店、facial、美甲、美睫、纹眉、spa、养生馆、美发等需要本地顾客信任的行业。",
  },
  {
    q: "需要安装 App 或登录账号吗？",
    a: "不需要安装 App。顾客只需要用手机扫码打开页面，根据步骤操作。",
  },
  {
    q: "免费试用后一定要继续吗？",
    a: "不用。第一个月可以免费试用，觉得有帮助才继续。不满意可以不继续。",
  },
  {
    q: "试用后继续使用多少钱？",
    a: "Early Bird 优惠价是 RM199 / 年，只限首50位商家。之后价格可能会调整。",
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

function IconQr() {
  return (
    <svg width="54" height="54" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" />
      <rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" />
      <rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" />
      <path d="M14 14h3v3h-3v-3Zm4 0h3v7h-7v-3h4v-4Z" stroke="currentColor" strokeWidth="2" />
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
              R
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
          <div className="review-qr-hero-copy">
            <span className="review-qr-pill">美容店老板的真实评价流程</span>
            <h1 className="review-qr-hero-title">
              你服务到顾客满意
              <br />
              <span>不代表 Review 会留下</span>
            </h1>
            <p className="review-qr-lead review-qr-lead--main">
              很多美容店不是没有满意顾客，
              <br />
              而是顾客离开后，就忘了留下评价。
            </p>
            <p className="review-qr-lead">
              Review QR System 让顾客扫码后，跟着简单步骤完成 Google / Facebook Review。
            </p>
            <div className="review-qr-cta-row">
              <CtaButton onOpen={openApply} />
              <DemoButton onOpen={openDemo} />
            </div>
            <div className="review-qr-hero-proof">
              1 个月免费试用｜不满意可以不继续
            </div>
          </div>

          <div className="review-qr-hero-visual" aria-hidden>
            <div className="review-qr-mock-qr">
              <div className="review-qr-mock-kicker">COUNTER QR</div>
              <div className="review-qr-mock-qr-title">Review QR</div>
              <div className="review-qr-mock-qr-sub">
                扫一扫
                <br />
                留下真实评价
              </div>
              <div className="review-qr-mock-qr-box">
                <IconQr />
              </div>
              <div className="review-qr-mock-platforms">Google / Facebook</div>
            </div>

            <div className="review-qr-mock-phone">
              <div className="review-qr-phone-top" />
              <div className="review-qr-phone-card">
                <span>Step 1</span>
                <strong>选择评价平台</strong>
              </div>
              <div className="review-qr-mock-btns">
                <span>Google Review</span>
                <span>Facebook 评价</span>
              </div>
              <div className="review-qr-phone-card review-qr-phone-card--green">
                <span>Step 2</span>
                <strong>AI 协助整理文字</strong>
              </div>
              <div className="review-qr-copy-preview">
                “服务很好，环境舒服，员工也很细心...”
              </div>
              <div className="review-qr-phone-submit">复制并去平台提交</div>
            </div>
          </div>
        </div>
      </section>

      <section className="review-qr-scene-section">
        <div className="review-qr-section-inner">
          <div className="review-qr-scene-head">
            <span>真实门店场景</span>
            <h2>很多顾客其实愿意给好评</h2>
            <p>只是当下没人提醒</p>
          </div>
          <div className="review-qr-scene-grid">
            {REAL_SCENES.map((item, index) => (
              <article key={item} className="review-qr-scene-card">
                <span>{index + 1}</span>
                <p>{item}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="review-qr-section review-qr-section--light">
        <div className="review-qr-section-inner">
          <SectionTag number="01">为什么满意顾客没有变成 Review？</SectionTag>
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
            <button type="button" className="review-qr-text-cta" onClick={openDemo}>
              看看顾客体验流程 →
            </button>
          </div>
        </div>
      </section>

      <section className="review-qr-section review-qr-section--trust">
        <div className="review-qr-section-inner">
          <SectionTag number="02">这不是刷评价，也不是假评价</SectionTag>
          <p className="review-qr-copy">
            系统不会代写假评价，也不会帮你刷 Google Review。AI 只是帮助顾客整理文字，
            最后还是由顾客自己复制并提交到 Google / Facebook。
          </p>
          <div className="review-qr-trust-grid">
            {TRUST_POINTS.map((item) => (
              <article key={item.title} className="review-qr-trust-card">
                <span className="review-qr-trust-mark">真实</span>
                <h3>{item.title}</h3>
                <p>{item.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="review-qr-section review-qr-section--dark">
        <div className="review-qr-section-inner">
          <SectionTag number="03">Review QR System 怎么帮你</SectionTag>
          <p className="review-qr-copy">
            它不是帮你刷评价。
            <br />
            它是把顾客留下评价的流程变简单，让员工更容易执行。
          </p>
          <ul className="review-qr-feature-list">
            {SOLUTION_POINTS.map((item, index) => (
              <li key={item.title}>
                <span className="review-qr-feature-num">{index + 1}</span>
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="review-qr-section review-qr-section--gradient">
        <div className="review-qr-section-inner">
          <SectionTag number="04">顾客只需要 3 个步骤</SectionTag>
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
          <SectionTag number="05">为什么对美容店老板有帮助</SectionTag>
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

      <section className="review-qr-section review-qr-section--fit">
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

      <section className="review-qr-section review-qr-section--offer">
        <div className="review-qr-section-inner">
          <SectionTag number="06">先免费试用 1 个月</SectionTag>
          <p className="review-qr-copy review-qr-offer-lead">
            先让顾客真实使用看看。
            <br />
            觉得有帮助，之后才决定要不要继续。
          </p>
          <div className="review-qr-offer-cta">
            <CtaButton onOpen={openApply} />
          </div>

          <div className="review-qr-price-card">
            <div className="review-qr-price-label">Early Bird 优惠价</div>
            <div className="review-qr-price-main">RM199 / 年</div>
            <p className="review-qr-price-limit">只限首50位商家</p>
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
              Early Bird 价格只开放首50商家，之后价格会做调整。
            </p>
          </div>
        </div>
      </section>

      <section className="review-qr-section">
        <div className="review-qr-section-inner">
          <SectionTag number="07">常见问题</SectionTag>
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
        <h2>让满意顾客更容易留下真实 Review</h2>
        <p>
          先试 1 个月，看看顾客是否愿意使用。
          <br />
          如果觉得有帮助，再决定是否继续。
        </p>
        <CtaButton onOpen={openApply} />
      </section>

      <p className="review-qr-footer-note">
        Review QR System · 美容行业真实评价收集方案
      </p>
    </main>
  );
}
