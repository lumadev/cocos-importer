import { useCallback, useState } from "react";
import {
  pickProjectDirectory,
  readProjectFiles,
  supportsDirectoryPicker,
} from "./importer";
import { buildIndex } from "./indexBuilder";
import {
  listWorkspaces,
  saveDirHandle,
  saveIndex,
  saveWorkspace,
  loadDirHandle,
} from "./storage";
import type { Workspace } from "./types";

export interface ImportState {
  busy: boolean;
  message: string;
}

export function useProjectImport() {
  const [state, setState] = useState<ImportState>({ busy: false, message: "" });

  const run = useCallback(
    async (
      handle: FileSystemDirectoryHandle,
      existing?: Workspace,
      nameOverride?: string,
    ): Promise<Workspace> => {
      setState({ busy: true, message: "Lendo arquivos do projeto..." });
      const files = await readProjectFiles(handle, ({ scanned, current }) =>
        setState({
          busy: true,
          message: `Lendo ${scanned} arquivos — ${current}`,
        }),
      );
      setState({
        busy: true,
        message: `Gerando índice de ${files.length} arquivos...`,
      });
      // Yield so the progress paints before the (synchronous) build.
      await new Promise((r) => setTimeout(r, 20));
      const index = buildIndex(files, {
        projectName: nameOverride?.trim() || existing?.name || handle.name,
        rootPath: existing?.path ?? handle.name,
      });
      const id = existing?.id ?? `${handle.name}-${Date.now().toString(36)}`;
      const workspace: Workspace = {
        id,
        name: index.projectName,
        path: index.rootPath,
        lastImportedAt: index.createdAt,
        indexFile: `${index.rootPath}/project-index.json`,
        entityCount: index.entities.length,
      };
      await saveIndex(id, index);
      await saveDirHandle(id, handle).catch(() => undefined);
      saveWorkspace(workspace);
      setState({ busy: false, message: "" });
      return workspace;
    },
    [],
  );

  const pickDirectory = useCallback(async () => {
    if (!supportsDirectoryPicker()) throw new Error("unsupported");
    return pickProjectDirectory();
  }, []);

  const importNew = useCallback(async () => {
    const handle = await pickDirectory();
    return run(handle);
  }, [run, pickDirectory]);

  const refresh = useCallback(
    async (workspace: Workspace) => {
      let handle = await loadDirHandle(workspace.id).catch(() => undefined);
      if (handle) {
        const permission = await (
          handle as unknown as {
            requestPermission: (o: {
              mode: string;
            }) => Promise<PermissionState>;
          }
        ).requestPermission({ mode: "read" });
        if (permission !== "granted") handle = undefined;
      }
      if (!handle) handle = await pickProjectDirectory();
      return run(handle, workspace);
    },
    [run],
  );

  return {
    state,
    pickDirectory,
    run,
    importNew,
    refresh,
    workspaces: listWorkspaces,
  };
}
