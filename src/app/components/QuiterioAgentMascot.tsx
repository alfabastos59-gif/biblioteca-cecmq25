import quiterioGato from "@/assets/quiterio-gato.gif.asset.json";

type Props = { size?: number; mood?: "idle" | "talking" | "happy"; className?: string };

export function QuiterioAgentMascot({ size = 56, mood = "idle", className = "" }: Props) {
  const cls = mood === "talking" ? "is-talking" : mood === "happy" ? "is-happy" : "";
  return (
    <div className={`quiterio-agent ${className}`} style={{ width: size, height: size }} aria-hidden="true">
      <img src={quiterioGato.url} alt="" className={`quiterio-agent-video ${cls}`} />
      <style>{`
        .quiterio-agent{display:inline-block;line-height:0;border-radius:9999px;overflow:hidden;background:#ecfdf5}
        .quiterio-agent-video{width:100%;height:100%;object-fit:cover;display:block;transform:translateY(8px) scale(1.08);animation:qa-sway 3s ease-in-out infinite;transform-origin:50% 85%}
        .quiterio-agent-video.is-happy{animation:qa-wiggle 1.6s ease-in-out infinite}
        .quiterio-agent-video.is-talking{animation:qa-pounce .55s ease-in-out infinite}
        @keyframes qa-sway{0%,100%{transform:translateY(8px) scale(1.08)}50%{transform:translateY(7px) scale(1.11)}}
        @keyframes qa-wiggle{0%,100%{transform:translateY(8px) rotate(-2deg) scale(1.08)}50%{transform:translateY(6px) rotate(2deg) scale(1.13)}}
        @keyframes qa-pounce{0%,100%{transform:translateY(8px) scale(1.08)}50%{transform:translateY(5px) scale(1.15)}}
        @media (prefers-reduced-motion:reduce){.quiterio-agent-video{animation:none}}
      `}</style>
    </div>
  );
}
