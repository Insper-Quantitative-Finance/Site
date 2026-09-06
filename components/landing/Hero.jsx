import Image from 'next/image';

// Mesh do hero: vermelho e azul-marinho com o mesmo peso, ocupando lados
// opostos e se encontrando no centro. O marinho é escuro de verdade
// (rgb(12,26,78) e abaixo) — azul claro aqui lava a composição.
// As paradas terminam em alpha 0 da MESMA cor: usar `transparent` faria o
// navegador interpolar por preto e sujar a borda de cinza.
const MESH_A =
  'radial-gradient(42% 46% at 84% 60%, rgba(206,24,28,0.95) 0%, rgba(206,24,28,0) 66%),' +
  'radial-gradient(28% 32% at 96% 78%, rgba(150,12,20,0.9) 0%, rgba(150,12,20,0) 64%),' +
  'radial-gradient(34% 38% at 70% 90%, rgba(122,10,26,0.85) 0%, rgba(122,10,26,0) 68%),' +
  'radial-gradient(44% 48% at 14% 44%, rgba(12,26,78,1) 0%, rgba(12,26,78,0) 68%),' +
  'radial-gradient(34% 38% at 4% 86%, rgba(8,18,58,0.95) 0%, rgba(8,18,58,0) 66%),' +
  'radial-gradient(32% 36% at 34% 6%, rgba(16,32,90,0.85) 0%, rgba(16,32,90,0) 68%)';

const MESH_B =
  'radial-gradient(30% 34% at 68% 54%, rgba(206,24,28,0.6) 0%, rgba(206,24,28,0) 70%),' +
  'radial-gradient(30% 34% at 32% 52%, rgba(16,34,96,0.6) 0%, rgba(16,34,96,0) 70%),' +
  'radial-gradient(22% 26% at 54% 78%, rgba(10,22,68,0.5) 0%, rgba(10,22,68,0) 72%),' +
  'radial-gradient(20% 24% at 48% 26%, rgba(150,12,20,0.45) 0%, rgba(150,12,20,0) 72%)';

export default function Hero() {
  return (
    <section
      id="top"
      style={{
        position: 'relative',
        height: '100vh',
        minHeight: 600,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderBottom: '1px solid var(--linha)',
      }}
    >
      <div style={{ position: 'absolute', inset: 0, background: 'var(--preto-puro)', overflow: 'hidden' }}>
        <div className="mesh" style={{ position: 'absolute', inset: 0, filter: 'blur(52px)', backgroundColor: 'var(--preto-puro)', backgroundImage: MESH_A }} />
        <div className="mesh-b" style={{ position: 'absolute', inset: 0, filter: 'blur(70px)', backgroundImage: MESH_B }} />
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(52% 48% at 32% 42%, rgba(3,3,4,0.85) 0%, rgba(3,3,4,0.3) 58%, transparent 82%)' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(3,3,4,0.5) 0%, rgba(3,3,4,0) 30%, rgba(5,5,6,0.25) 76%, rgba(5,5,6,0.9) 100%)' }} />
      </div>

      <div style={{ position: 'relative', textAlign: 'center', padding: '0 32px', pointerEvents: 'none' }}>
        <div
          className="hero-glow"
          style={{
            position: 'absolute',
            left: '50%',
            top: '38%',
            width: 'min(70vw, 560px)',
            aspectRatio: 1,
            transformOrigin: 'center',
            translate: '-50% -50%',
            background: 'radial-gradient(circle, rgba(169,194,209,0.20) 0%, rgba(169,194,209,0.06) 42%, transparent 70%)',
          }}
        />
        <Image
          className="hero-logo"
          src="/assets/logo-iqf.png"
          alt="Liga Insper Quantitative Finance"
          width={396}
          height={184}
          priority
          style={{ width: 'min(72vw, 396px)', height: 'auto', display: 'block', margin: '0 auto 34px' }}
        />
        <p
          className="hero-rise-2 hero-legenda"
          style={{
            margin: 0,
            color: 'rgba(242,242,240,0.78)',
            textTransform: 'uppercase',
          }}
        >
          Liga universitária pioneira em finanças quantitativas no Brasil
        </p>
      </div>
    </section>
  );
}
