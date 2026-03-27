export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-brand-primary">404</h1>
        <p className="mt-2 text-sm text-brand-accent">Siden blev ikke fundet</p>
        <a href="/" className="mt-4 inline-block text-sm font-medium text-brand-primary underline">
          Gå til forsiden
        </a>
      </div>
    </div>
  );
}
