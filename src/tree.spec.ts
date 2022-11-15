import { it, expect, describe } from "vitest";
import {
  getAllFileInDirectory,
  createSpec,
  deriveSpecTree,
  filterDirectoryNodes,
  filterFileNodes,
  SpecTreeDirectoryNode,
  Spec,
} from "./tree";

const cypress_s1 = createSpec("cypress", "s1");
const cypress_d1_s2 = createSpec("cypress/d1", "s2");
const cypress_d1_d2_s3 = createSpec("cypress/d1/d2", "s3");
const cypress_q2_q3_q4_q5_s5 = createSpec("cypress/q2/q3/q4/q5", "s5");

describe("getAllFileInDirectory", () => {
  it("gets total files for a given directory", () => {
    function sortForTesting (specs: Spec[]) {
      return specs.sort((x, y) => x.name.length < y.name.length ? 1 : -1);
    }

    const specs = [
      cypress_s1,
      cypress_d1_s2,
      cypress_d1_d2_s3,
      cypress_q2_q3_q4_q5_s5,
    ];

    const { root, map } = deriveSpecTree(specs);
    const { node } = map.get("cypress")!;
    const fileNodes = getAllFileInDirectory(node);
    expect(fileNodes.length).to.eq(4);

    // order is not specified, user needs to sort it out.
    expect(sortForTesting(specs)).to.eql(sortForTesting(fileNodes.map(x => x.data)))
  });
});

function array<T>(list: Set<T> | Map<string, T>):T [] {
  return Array.from(list.values());
}

