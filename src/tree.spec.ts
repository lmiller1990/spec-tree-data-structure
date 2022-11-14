import { it, expect, describe } from "vitest";
import { m, r } from "vitest/dist/index-2f5b6168";
import { aC } from "vitest/dist/types-f302dae9";

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
  return {
    id: "1",
    name: `${p}/${name}.cy.ts`,
    specType: "integration",
    absolute: `/${p}/${name}.cy.ts`,
    baseName: name,
    fileName: name,
    specFileExtension: ".cy.ts",
    fileExtension: ".ts",
    relative: p.length > 0 ? `${p}/${name}.cy.ts` : `${name}.cy.ts`,
  };
}

interface SpecListOptions {
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
  directory: string;
  parent: SpecTreeDirectoryNode
}

type SpecTreeNode = SpecTreeFileNode | SpecTreeDirectoryNode;

const defaults: SpecListOptions = {
  collapsedDirs: [],
  search: "",
};

type DirectoryMap = Map<
  string,
  { node: SpecTreeDirectoryNode; }
>;

function isRootLevelSpec (path: string, parts: string[]) {
  return (parts.length === 0 && path === parts[0])
}

function getDirectories (specs: Spec[], root: SpecTreeDirectoryNode, sep = '/'): DirectoryMap {
  const map: DirectoryMap = new Map()
  const dirNodes: Map<string, SpecTreeDirectoryNode> = new Map()

  map.set('/', { node: root, })
  dirNodes.set('/', root)

  for (const spec of specs) {
    const { path } = splitIntoParts(spec.relative, sep)

    const acc: string[] = []
    const parts = path.split(sep)

    if (isRootLevelSpec(path, parts)) {
      // root level spec
      continue
    }

    for (let i = 0; i < parts.length; i++) {
      acc.push(parts[i])
      const dirName = acc.join(sep)

      if (!dirName) {
        // It is root - we've already got this in the map.
        continue
      }

      const parent = dirNodes.get(acc.slice(0, acc.length - 1).join(sep)) ?? root
      const node: SpecTreeDirectoryNode = {
        type: 'directory',
        relative: dirName,
        name: parts[i],
        parent,
        children: new Set(),
        collapsed: false
      }

      dirNodes.set(dirName, node)
      map.set(acc.join(sep), { node })
    }
  }


  function recursivelyAssignDirectories (node: SpecTreeDirectoryNode) {
    if (node.parent) {
      map.get(node.parent.name)?.node.children.add(node)
      recursivelyAssignDirectories(node.parent)
    } 
  }

  // Next, we assign the children for each directory.
  for (const [childName, childNode] of dirNodes.entries()) {
    recursivelyAssignDirectories(childNode)
  }

  for (const spec of specs) {
    let { name, path } = splitIntoParts(spec.relative, sep)
    path  ||= '/'

    const parent = isRootLevelSpec(spec.relative, path.split(sep)) ? root : map.get(path)?.node

    if (!parent) {
      throw Error(`Could not find directory node with key '${path}'. This should never happen.`)
    }

    const fileNode: SpecTreeFileNode = {
      name,
      type: 'file',
      data: spec,
      directory: path,
      parent
    }

    parent.children.add(fileNode)
  }

  return map
}

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

const filterFileNodes = (node: SpecTreeNode): node is SpecTreeFileNode => node.type === "file";
const filterDirectoryNodes = (node: SpecTreeNode): node is SpecTreeDirectoryNode => node.type === "directory";

  // const rootChildren = Array.from(directories.entries()).reduce<SpecTreeNode[]>((acc, curr) => {
  //   const [key, value] = curr
  //   if (!key.includes('/')) {
  //     return acc.concat(value.node)
  //   }
  //   return acc
  // }, [])


