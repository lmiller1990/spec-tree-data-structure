import { computed, defineComponent, FunctionalComponent, reactive, ref } from "vue";
import {
  createSpec,
  deriveSpecTree,
  getAllFileInDirectory,
  SpecListOptions,
  SpecTreeDirectoryNode,
  SpecTreeFileNode,
  SpecTreeNode,
} from "./tree";
import "./style.css";

type HandleCollapse = (node: SpecTreeDirectoryNode) => void

function makeChild(node: SpecTreeNode, handleCollapse: HandleCollapse) {
  return node.type === "directory" ? (
    <Directory node={node} handleCollapse={handleCollapse} />
  ) : (
    <File node={node} />
  );
}

const Directory: FunctionalComponent<{
  node: SpecTreeDirectoryNode;
  handleCollapse: HandleCollapse
}> = (props) => {
  const specs = getAllFileInDirectory(props.node);
  const names = specs.map(
    (x) => `${x.data.fileName}${x.data.specFileExtension}`
  );

  const icon = props.node.collapsed ? '>' : 'v'

  return (
    <>
      <li>
        <span class="directory-name">{props.node.name}</span>
        <button onClick={() => props.handleCollapse(props.node)}>{icon}</button>
        <span class="light">
          (Contains {specs.length} specs:{" "}
          <span class="lighter">{names.join(", ")}</span>)
        </span>
      </li>
      {!props.node.collapsed && (
        <ul>
          {Array.from(props.node.children).map((child) =>
            makeChild(child, props.handleCollapse)
          )}
        </ul>
      )}
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

    const opts = reactive<SpecListOptions>({
      sep: '/',
      search: '',
      collapsedDirs: new Set()
    });

    const handleCollapse: HandleCollapse = (node) => {
      const contained = opts.collapsedDirs.has(node.relative)
      if (contained) {
        // remove
        opts.collapsedDirs = new Set(
          [...opts.collapsedDirs.values()].filter((x) => x !== node.relative)
        );
      } else {
        opts.collapsedDirs = new Set([
          ...opts.collapsedDirs.values(),
          node.relative,
        ]);
      }
    }

    setTimeout(() => {
    }, 1000)

    const tree = computed(() => {
      return deriveSpecTree(specs, { collapsedDirs: opts.collapsedDirs });
    });

    return () => (
      <>
        <ul>{makeChild(tree.value.root, handleCollapse)}</ul>

        <hr />
        {/* <pre>{JSON.stringify(specs, null, 4)}</pre> */}
      </>
    );
  },
});
