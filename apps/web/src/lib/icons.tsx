import { type FC, type SVGProps } from "react";
import { PiGitCommit, PiSquareSplitHorizontal, PiSquareSplitVertical } from "react-icons/pi";
import { RiApps2Line } from "react-icons/ri";
import { LuSplit } from "react-icons/lu";
import { TbArrowsRightLeft, TbPlug } from "react-icons/tb";
import {
  IconAdjustments,
  IconAlertCircle,
  IconAlertTriangle,
  IconArchive,
  IconArrowBackUp,
  IconArrowDown,
  IconArrowLeft,
  IconArrowRight,
  IconArrowsUpDown,
  IconBell,
  IconBolt,
  IconBrain,
  IconBug,
  IconCheck,
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconChevronUp,
  IconCircleCheck,
  IconCloudUpload,
  IconColumns2,
  IconCopy,
  IconDots,
  IconExternalLink,
  IconEye,
  IconFile,
  IconFlask2,
  IconFolder,
  IconFolderOpen,
  IconGitCompare,
  IconGitFork,
  IconGitPullRequest,
  IconEdit,
  IconInfoCircle,
  IconLayoutSidebarLeftCollapse,
  IconLayoutSidebarLeftExpand,
  IconLayoutSidebarRightCollapse,
  IconLayoutDistributeHorizontal,
  IconListCheck,
  IconListDetails,
  IconLoader2,
  IconLock,
  IconLockOpen,
  IconMaximize,
  IconMinimize,
  IconMicrophone,
  IconPalette,
  IconPaperclip,
  IconPin,
  IconPinnedFilled,
  IconPlayerPlay,
  IconPlayerStop,
  IconPlus,
  IconRefresh,
  IconRocket,
  IconRobot,
  IconRotate2,
  IconSearch,
  IconSelector,
  IconSettings,
  IconTerminal,
  IconTerminal2,
  IconTextWrap,
  IconTool,
  IconTrash,
  IconWorld,
  IconX,
  type TablerIcon,
} from "@tabler/icons-react";

// Keep the existing icon API stable while the app moves from Lucide to Tabler.
export type LucideIcon = FC<SVGProps<SVGSVGElement>>;

function adaptIcon(Component: TablerIcon): LucideIcon {
  return function AdaptedIcon(props) {
    return <Component {...(props as any)} />;
  };
}

