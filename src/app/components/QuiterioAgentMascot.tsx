import quiterioLeitor from "@/assets/quiterio-leitor.png.asset.json";

type Props = { size?: number; mood?: "idle" | "talking" | "happy"; className?: string };

export function QuiterioAgentMascot({ size = 56, mood = "idle", className = "" }: Props) {
  const cls = mood === "talking" ? "is-talking" : mood === "happy" ? "is-happy" : "";
  return (
    <div className={`quiterio-agent ${className}`} style={{ width: size, height: size }} aria-hidden="true">
      <img src={quiterioLeitor.url} alt="" className={`quiterio-agent-video ${cls}`} />
      <style>{`
        .quiterio-agent{display:inline-block;line-height:0;border-radius:9999px;overflow:hidden;background:#fdf6ec}
        .quiterio-agent-video{width:100%;height:100%;object-fit:cover;display:block;transform-origin:50% 90%;animation:qa-read 3.2s ease-in-out infinite}
        .quiterio-agent-video.is-happy{animation:qa-wiggle 1.4s ease-in-out infinite}
        .quiterio-agent-video.is-talking{animation:qa-talk .6s ease-in-out infinite}
        @keyframes qa-read{0%,100%{transform:translateY(0) rotate(-3deg) scale(1.05)}25%{transform:translateY(-3px) rotate(0deg) scale(1.07)}50%{transform:translateY(0) rotate(3deg) scale(1.05)}75%{transform:translateY(-2px) rotate(0deg) scale(1.07)}}
        @keyframes qa-wiggle{0%,100%{transform:rotate(-6deg) scale(1.06)}50%{transform:translateY(-4px) rotate(6deg) scale(1.12)}}
        @keyframes qa-talk{0%,100%{transform:translateY(0) scale(1.05)}50%{transform:translateY(-4px) scale(1.12)}}
        @media (prefers-reduced-motion:reduce){.quiterio-agent-video{animation:none}}
      `}</style>
    </div>
  );
}
