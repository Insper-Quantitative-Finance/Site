import { redirect } from 'next/navigation';

/**
 * A gestão de projetos virou a própria página do projeto.
 *
 * Esta rota só existe para não quebrar link salvo nem atalho de quem já
 * usava /membros/gestao/projetos. A vitrine do site agora é uma aba dentro
 * de cada projeto, visível para a presidência e o diretor de projetos.
 */
export default function ProjetosDaGestao() {
  redirect('/membros/projetos');
}
