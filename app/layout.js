import './fontes.css';
import './globals.css';

export const metadata = {
  title: 'Insper Quantitative Finance',
  description:
    'Liga de finanças quantitativas do Insper: projetos próprios, competições e conexão direta com o mercado sistemático.',
  icons: { icon: '/favicon.png' },
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