function deriveSpecTree(
  specs: Spec[],
  options: SpecListOptions = defaults
): {
  root: SpecTreeDirectoryNode
  map: DirectoryMap
 } {

  const root: SpecTreeDirectoryNode = {
    type: 'directory',
    relative: '/',
    name: '/',
    parent: null,
    collapsed: false,
    children: new Set()
  }


  const directories = getDirectories(specs, root, '/')

  const rootNode = directories.get('/')?.node

  if (!rootNode) {
   throw Error('Could not find root node')
  }

  return {
    root: rootNode,
    map: directories
  }}

  // directories.set("/", {
  //   node: root,
  //   children: [],
  // });


  // At this point we've got a map of all the directores with their parent.
  // {
  //  '/' => { node: [Object], children: [] },
  //  'cypress' => { node: [Object], children: [] },
  //  'cypress/foo' => { node: [Object], children: [] },
  // }
  // 
  // Where Node is a SpecTreeDirectoryNode.
  // { 
  //   type: 'directory',
  //   name: 'cypress/foo/bar',
  //   parent: {
  //     type: 'directory',
  //     name: 'cypress/foo',
  //     children: [],
  //     collapsed: false
  //     // Note: recursive. 
  //     parent: [object Node] {
  //       type: 'directory,' name: 'cyypress', collapsed: false ... 
  //     }
  //   }
  // }
  // 
  // Now, we need to populate the `children` property.
  // This will be both SpecTreeDirectoryNodes nad SpecTreeFileNodes.

  // for (const [])



  // for (const spec of specs) {
  //   const [name, directory] = splitIntoParts(spec.relative, '/')
  //   const specNode: SpecTreeFileNode = {
  //     type: "file",
  //     name,
  //     spec,
  //     directory
  //   }
  //   directories.get(directory)!.push(specNode)
  // }

  // const parentMap: Map<string, SpecTreeDirectoryNode> = new Map()

  // for (const [directory, children] of directories.entries()) {
  //   const [name, parent] = splitIntoParts(directory, '/') 
  //   if (directory === '/') {
  //     continue
  //   }

  //   const parentDirEntries = directories.get(parent)!

  //   const dirNode : SpecTreeDirectoryNode = {
  //     type: 'directory',
  //     name,
  //     collapsed: false,
  //     parent: null,
  //     id: directory,
  //     children: children.filter(filterFileNodes)
  //   }

  //   parentDirEntries.push(dirNode)
  //   parentMap.set(parent, dirNode)
  // }



  // const numOfSeps = (s: string) => Array.from(s.matchAll(/\//g)).length

  // const dirsByDepth = Array.from(directories.keys()).sort((x, y) => {
  //   const a = numOfSeps(x)
  //   const b = numOfSeps(y)
  //   if (a === b) {
  //     return 0;
  //   } else if (a < b) {
  //     return -1
  //   } else {
  //     return 1
  //   }
  // })

  // let currentRoot: SpecTreeDirectoryNode = rootNode

  // for (const key of dirsByDepth) {
  //   if (key === '/') {
  //     continue
  //   }

  //   const dir = directories.get(key)
  //   if (!dir) {
  //     throw Error(`Did not find ${key} in map. This should never happen.`)
  //   }

  //   const specs = directories.get(key)!.filter(filterFileNodes)
  //   const dirs = directories.get(key)!.filter(filterDirectoryNodes)
  //   // rootNode
  // }

  // return rootNode
// }

const s0 = createSpec("", "smoke");
const s1 = createSpec("cypress/e2e", "foo");
const s2 = createSpec("cypress/e2e/hello", "bar");
const s3 = createSpec("cypress", "q1.cy.ts");
const s4 = createSpec("cypress", "q2.cy.ts");
const s5 = createSpec("cypress/foo/bar/bax/merp", "loz");

