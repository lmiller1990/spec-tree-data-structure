import {
  computed,
  defineComponent,
  FunctionalComponent,
  reactive,
  ref,
} from "vue";
import {
  array,
  createSpec,
  deriveSpecTree,
  filterFileNodes,
  getAllFileInDirectory,
  groupSpecTreeNodes,
  SpecListOptions,
  SpecTreeDirectoryNode,
  SpecTreeFileNode,
  SpecTreeNode,
} from "./tree";
import "./style.css";

type HandleCollapse = (node: SpecTreeDirectoryNode) => void;

const Directory: FunctionalComponent<{
  node: SpecTreeDirectoryNode;
  handleCollapse: HandleCollapse;
}> = (props) => {
  const fileList = getAllFileInDirectory(props.node);
  const names = fileList.map(
    (x) => `${x.data.fileName}${x.data.specFileExtension}`
  );

  const { files, directories } = groupSpecTreeNodes(props.node);

  const icon = props.node.collapsed ? ">" : "v";

  return (
    <>
      <li>
        <span class="directory-name">{props.node.name}</span>
        <button onClick={() => props.handleCollapse(props.node)}>{icon}</button>
        <span class="light">
          (Contains {fileList.length} specs:{" "}
          <span class="lighter">{names.join(", ")}</span>)
        </span>
      </li>
      {!props.node.collapsed && (
        <>
          <ul>
            {files.map((file) => (
              <File node={file} />
            ))}
            {directories.map((child) => (
              <Directory node={child} handleCollapse={props.handleCollapse} />
            ))}
          </ul>
        </>
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
      createSpec("cypress/q2/q3/q4/q5", "s5"),
      // createSpec("cypress", "s1"),
      // createSpec("cypress/d1", "s2"),
      // createSpec("cypress/d1/d2", "s3"),
      // createSpec("cypress/q2/q3/q4/q5", "s5")
    ];

    const opts = reactive<SpecListOptions>({
      sep: "/",
      search: "",
      collapsedDirs: new Set(),
    });

    const handleCollapse: HandleCollapse = (node) => {
      const contained = opts.collapsedDirs.has(node.relative);
      if (contained) {
        // remove
        opts.collapsedDirs = new Set(
          [...opts.collapsedDirs.values()].filter((x) => x !== node.relative)
        );
      } else {
        // add
        opts.collapsedDirs = new Set([
          ...opts.collapsedDirs.values(),
          node.relative,
        ]);
      }
    };

    const tree = computed(() => {
      return deriveSpecTree(specs, opts);
    });

    return () => (
      <>
        <input
          value={opts.search}
          placeholder="Search..."
          onInput={(event) =>
            (opts.search = (event.currentTarget as HTMLInputElement).value)
          }
        />
        <ul>
          <Directory node={tree.value.root} handleCollapse={handleCollapse} />
        </ul>

        <hr />
        <h4>Debugging: specs</h4>
        <pre>{JSON.stringify(specs, null, 4)}</pre>
      </>
    );
  },
});
