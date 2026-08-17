/**
 * Camada de fundo decorativa: três blobs coloridos, borrados e em movimento lento.
 * Fica atrás de todo o conteúdo (z-index negativo, pointer-events desativado),
 * dando a atmosfera "colorida/vibrante" sem interferir na leitura ou no toque.
 */
export default function BackgroundBlobs() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      <div className="absolute -top-32 -left-24 h-72 w-72 sm:h-96 sm:w-96 rounded-full bg-violet-400/25 blur-3xl animate-blob" />
      <div className="absolute top-1/4 -right-24 h-72 w-72 sm:h-96 sm:w-96 rounded-full bg-orange-300/25 blur-3xl animate-blob [animation-delay:4s]" />
      <div className="absolute -bottom-24 left-1/4 h-72 w-72 sm:h-96 sm:w-96 rounded-full bg-fuchsia-300/25 blur-3xl animate-blob [animation-delay:8s]" />
    </div>
  );
}