describe("deriveSpecTree", () => {
  it("handles a nested spec", () => {
    const actual = deriveSpecTree([
      createSpec("cypress/e2e", "foo")
    ])

    // root is always a single node, path and name is always `/`
    const root = actual.root
    expect(root.name).to.eq('/')
    expect(root.type).to.eq('directory')
    expect(root.parent).to.eq(null)
    expect(root.collapsed).to.eq(false)

    // first level is cypress
    const cypressDir = Array.from(root.children).filter(filterDirectoryNodes)[0]
    expect(cypressDir.name).to.eq('cypress')
    expect(cypressDir.relative).to.eq('cypress')
    expect(Array.from(cypressDir.children).length).to.eq(1)

    // second level is cypress/e2e
    const e2eDir = Array.from(cypressDir.children).filter(filterDirectoryNodes)[0]
    expect(e2eDir.name).to.eq('e2e')
    expect(e2eDir.relative).to.eq('cypress/e2e')
    expect(Array.from(cypressDir.children).length).to.eq(1)

    // finally, the spec
    const fooSpec = Array.from(e2eDir.children).filter(filterFileNodes)[0]
    expect(fooSpec.name).to.eq('foo.cy.ts')
    expect(fooSpec.data.relative).to.eq('cypress/e2e/foo.cy.ts')
    expect(fooSpec.directory).to.eq('cypress/e2e')
    expect(fooSpec.parent.relative).to.eq('cypress/e2e')
  });

  it("handles several nested specs", () => {
    const actual = deriveSpecTree([
      createSpec("cypress", "foo"),
      createSpec("cypress/e2e", "bar"),
      createSpec("cypress/e2e/bar", "qux"),
    ])

    // root is always a single node, path and name is always `/`
    const root = actual.root
    expect(root.name).to.eq('/')
    expect(root.type).to.eq('directory')
    expect(root.parent).to.eq(null)
    expect(root.collapsed).to.eq(false)

    // first level is cypress
    const cypressDir = Array.from(root.children).filter(filterDirectoryNodes)[0]
    expect(cypressDir.name).to.eq('cypress')
    expect(cypressDir.relative).to.eq('cypress')

    // There are two children.
    // 1. cypress/e2e directory
    // 2. cypress/foo.cy.ts
    const cypressChildren = Array.from(cypressDir.children)
    expect(cypressChildren.length).to.eq(2)

    const fooSpec = cypressChildren.filter(filterFileNodes)[0]
    const e2eDir = cypressChildren.filter(filterDirectoryNodes)[0]

    expect(fooSpec.name).to.eq('foo.cy.ts')
    expect(fooSpec.data.relative).to.eq('cypress/foo.cy.ts')
    expect(fooSpec.directory).to.eq('cypress')
    expect(fooSpec.parent.relative).to.eq('cypress')

    expect(e2eDir.name).to.eq('e2e')
    expect(e2eDir.relative).to.eq('cypress/e2e')
    expect(e2eDir.parent).to.eq(cypressDir)
    expect(e2eDir.collapsed).to.eq(false)
  });

  it.only("handles a single spec at the root level", () => {
    // const actual = deriveSpecTree([s3, s4, s1, s2]);
    // const actual = deriveSpecTree([s0, s3, s5]);
    const actual = deriveSpecTree([
      createSpec("", "smoke"),
    ])

    const root = actual.root
    // console.log(root.children[0].children)
    console.log(Array.from(root.children))

    expect(root.name).to.eq('/')
    expect(root.type).to.eq('directory')
    expect(root.parent).to.eq(null)
    expect(root.collapsed).to.eq(false)
    // console.log('chilrdren!!', root.children)
    // expect(root.children).to.have.length(2)

    // const rootDirectorySpec = root.children[0] as SpecTreeFileNode
    // expect(rootDirectorySpec.name).to.eq('smoke.cy.ts')
    // expect(rootDirectorySpec.type).to.eq('file')
    // expect(rootDirectorySpec.data).to.eq(s0)
    // expect(rootDirectorySpec.parent.name).to.eq('/')

  });
});