describe("deriveSpecTree", () => {
  it('works for deeply nested specs', () => {
    const specs = [
      cypress_s1,
      cypress_d1_s2,
      cypress_q2_q3_q4_q5_s5,
    ];

    const { root, map } = deriveSpecTree(specs);

    // only child should be `cypress`
    console.log(root.children)
    expect(array(root.children).length).to.eq(1)
  })

  it("handles a nested spec", () => {
    const actual = deriveSpecTree([createSpec("cypress/e2e", "foo")]);

    // root is always a single node, path and name is always `/`
    const root = actual.root;
    expect(root.name).to.eq("/");
    expect(root.type).to.eq("directory");
    expect(root.parent).to.eq(null);
    expect(root.collapsed).to.eq(false);

    // first level is cypress
    const cypressDir = array(root.children).filter(
      filterDirectoryNodes
    )[0];
    expect(cypressDir.name).to.eq("cypress");
    expect(cypressDir.relative).to.eq("cypress");
    expect(array(cypressDir.children).length).to.eq(1);

    // second level is cypress/e2e
    const e2eDir = array(cypressDir.children).filter(
      filterDirectoryNodes
    )[0];
    expect(e2eDir.name).to.eq("e2e");
    expect(e2eDir.relative).to.eq("cypress/e2e");
    expect(array(cypressDir.children).length).to.eq(1);

    // finally, the spec
    const fooSpec = array(e2eDir.children).filter(filterFileNodes)[0];
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
    const cypressDir = array(root.children).filter(
      filterDirectoryNodes
    )[0];
    expect(cypressDir.name).to.eq("cypress");
    expect(cypressDir.relative).to.eq("cypress");

    // There are two children.
    // 1. cypress/e2e directory
    // 2. cypress/foo.cy.ts
    const cypressChildren = array(cypressDir.children);
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

  const s0 = createSpec("", "smoke");
  const s1 = createSpec("cypress/e2e", "foo");
  const s2 = createSpec("cypress/e2e/hello", "bar");
  const s3 = createSpec("cypress", "q1");
  const s4 = createSpec("cypress", "q2");
  const s5 = createSpec("cypress/foo/bar/bax/merp", "loz");

  it("works with nested directores", () => {
    const actual = deriveSpecTree([
      createSpec("cypress", "s1"),
      createSpec("cypress/d1", "s2"),
      createSpec("cypress/d1/d2", "s3"),
    ]);

    // only child is directory `cypress`
    const rootChildren = array(actual.root.children);
    expect(rootChildren.length).to.eq(1);
    expect(rootChildren[0].type).to.eq("directory");
    expect(rootChildren[0].name).to.eq("cypress");

    const cypressNode = rootChildren[0] as SpecTreeDirectoryNode;
    const cypressChildrenFiles = array(cypressNode.children).filter(
      filterFileNodes
    );
    const cypressChildrenDirs = array(cypressNode.children).filter(
      filterDirectoryNodes
    );

    expect(cypressChildrenFiles.length).to.eq(1);
    expect(cypressChildrenDirs.length).to.eq(1);
    expect(cypressChildrenFiles[0].name).to.eq("s1.cy.ts");
    expect(cypressChildrenDirs[0].name).to.eq("d1");

    const d1 = cypressChildrenDirs[0];
    const d1Children = array(d1.children);
    expect(d1Children.length).to.eq(2);

    const d1_specs = d1Children.filter(filterFileNodes);
    const d1_dirs = d1Children.filter(filterDirectoryNodes);
    expect(d1_specs[0].name).to.eq("s2.cy.ts");
    expect(d1_specs[0].parent.name).to.eq("d1");
    expect(d1_specs[0].parent.relative).to.eq("cypress/d1");
    expect(d1_dirs[0].name).to.eq("d2");
    expect(d1_dirs[0].parent?.name).to.eq("d1");
    expect(d1_dirs[0].parent?.relative).to.eq("cypress/d1");

    const d2 = d1_dirs[0];
    const d2Children = array(d2.children);
    expect(d2Children.length).to.eq(1);

    const d2_specs = d2Children.filter(filterFileNodes);
    const d2_dirs = d2Children.filter(filterDirectoryNodes);
    expect(d2_specs[0].name).to.eq("s3.cy.ts");
    expect(d2_specs[0].parent.name).to.eq("d2");
    expect(d2_specs[0].parent.relative).to.eq("cypress/d1/d2");

    // no more directories nested, d2 is the bottom one.
    expect(d2_dirs.length).to.eq(0);
  });

  it("works with many files", () => {
    const actual = deriveSpecTree([
      createSpec("cypress", "q1"),
      createSpec("cypress", "q2"),
    ]);
    // only child is directory `cypress`
    const rootChildren = array(actual.root.children);
    expect(rootChildren.length).to.eq(1);
    expect(rootChildren[0].type).to.eq("directory");
    expect(rootChildren[0].name).to.eq("cypress");

    const cypressNode = rootChildren[0] as SpecTreeDirectoryNode;
    const cypressChildrenFiles = array(cypressNode.children).filter(
      filterFileNodes
    );
    const cypressChildrenDirs = array(cypressNode.children).filter(
      filterDirectoryNodes
    );

    expect(cypressChildrenFiles.length).to.eq(2);
    expect(cypressChildrenDirs.length).to.eq(0);
    expect(cypressChildrenFiles[0].name).to.eq("q1.cy.ts");
    expect(cypressChildrenFiles[1].name).to.eq("q2.cy.ts");
  });

  it("handles a single spec at the root level", () => {
    const actual = deriveSpecTree([createSpec("", "smoke")]);

    const root = actual.root;
    expect(root.name).to.eq("/");
    expect(root.type).to.eq("directory");
    expect(root.parent).to.eq(null);
    expect(root.collapsed).to.eq(false);

    const children = array(root.children);
    expect(children.length).to.eq(1);

    const fooSpec = children.filter(filterFileNodes)[0];
    expect(fooSpec.name).to.eq("smoke.cy.ts");
    expect(fooSpec.data.relative).to.eq("smoke.cy.ts");
    expect(fooSpec.parent.relative).to.eq("/");
  });

  it("handles search", () => {
    const cypress_e2e_foo = createSpec("cypress/e2e", "foo");
    const cypress_e2e_bar = createSpec("cypress/e2e", "bar");
    const cypress_component_qux = createSpec("cypress/component", "qux");
    const actual = deriveSpecTree(
      [cypress_e2e_foo, cypress_e2e_bar, cypress_component_qux],
      {
        search: "qux",
      }
    );

    // cypress directory
    const rootChildren = array(actual.root.children);
    expect(rootChildren.length).to.eq(1);
    expect(rootChildren[0].name).to.eq("cypress");

    // grab the only directory, which should be `component`
    // since nothing in the other two specs matches the search term
    const dirs = array(
      (rootChildren[0] as SpecTreeDirectoryNode).children
    ).filter(filterDirectoryNodes);

    expect(dirs.length).to.eq(1);

    const componentDir = dirs[0];
    expect(componentDir.name).to.eq("component");

    // Should be qux
    expect(array(componentDir.children).length).to.eq(1);
    const quxSpec = array(componentDir.children).filter(
      filterFileNodes
    )[0];
    expect(quxSpec.name).to.eq("qux.cy.ts");
    expect(quxSpec.data).to.eq(cypress_component_qux);
  });
});