export const AppsIcon: LucideIcon = (props) => (
  <RiApps2Line className={props.className} style={props.style} />
);
export const ArrowLeftIcon = adaptIcon(IconArrowLeft);
export const BellIcon = adaptIcon(IconBell);
export const ArrowRightIcon = adaptIcon(IconArrowRight);
export const ArrowDownIcon = adaptIcon(IconArrowDown);
export const ArrowUpDownIcon = adaptIcon(IconArrowsUpDown);
export const BotIcon = adaptIcon(IconRobot);
export const BugIcon = adaptIcon(IconBug);
export const CheckIcon = adaptIcon(IconCheck);
export const ChevronDownIcon = adaptIcon(IconChevronDown);
export const ChevronLeftIcon = adaptIcon(IconChevronLeft);
export const ChevronRightIcon = adaptIcon(IconChevronRight);
export const ChevronUpIcon = adaptIcon(IconChevronUp);
export const ChevronsUpDownIcon = adaptIcon(IconSelector);
export const CircleAlertIcon = adaptIcon(IconAlertCircle);
export const CircleCheckIcon = adaptIcon(IconCircleCheck);
export const CloudUploadIcon = adaptIcon(IconCloudUpload);
export const Columns2Icon = adaptIcon(IconColumns2);
export const CopyIcon = adaptIcon(IconCopy);
export const DiffIcon = adaptIcon(IconGitCompare);
export const EllipsisIcon = adaptIcon(IconDots);
export const ExternalLinkIcon = adaptIcon(IconExternalLink);
export const EyeIcon = adaptIcon(IconEye);
export const PaletteIcon = adaptIcon(IconPalette);
export const PaperclipIcon = adaptIcon(IconPaperclip);
export const AdjustmentsIcon = adaptIcon(IconAdjustments);
export const ArchiveIcon = adaptIcon(IconArchive);
export const BrainIcon = adaptIcon(IconBrain);
export const FileIcon = adaptIcon(IconFile);
export const FlaskConicalIcon = adaptIcon(IconFlask2);
export const FolderClosedIcon = adaptIcon(IconFolder);
export const FolderIcon = adaptIcon(IconFolder);
export const FolderOpenIcon = adaptIcon(IconFolderOpen);
export const GitCommitIcon: LucideIcon = (props) => (
  <PiGitCommit className={props.className} style={props.style} />
);
export const GitForkIcon = adaptIcon(IconGitFork);
export const GitPullRequestIcon = adaptIcon(IconGitPullRequest);
export const GlobeIcon = adaptIcon(IconWorld);
export const PlugIcon: LucideIcon = (props) => (
  <TbPlug className={props.className} style={props.style} />
);
export const HammerIcon = adaptIcon(IconTool);
export const HandoffIcon: LucideIcon = (props) => (
  <TbArrowsRightLeft className={props.className} style={props.style} />
);
export const InfoIcon = adaptIcon(IconInfoCircle);
export const ListChecksIcon = adaptIcon(IconListCheck);
export const ListTodoIcon = adaptIcon(IconListDetails);
export const Loader2Icon = adaptIcon(IconLoader2);
export const LoaderCircleIcon = adaptIcon(IconLoader2);
export const LoaderIcon = adaptIcon(IconLoader2);
export const LockIcon = adaptIcon(IconLock);
export const LockOpenIcon = adaptIcon(IconLockOpen);
export const Maximize2 = adaptIcon(IconMaximize);
export const Minimize2 = adaptIcon(IconMinimize);
export const MicIcon = adaptIcon(IconMicrophone);
export const PanelLeftCloseIcon = adaptIcon(IconLayoutSidebarLeftCollapse);
export const PanelLeftIcon = adaptIcon(IconLayoutSidebarLeftExpand);
export const PanelRightCloseIcon = adaptIcon(IconLayoutSidebarRightCollapse);
export const PinIcon = adaptIcon(IconPin);
export const PinnedFilledIcon = adaptIcon(IconPinnedFilled);
export const PlayIcon = adaptIcon(IconPlayerPlay);
export const Plus = adaptIcon(IconPlus);
export const PlusIcon = adaptIcon(IconPlus);
export const RefreshCwIcon = adaptIcon(IconRefresh);
export const RocketIcon = adaptIcon(IconRocket);
export const RotateCcwIcon = adaptIcon(IconRotate2);
export const Rows3Icon = adaptIcon(IconLayoutDistributeHorizontal);
export const SearchIcon = adaptIcon(IconSearch);
export const SettingsIcon = adaptIcon(IconSettings);
export const StopIcon = adaptIcon(IconPlayerStop);
export const SquarePenIcon = adaptIcon(IconEdit);
export const SquareSplitHorizontal: LucideIcon = (props) => (
  <PiSquareSplitHorizontal className={props.className} style={props.style} />
);
export const SquareSplitVertical: LucideIcon = (props) => (
  <PiSquareSplitVertical className={props.className} style={props.style} />
);
export const TerminalIcon = adaptIcon(IconTerminal);
export const TerminalSquare = adaptIcon(IconTerminal2);
export const TerminalSquareIcon = adaptIcon(IconTerminal2);
export const TextWrapIcon = adaptIcon(IconTextWrap);
export const Trash2 = adaptIcon(IconTrash);
export const TriangleAlertIcon = adaptIcon(IconAlertTriangle);
export const Undo2Icon = adaptIcon(IconArrowBackUp);
export const VSCodeEditorIcon: LucideIcon = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 100 100"
    fill="none"
    aria-hidden="true"
    {...props}
  >
    <path
      fill="currentColor"
      fillRule="evenodd"
      d="M70.912 99.317a6.223 6.223 0 0 0 4.96-.19l20.589-9.907A6.25 6.25 0 0 0 100 83.587V16.413a6.25 6.25 0 0 0-3.54-5.632L75.874.874a6.226 6.226 0 0 0-7.104 1.21L29.355 38.04 12.187 25.01a4.162 4.162 0 0 0-5.318.236l-5.506 5.009a4.168 4.168 0 0 0-.004 6.162L16.247 50 1.36 63.583a4.168 4.168 0 0 0 .004 6.162l5.506 5.01a4.162 4.162 0 0 0 5.318.236l17.168-13.032L68.77 97.917a6.217 6.217 0 0 0 2.143 1.4ZM75.015 27.3 45.11 50l29.906 22.701V27.3Z"
      clipRule="evenodd"
    />
  </svg>
);
export const WrenchIcon = adaptIcon(IconTool);
export const WorktreeIcon: LucideIcon = (props) => (
  <LuSplit
    className={props.className}
    style={{
      ...props.style,
      transform: `${props.style?.transform ?? ""} rotate(90deg)`.trim(),
    }}
  />
);
export const XIcon = adaptIcon(IconX);
export const ZapIcon = adaptIcon(IconBolt);
