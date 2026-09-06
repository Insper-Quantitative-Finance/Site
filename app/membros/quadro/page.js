import { CARGOS, ehGestao, rotuloCargo } from '@/lib/cargos';
import { criarClienteServidor } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Quadro de membros · IQF' };

export default async function Quadro() {
  const supabase = criarClienteServidor();
  const { data: membros } = await supabase
    .from('profiles')
    .select('id, nome, email, cargo, area, turma, linkedin, ativo')
    .eq('ativo', true)
    .order('nome');

  // Ordena por hierarquia: presidência, diretoria, membros, trainees.
  const ordenados = [...(membros ?? [])].sort(
    (a, b) => (CARGOS[b.cargo]?.nivel ?? 0) - (CARGOS[a.cargo]?.nivel ?? 0) || a.nome.localeCompare(b.nome),
  );

  return (
    <div style={{ display: 'grid', gap: 32 }}>
      <div>
        <div className="eyebrow" style={{ marginBottom: 16 }}>Quadro</div>
        <h1 style={{ fontSize: 38, lineHeight: 1.1, marginBottom: 12 }}>Membros da liga</h1>
        <p style={{ color: 'var(--texto-3)', margin: 0 }}>
          {ordenados.length} {ordenados.length === 1 ? 'pessoa ativa' : 'pessoas ativas'}.
        </p>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="tabela">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Cargo</th>
              <th>Frente</th>
              <th>Turma</th>
              <th>Contato</th>
            </tr>
          </thead>
          <tbody>
            {ordenados.map((m) => (
              <tr key={m.id}>
                <td style={{ color: 'var(--osso)' }}>{m.nome}</td>
                <td>
                  <span className={`selo ${ehGestao(m.cargo) ? 'selo--gestao' : ''}`}>{rotuloCargo(m.cargo)}</span>
                </td>
                <td>{m.area || '—'}</td>
                <td>{m.turma || '—'}</td>
                <td>
                  <div style={{ display: 'grid', gap: 4 }}>
                    <a href={`mailto:${m.email}`}>{m.email}</a>
                    {m.linkedin && (
                      <a href={m.linkedin} target="_blank" rel="noopener" style={{ color: 'var(--azul)', fontSize: 13 }}>
                        LinkedIn
                      </a>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {ordenados.length === 0 && (
        <div className="painel" style={{ color: 'var(--texto-3)' }}>Nenhum membro ativo cadastrado ainda.</div>
      )}
    </div>
  );
}
