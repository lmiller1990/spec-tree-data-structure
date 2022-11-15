import { defineComponent, FunctionalComponent, ref } from "vue";
import {
  createSpec,
  deriveSpecTree,
  SpecTreeDirectoryNode,
  SpecTreeFileNode,
  SpecTreeNode,
} from "./tree";

function makeChild(node: SpecTreeNode) {
  console.log(node.type, node.name);
  return node.type === "directory" ? (
    <Directory node={node} />
  ) : (
    <File node={node} />
  );
}

const Directory: FunctionalComponent<{ node: SpecTreeDirectoryNode }> = (
  props
) => {
  return (
    <>
      <li>{props.node.name}</li>
      <ul>{Array.from(props.node.children).map(makeChild)}</ul>
    </>
  );
};

const File: FunctionalComponent<{ node: SpecTreeFileNode }> = (props) => {
  return <li>{props.node.name}</li>;
};

export const App = defineComponent({
  setup(props) {
    const specs = [
      createSpec("cypress", "s1"),
      createSpec("cypress/d1", "s2"),
      createSpec("cypress/d1/d2", "s3"),
      createSpec("cypress/q2/q3/q4/q5", "s5")
    ];

    const tree = ref(deriveSpecTree(specs));

    return () => (
      <>
        <ul>{makeChild(tree.value.root)}</ul>

        <hr />
        <pre>{JSON.stringify(specs, null, 4)}</pre>
      </>
    );
  },
});
