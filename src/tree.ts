export interface Spec {
  name: string;
  specType: string;
  absolute: string;
  baseName: string;
  fileName: string;
  specFileExtension: string;
  fileExtension: string;
  relative: string;
}

export interface SpecListOptions {
  sep?: string
  search?: string;
  collapsedDirs?: string[];
}

export interface SpecTreeDirectoryNode {
  name: string;
  type: "directory";
  relative: string;
  parent: SpecTreeDirectoryNode | null;
  children: Set<SpecTreeNode>;
  collapsed: boolean;
}

export interface SpecTreeFileNode {
  type: "file";
  name: string;
  data: Spec;
  parent: SpecTreeDirectoryNode;
}

export type SpecTreeNode = SpecTreeFileNode | SpecTreeDirectoryNode;

type DirectoryMap = Map<string, { node: SpecTreeDirectoryNode }>;

function splitIntoParts(
  path: string,
  sep: string
): { name: string; path: string } {
  if (!path.includes(sep)) {
    return { name: path, path };
  }

  const idx = path.lastIndexOf(sep);

  const name = path.slice(idx + 1);
  const p = path.slice(0, idx);
  return { name, path: p };
}

export function filterFileNodes(node: SpecTreeNode): node is SpecTreeFileNode {
  return node.type === "file";
}

export function filterDirectoryNodes(
  node: SpecTreeNode
): node is SpecTreeDirectoryNode {
  return node.type === "directory";
}


function isRootLevelSpec(path: string, name: string) {
  return path === name
}

export function deriveSpecTree(
  allSpecs: Spec[],
  options?: Partial<SpecListOptions>
): {
  root: SpecTreeDirectoryNode;
  map: DirectoryMap;
} {
  const sep = options?.sep ?? "/";
  const search = options?.search ?? null;
  const specs = search
    ? allSpecs.filter((x) => x.relative.includes(search))
    : allSpecs;

  const root: SpecTreeDirectoryNode = {
    type: "directory",
    relative: "/",
    name: "/",
    parent: null,
    collapsed: false,
    children: new Set(),
  };


  const map: DirectoryMap = new Map();
  const dirNodes: Map<string, SpecTreeDirectoryNode> = new Map();

  map.set("/", { node: root });
  dirNodes.set("/", root);

  // Derive all the directories based on the specs.
  for (const spec of specs) {
    const { path, name } = splitIntoParts(spec.relative, sep);

    const acc: string[] = [];
    const parts = path.split(sep);

    // Root level spec - no such directory to add, root is already added.
    const isRootSpec = isRootLevelSpec(path, name)

    if (isRootSpec) {
      continue;
    }

    for (let i = 0; i < parts.length; i++) {
      acc.push(parts[i]);
      const dirName = acc.join(sep);

      // Since we add each directory in a depth first fashion,
      // the "parent" will always exist, except in the case of directores
      // under `/`, in which case we just default to root.
      // eg for `cypress/e2e/foo.cy.ts
      //
      // Loop 0: n=undefined, dirName=cypress
      // -> n=undefined, so use root as `parent`
      // -> dirNodes.set("cypress", {...})
      //
      // Loop 1: dirName="cypress"
      // -> parent = dirNodes.get("cypress") // exists!
      // currentDir.parent = parent
      // ... etc ...

      const n = acc.slice(0, acc.length - 1).join(sep);
      const existing = dirNodes.get(n);
      const parent = existing ?? root;

      const node: SpecTreeDirectoryNode = {
        type: "directory",
        relative: dirName,
        name: parts[i],
        parent,
        children: new Set(),
        collapsed: false,
      };

      dirNodes.set(dirName, node);
      map.set(acc.join(sep), { node });
    }
  }

  const recursivelyAssignDirectories = (node: SpecTreeDirectoryNode) => {
    if (node.parent) {
      map.get(node.parent.relative)?.node.children.add(node);
      recursivelyAssignDirectories(node.parent);
    }
  };

  // Next, we assign the children directories for each directory.
  // We recurse *up* until parent is null, which means which reached the root.
  // Mutating becuase it's way faster and easier to grok.
  for (const childNode of dirNodes.values()) {
    recursivelyAssignDirectories(childNode);
  }

  // Add specs to directory's children.
  for (const spec of specs) {
    let { name, path } = splitIntoParts(spec.relative, sep);
    path ||= "/";

    const parent = isRootLevelSpec(spec.relative, name)
      ? root
      : map.get(path)?.node;
    
    if (!parent) {
      throw Error(
        `Could not find directory node with key '${path}'. This should never happen.`
      );
    }

    // Finally, add the spec to the correct directory.
    const fileNode: SpecTreeFileNode = {
      name,
      type: "file",
      data: spec,
      parent,
    };

    parent.children.add(fileNode);
  }

  const rootNode = map.get("/")?.node;

  if (!rootNode) {
    throw Error("Could not find root node");
  }

  return {
    root: rootNode,
    map,
  };
}

export function createSpec(p: string, name: string): Spec {
  const prefix = p.length > 0 ? `${p}/` : ``;

  return {
    name: `${prefix}${name}.cy.ts`,
    specType: "integration",
    absolute: `/${prefix}${name}.cy.ts`,
    baseName: name,
    fileName: name,
    specFileExtension: ".cy.ts",
    fileExtension: ".ts",
    relative: `${prefix}${name}.cy.ts`,
  };
}

function findNodeByRelativePath (relativePath: string, tree: SpecTreeDirectoryNode): SpecTreeDirectoryNode {
  function walk(nodes: SpecTreeDirectoryNode[]): SpecTreeDirectoryNode[] {
    const theNode = nodes.find(x => x.relative === relativePath)
    if (theNode) {
      // console.log('asdfas', theNode)
      return [theNode]
    }

    return nodes
      .filter(filterDirectoryNodes)
      .map((node) => {
        const dirs = Array.from(node.children).filter(filterDirectoryNodes)
        // console.log(relativePath, dirs.map(x => x.relative))
        return walk(dirs)
      })
      .flat();
  }

  const found = walk(Array.from(tree.children).filter(filterDirectoryNodes))
  if (found) {
    return found[0]
  }
  // return walk(node, tree)

  throw Error('Could not find node in tree.')
}

export function getAllFileInDirectory(node: SpecTreeDirectoryNode): SpecTreeFileNode[] {
  const files: SpecTreeFileNode[] = []

  function walk (node: SpecTreeNode) {
    if (node.type === 'file') {
      files.push(node)
    } else {
      // continue...
      Array.from(node.children).map(walk)
    }
  }

  walk(node)

  return files
}

const s0 = createSpec("", "smoke");
const s1 = createSpec("cypress/e2e", "foo");
const s2 = createSpec("cypress/e2e/hello", "bar");
const s3 = createSpec("cypress", "q1");
const s4 = createSpec("cypress", "q2");
const s5 = createSpec("cypress/foo/bar/bax/merp", "loz");

export const specs = [s0, s1, s2, s3, s4, s5];