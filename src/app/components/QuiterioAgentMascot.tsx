import quiterioTabby from "@/assets/quiterio-tabby.png.asset.json";

type Props = { size?: number; mood?: "idle" | "talking" | "happy"; className?: string };

export function QuiterioAgentMascot({ size = 56, mood = "idle", className = "" }: Props) {
  const cls = mood === "talking" ? "is-talking" : mood === "happy" ? "is-happy" : "";
  return (
    <div className={`quiterio-agent ${className}`} style={{ width: size, height: size }} aria-hidden="true">
      <img src={quiterioTabby.url} alt="" className={`quiterio-agent-img ${cls}`} />
      <style>{`
        .quiterio-agent{display:inline-block;line-height:0}
        .quiterio-agent-img{width:100%;height:100%;object-fit:contain;display:block;transform-origin:50% 92%;filter:drop-shadow(0 6px 10px rgba(0,0,0,.45));animation:qa-breathe 3s ease-in-out infinite}
        .quiterio-agent:hover .quiterio-agent-img,button:hover .quiterio-agent-img,button:focus-visible .quiterio-agent-img{animation:qa-idle 4s ease-in-out infinite}
        .quiterio-agent-img.is-happy{animation:qa-celebrate 1.4s ease-in-out infinite}
        .quiterio-agent-img.is-talking{animation:qa-jump .7s ease-in-out infinite}
        @keyframes qa-breathe{0%,100%{transform:scale(1)}50%{transform:scale(1.02,.98)}}
        /* hover: acena com a pata, dá pulinhos e um pulão com giro — como no vídeo */
        @keyframes qa-idle{
          /* acenando: inclina de um lado ao outro, como a pata acenando */
          0%{transform:rotate(0deg) translateY(0)}
          4%{transform:rotate(-10deg) translateY(-2%)}
          8%{transform:rotate(8deg) translateY(0)}
          12%{transform:rotate(-10deg) translateY(-2%)}
          16%{transform:rotate(8deg) translateY(0)}
          20%{transform:rotate(0deg) translateY(0)}
          /* pulinhos rápidos com "squash" ao aterrissar */
          26%{transform:translateY(-16%) scale(1.04,.96)}
          31%{transform:translateY(0) scale(1.06,.94)}
          34%{transform:translateY(0) scale(1)}
          38%{transform:translateY(-10%) scale(1.02,.98)}
          42%{transform:translateY(0) scale(1.05,.95)}
          46%{transform:translateY(0) scale(1)}
          /* pulão comemorando: sobe alto, estica, gira e aterrissa */
          54%{transform:translateY(-30%) scale(.96,1.08) rotate(-4deg)}
          62%{transform:translateY(-34%) scale(1) rotateY(180deg)}
          70%{transform:translateY(-30%) scale(.96,1.08) rotateY(360deg) rotate(4deg)}
          76%{transform:translateY(0) scale(1.08,.9) rotateY(360deg)}
          82%,100%{transform:translateY(0) scale(1) rotateY(360deg)}
        }
        /* feliz: pulo grande com as duas patas pro alto */
        @keyframes qa-celebrate{
          0%,100%{transform:translateY(0) scale(1) rotate(0deg)}
          30%{transform:translateY(-26%) scale(.95,1.1) rotate(-5deg)}
          55%{transform:translateY(-28%) scale(1.02) rotate(5deg)}
          75%{transform:translateY(0) scale(1.08,.9)}
        }
        /* falando: pulinhos animados */
        @keyframes qa-jump{
          0%,100%{transform:translateY(0) scale(1)}
          45%{transform:translateY(-14%) scale(.97,1.06)}
          70%{transform:translateY(0) scale(1.05,.95)}
        }
        @media (prefers-reduced-motion:reduce){.quiterio-agent-img{animation:none}}
      `}</style>
    </div>
  );
}
