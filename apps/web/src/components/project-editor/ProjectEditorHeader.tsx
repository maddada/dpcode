import { type EditorId, type ResolvedKeybindingsConfig } from "@t3tools/contracts";

import { isElectron } from "~/env";
import { DiffIcon, GlobeIcon, TerminalSquareIcon } from "~/lib/icons";
import { SidebarTrigger } from "~/components/ui/sidebar";
import { Toggle } from "~/components/ui/toggle";
import { Tooltip, TooltipPopup, TooltipTrigger } from "~/components/ui/tooltip";
import { OpenInPicker } from "~/components/chat/OpenInPicker";

export type ProjectEditorHeaderProps = {
  availableEditors: ReadonlyArray<EditorId>;
  browserOpen: boolean;
  browserToggleShortcutLabel: string | null;
  diffOpen: boolean;
  diffToggleShortcutLabel: string | null;
  isGitRepo: boolean;
  keybindings: ResolvedKeybindingsConfig;
  openInCwd: string | null;
  projectName: string;
  terminalOpen: boolean;
  terminalToggleShortcutLabel: string | null;
  onToggleBrowser: () => void;
  onToggleDiff: () => void;
  onToggleTerminal: () => void;
};

export function ProjectEditorHeader({
  availableEditors,
  browserOpen,
  browserToggleShortcutLabel,
  diffOpen,
  diffToggleShortcutLabel,
  isGitRepo,
  keybindings,
  openInCwd,
  projectName,
  terminalOpen,
  terminalToggleShortcutLabel,
  onToggleBrowser,
  onToggleDiff,
  onToggleTerminal,
}: ProjectEditorHeaderProps) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
        <div className="shrink-0">
          <SidebarTrigger className="size-7 shrink-0" />
        </div>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <h2
            className="truncate text-sm font-medium text-foreground"
            title={`${projectName} Editor`}
          >
            {projectName} Editor
          </h2>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2 [-webkit-app-region:no-drag]">
        <OpenInPicker
          keybindings={keybindings}
          availableEditors={availableEditors}
          openInCwd={openInCwd}
        />
        <Tooltip>
          <TooltipTrigger
            render={
              <Toggle
                className="shrink-0"
                pressed={terminalOpen}
                onPressedChange={onToggleTerminal}
                aria-label="Toggle terminal"
                variant="outline"
                size="xs"
              >
                <TerminalSquareIcon className="size-3" />
              </Toggle>
            }
          />
          <TooltipPopup side="bottom">
            {terminalToggleShortcutLabel
              ? `Toggle terminal (${terminalToggleShortcutLabel})`
              : "Toggle terminal"}
          </TooltipPopup>
        </Tooltip>
        {isElectron ? (
          <Tooltip>
            <TooltipTrigger
              render={
                <Toggle
                  className="shrink-0"
                  pressed={browserOpen}
                  onPressedChange={onToggleBrowser}
                  aria-label="Toggle browser panel"
                  variant="outline"
                  size="xs"
                >
                  <GlobeIcon className="size-3" />
                </Toggle>
              }
            />
            <TooltipPopup side="bottom">
              {browserToggleShortcutLabel
                ? `Toggle in-app browser (${browserToggleShortcutLabel})`
                : "Toggle in-app browser"}
            </TooltipPopup>
          </Tooltip>
        ) : null}
        <Tooltip>
          <TooltipTrigger
            render={
              <Toggle
                className="shrink-0"
                pressed={diffOpen}
                onPressedChange={onToggleDiff}
                aria-label="Toggle diff panel"
                variant="outline"
                size="xs"
                disabled={!isGitRepo}
              >
                <DiffIcon className="size-3" />
              </Toggle>
            }
          />
          <TooltipPopup side="bottom">
            {!isGitRepo
              ? "Diff panel is unavailable because this project is not a git repository."
              : diffToggleShortcutLabel
                ? `Toggle diff panel (${diffToggleShortcutLabel})`
                : "Toggle diff panel"}
          </TooltipPopup>
        </Tooltip>
      </div>
    </div>
  );
}
