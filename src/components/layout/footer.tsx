export function Footer() {
  return (
    <footer className="border-t border-border bg-surface py-12">
      <div className="mx-auto max-w-6xl px-4">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
          {/* Brand */}
          <div>
            <h3 className="text-lg font-bold text-brand-primary">Dilling</h3>
            <p className="mt-2 text-sm text-brand-accent">
              Naturlige materialer siden 1916. Dansk kvalitet fra Bredsten.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-sm font-semibold text-foreground">Information</h4>
            <ul className="mt-2 space-y-1 text-sm text-brand-accent">
              <li>Om Dilling</li>
              <li>Bæredygtighed</li>
              <li>Levering</li>
              <li>Returret</li>
              <li>Vaskevejledning</li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-sm font-semibold text-foreground">Kontakt</h4>
            <ul className="mt-2 space-y-1 text-sm text-brand-accent">
              <li>Kundeservice</li>
              <li>Størrelsesguide</li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-border pt-8 text-center text-xs text-brand-accent">
          &copy; {new Date().getFullYear()} Dilling. Alle rettigheder forbeholdes.
        </div>
      </div>
    </footer>
  );
}
