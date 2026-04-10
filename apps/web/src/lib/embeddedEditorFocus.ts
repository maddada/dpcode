export function isProjectEditorPathname(pathname: string): boolean {
  return /^\/project\/[^/]+\/editor(?:\/)?$/.test(pathname);
}

export function isEmbeddedEditorFocused(doc: Document = document): boolean {
  return doc.activeElement instanceof HTMLIFrameElement;
}
