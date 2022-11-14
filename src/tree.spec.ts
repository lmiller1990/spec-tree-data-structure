import { it, expect, describe } from "vitest";

interface Spec {
  id: string;
  name: string;
  specType: string;
  absolute: string;
  baseName: string;
  fileName: string;
  specFileExtension: string;
  fileExtension: string;
  relative: string;
}

function createSpec(p: string, name: string): Spec {
  const prefix = p.length > 0 ? `${p}/` : ``;

  return {
    id: "1",
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

interface SpecListOptions {
  sep: string
  search?: string;
  collapsedDirs?: string[];
}

interface SpecTreeBaseNode {
  name: string;
}

interface SpecTreeDirectoryNode extends SpecTreeBaseNode {
  type: "directory";
  relative: string;
  parent: SpecTreeDirectoryNode | null;
  children: Set<SpecTreeNode>;
  collapsed: boolean;
}

interface SpecTreeFileNode extends SpecTreeBaseNode {
  type: "file";
  data: Spec;
  parent: SpecTreeDirectoryNode;
}

type SpecTreeNode = SpecTreeFileNode | SpecTreeDirectoryNode;

const defaults: SpecListOptions = {
  collapsedDirs: [],
  search: "",
  sep: '/'
};

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

function filterFileNodes(node: SpecTreeNode): node is SpecTreeFileNode {
  return node.type === "file";
}

function filterDirectoryNodes(
  node: SpecTreeNode
): node is SpecTreeDirectoryNode {
  return node.type === "directory";
}


function isRootLevelSpec(path: string, parts: string[]) {
  return parts.length === 1 && path === parts[0];
}

function deriveSpecTree(
  specs: Spec[],
  options: SpecListOptions = defaults
): {
  root: SpecTreeDirectoryNode;
  map: DirectoryMap;
} {
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
    const { path } = splitIntoParts(spec.relative, options.sep);

    const acc: string[] = [];
    const parts = path.split(options.sep);

    // Root level spec - no such directory to add, root is already added.
    if (isRootLevelSpec(path, parts)) {
      continue;
    }

    for (let i = 0; i < parts.length; i++) {
      acc.push(parts[i]);
      const dirName = acc.join(options.sep);

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

      const n = acc.slice(0, acc.length - 1).join(options.sep);
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
      map.set(acc.join(options.sep), { node });
    }
  }

  const recursivelyAssignDirectories = (node: SpecTreeDirectoryNode) => {
    if (node.parent) {
      map.get(node.parent.name)?.node.children.add(node);
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
    let { name, path } = splitIntoParts(spec.relative, options.sep);
    path ||= "/";

    const parent = isRootLevelSpec(spec.relative, path.split(options.sep))
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

const s0 = createSpec("", "smoke");
const s1 = createSpec("cypress/e2e", "foo");
const s2 = createSpec("cypress/e2e/hello", "bar");
const s3 = createSpec("cypress", "q1.cy.ts");
const s4 = createSpec("cypress", "q2.cy.ts");
const s5 = createSpec("cypress/foo/bar/bax/merp", "loz");

describe("deriveSpecTree", () => {
  it("handles a nested spec", () => {
    const actual = deriveSpecTree([createSpec("cypress/e2e", "foo")]);

    // root is always a single node, path and name is always `/`
    const root = actual.root;
    expect(root.name).to.eq("/");
    expect(root.type).to.eq("directory");
    expect(root.parent).to.eq(null);
    expect(root.collapsed).to.eq(false);

    // first level is cypress
    const cypressDir = Array.from(root.children).filter(
      filterDirectoryNodes
    )[0];
    expect(cypressDir.name).to.eq("cypress");
    expect(cypressDir.relative).to.eq("cypress");
    expect(Array.from(cypressDir.children).length).to.eq(1);

    // second level is cypress/e2e
    const e2eDir = Array.from(cypressDir.children).filter(
      filterDirectoryNodes
    )[0];
    expect(e2eDir.name).to.eq("e2e");
    expect(e2eDir.relative).to.eq("cypress/e2e");
    expect(Array.from(cypressDir.children).length).to.eq(1);

    // finally, the spec
    const fooSpec = Array.from(e2eDir.children).filter(filterFileNodes)[0];
    expect(fooSpec.name).to.eq("foo.cy.ts");
    expect(fooSpec.data.relative).to.eq("cypress/e2e/foo.cy.ts");
    expect(fooSpec.parent.relative).to.eq("cypress/e2e");
  });

  it("handles several nested specs", () => {
    const actual = deriveSpecTree([
      createSpec("cypress", "foo"),
      createSpec("cypress/e2e", "bar"),
      createSpec("cypress/e2e/bar", "qux"),
    ]);

    // root is always a single node, path and name is always `/`
    const root = actual.root;
    expect(root.name).to.eq("/");
    expect(root.type).to.eq("directory");
    expect(root.parent).to.eq(null);
    expect(root.collapsed).to.eq(false);

    // first level is cypress
    const cypressDir = Array.from(root.children).filter(
      filterDirectoryNodes
    )[0];
    expect(cypressDir.name).to.eq("cypress");
    expect(cypressDir.relative).to.eq("cypress");

    // There are two children.
    // 1. cypress/e2e directory
    // 2. cypress/foo.cy.ts
    const cypressChildren = Array.from(cypressDir.children);
    expect(cypressChildren.length).to.eq(2);

    const fooSpec = cypressChildren.filter(filterFileNodes)[0];
    const e2eDir = cypressChildren.filter(filterDirectoryNodes)[0];

    expect(fooSpec.name).to.eq("foo.cy.ts");
    expect(fooSpec.data.relative).to.eq("cypress/foo.cy.ts");
    expect(fooSpec.parent.relative).to.eq("cypress");

    expect(e2eDir.name).to.eq("e2e");
    expect(e2eDir.relative).to.eq("cypress/e2e");
    expect(e2eDir.parent).to.eq(cypressDir);
    expect(e2eDir.collapsed).to.eq(false);
  });

  it("handles a single spec at the root level", () => {
    // const actual = deriveSpecTree([s3, s4, s1, s2]);
    // const actual = deriveSpecTree([s0, s3, s5]);
    const actual = deriveSpecTree([createSpec("", "smoke")]);

    const root = actual.root;
    expect(root.name).to.eq("/");
    expect(root.type).to.eq("directory");
    expect(root.parent).to.eq(null);
    expect(root.collapsed).to.eq(false);

    const children = Array.from(root.children);
    expect(children.length).to.eq(1);
    const fooSpec = children.filter(filterFileNodes)[0];
    expect(fooSpec.name).to.eq("smoke.cy.ts");
    expect(fooSpec.data.relative).to.eq("smoke.cy.ts");
    expect(fooSpec.parent.relative).to.eq("/");
  });
});
