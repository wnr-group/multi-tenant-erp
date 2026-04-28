export function NoSectionPrompt() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card p-12 text-center">
      <p className="text-lg font-medium text-foreground">No section selected</p>
      <p className="mt-2 text-sm text-muted-foreground">
        Use the section switcher in the sidebar to pick a class and section.
      </p>
    </div>
  );
}
