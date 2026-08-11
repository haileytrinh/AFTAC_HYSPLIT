// Helper function to check if a node is a container (Document or Folder)
export function isContainer(node: Element): boolean {
  return node.tagName === "Document" || node.tagName === "Folder";
}

// Helper function to get the root/top-level KML Document
export function getTopDocument(kmlDOM: Document): Element | null {
  const root = kmlDOM.documentElement;

  return (
    (Array.from(root.children).find(
      (child) => child.tagName === "Document"
    ) as Element | undefined) || null
  );
}

// Helper function to get only the direct container children of a node
export function getDirectContainerChildren(node: Element): Element[] {
  return Array.from(node.children).filter((child) =>
    isContainer(child as Element)
  ) as Element[];
}

// Helper function to get the display name of a Document/Folder node
export function getDocumentName(node: Element): string {
  const nameElement = node.querySelector(":scope > name");
  const raw = nameElement?.textContent?.trim() || "Unnamed";
  return raw.replace(/<\/?pre>/gi, "").trim();
}

// Helper function to determine whether a node is a timestamp document/folder
export function isTimestampDoc(node: Element): boolean {
  const name = getDocumentName(node).toLowerCase();
  return name.includes("concentration") && name.includes("valid:");
}

// DFS algorithm to find all selectable atmosphere-level documents in a KML DOM tree
export function findLevelDocuments(kmlDOM: Document): Element[] {
  const top = getTopDocument(kmlDOM);
  if (!top) return [];

  const result: Element[] = [];

  // DFS recursive function to traverse the KML DOM tree
  function dfs(node: Element) {
    const children = getDirectContainerChildren(node);
    if (children.length === 0) return;

    // this node is a selectable level document if its direct children
    // look like timestamp concentration folders/documents
    const hasTimestampChildren = children.some((child) => isTimestampDoc(child));

    if (hasTimestampChildren) {
      result.push(node);
      return;
    }

    // continue dfs on children
    for (const child of children) {
      dfs(child);
    }
  }

  dfs(top);
  return result;
}