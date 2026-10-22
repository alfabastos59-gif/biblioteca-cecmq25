import quiterioTabby from "@/assets/quiterio-tabby.png.asset.json";

type Props = { size?: number; mood?: "idle" | "talking" | "happy"; className?: string };

export function QuiterioAgentMascot({ size = 56, mood = "idle", className = "" }: Props) {
  const cls = mood === "talking" ? "is-talking" : mood === "happy" ? "is-happy" : "";
  return (
    <div className={`quiterio-agent ${className}`} style={{ width: size, height: size }} aria-hidden="true">
      <img src={quiterioTabby.url} alt="" className={`quiterio-agent-img ${cls}`} />
      <style>{`
        .quiterio-agent{display:inline-block;line-height:0}
        .quiterio-agent-img{width:100%;height:100%;object-fit:contain;display:block;transform-origin:50% 95%;filter:drop-shadow(0 6px 10px rgba(0,0,0,.45));animation:qa-idle 9s ease-in-out infinite}
        .quiterio-agent-img.is-happy{animation:qa-wave 1.6s ease-in-out infinite}
        .quiterio-agent-img.is-talking{animation:qa-jump .7s ease-in-out infinite}
        /* idle: acena, pula e vira em sequência */
        @keyframes qa-idle{
          0%,8%{transform:rotate(0deg) translateY(0)}
          12%{transform:rotate(-8deg) translateY(0)}
          16%{transform:rotate(6deg) translateY(0)}
          20%{transform:rotate(-6deg) translateY(0)}
          24%,34%{transform:rotate(0deg) translateY(0)}
          40%{transform:translateY(-14%) scale(1.03)}
          46%{transform:translateY(0) scale(1)}
          50%{transform:translateY(-8%)}
          55%,64%{transform:translateY(0) rotateY(0deg)}
          72%{transform:rotateY(180deg)}
          80%{transform:rotateY(360deg)}
          100%{transform:rotateY(360deg)}
        }
        @keyframes qa-wave{0%,100%{transform:rotate(-7deg)}50%{transform:rotate(7deg) translateY(-3%)}}
        @keyframes qa-jump{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-12%) scale(1.05)}}
        @media (prefers-reduced-motion:reduce){.quiterio-agent-img{animation:none}}
      `}</style>
    </div>
  );
}
