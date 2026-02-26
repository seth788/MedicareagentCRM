"use client"

/**
 * App icons: Hugeicons (free set). Import from @/components/icons.
 * See https://hugeicons.com/docs/integrations/react/quick-start
 */
import React, { forwardRef } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import type { IconSvgElement } from "@hugeicons/react"
import {
  Add01Icon,
  AidsIcon,
  AiBrain01Icon,
  Alert01Icon,
  Appointment02Icon,
  ArrowDown01Icon,
  ArrowLeft01Icon,
  ArrowLeftRightIcon,
  ArrowRight01Icon,
  ArrowUp01Icon,
  ArrowUpDownIcon,
  BarChartIcon,
  BacteriaIcon,
  BirthdayCakeIcon,
  BloodIcon,
  Brain01Icon,
  Brain02Icon,
  Building01Icon,
  BulletIcon,
  Calendar01Icon,
  CalendarAdd01Icon,
  Cancel01Icon,
  CancelSquareIcon,
  Cardiogram02Icon,
  CheckmarkBadge01Icon,
  CheckmarkCircle01Icon,
  CheckmarkCircle02Icon,
  CheckmarkSquare01Icon,
  CircleIcon,
  Clock01Icon,
  ComputerIcon,
  DashboardSquare01Icon,
  Delete01Icon,
  Doctor01Icon,
  DrinkIcon,
  Exchange01Icon,
  GlobeIcon,
  GiveBloodIcon,
  Call02Icon,
  CallOutgoing04Icon,
  DragDropVerticalIcon,
  Edit03Icon,
  EyeIcon,
  File01Icon,
  FilterHorizontalIcon as FilterHorizontalIconSvg,
  FilterIcon as FilterIconSvg,
  HeartbreakIcon,
  HeartCheckIcon,
  Hospital02Icon,
  InformationCircleIcon,
  KanbanIcon,
  KidneysIcon,
  LiverIcon,
  Loading01Icon,
  Location03Icon,
  LungsIcon,
  Mail01Icon,
  Mailbox01Icon,
  Medicine01Icon,
  Message01Icon,
  Moon01Icon,
  Moon02Icon,
  MoreHorizontalIcon,
  PanelLeftIcon,
  PillIcon,
  PlusSignIcon,
  Search01Icon,
  SecurityLockIcon,
  SentIcon,
  Settings01Icon,
  SignatureIcon,
  Share05Icon,
  Shield01Icon,
  StethoscopeIcon,
  StickyNote01Icon,
  StickyNote02Icon,
  Sun01Icon,
  StarIcon,
  TableIcon as TableIconSvg,
  TaskRemove01Icon,
  Tick01Icon,
  UnavailableIcon,
  UserAdd01Icon,
  UserBlock02Icon,
  UserCircleIcon,
  UserGroupIcon,
  UserMinus01Icon,
  UserMinus02Icon,
} from "@hugeicons/core-free-icons"

type IconProps = React.ComponentProps<typeof HugeiconsIcon> & {
  icon: IconSvgElement
}

function createIcon(
  icon: IconSvgElement,
  displayName: string
): React.ForwardRefExoticComponent<Omit<IconProps, "icon"> & React.RefAttributes<SVGSVGElement>> {
  const Component = forwardRef<SVGSVGElement, Omit<IconProps, "icon">>(
    ({ size = 24, className, ...props }, ref) => (
      <HugeiconsIcon
        ref={ref}
        icon={icon}
        size={size}
        color="currentColor"
        strokeWidth={1.75}
        className={className}
        {...props}
      />
    )
  )
  Component.displayName = displayName
  return Component
}

// Export with Lucide-compatible names for drop-in replacement
export const X = createIcon(Cancel01Icon, "X")
export const Check = createIcon(CheckmarkCircle01Icon, "Check")
export const Tick01 = createIcon(Tick01Icon, "Tick01")
export const ChevronRight = createIcon(ArrowRight01Icon, "ChevronRight")
export const ChevronLeft = createIcon(ArrowLeft01Icon, "ChevronLeft")
export const ChevronDown = createIcon(ArrowDown01Icon, "ChevronDown")
export const ChevronUp = createIcon(ArrowUp01Icon, "ChevronUp")
export const Circle = createIcon(CircleIcon, "Circle")
export const ArrowLeft = createIcon(ArrowLeft01Icon, "ArrowLeft")
export const ArrowRight = createIcon(ArrowRight01Icon, "ArrowRight")
export const Dot = createIcon(BulletIcon, "Dot")
export const Plus = createIcon(Add01Icon, "Plus")
export const Search = createIcon(Search01Icon, "Search")
export const Phone = createIcon(Call02Icon, "Phone")
export const CallOutgoing = createIcon(CallOutgoing04Icon, "CallOutgoing")
export const Mail = createIcon(Mail01Icon, "Mail")
export const Sent = createIcon(SentIcon, "Sent")
export const Users = createIcon(UserGroupIcon, "Users")
export const UserPlus = createIcon(UserAdd01Icon, "UserPlus")
export const UserRound = createIcon(UserCircleIcon, "UserRound")
export const Doctor = createIcon(Doctor01Icon, "Doctor")
export const Hospital = createIcon(Hospital02Icon, "Hospital")
export const Calendar = createIcon(Calendar01Icon, "Calendar")
export const CalendarPlus = createIcon(CalendarAdd01Icon, "CalendarPlus")
export const AlertTriangle = createIcon(Alert01Icon, "AlertTriangle")
export const Info = createIcon(InformationCircleIcon, "Info")
export const BarChart3 = createIcon(BarChartIcon, "BarChart3")
export const Kanban = createIcon(KanbanIcon, "Kanban")
export const TableIcon = createIcon(TableIconSvg, "TableIcon")
export const Settings2 = createIcon(Settings01Icon, "Settings2")
export const MoreHorizontal = createIcon(MoreHorizontalIcon, "MoreHorizontal")
export const MoreVertical = createIcon(MoreHorizontalIcon, "MoreVertical")
export const ArrowUpDown = createIcon(ArrowUpDownIcon, "ArrowUpDown")
export const Trash2 = createIcon(Delete01Icon, "Trash2")
export const Eye = createIcon(EyeIcon, "Eye")
export const EyeOff = createIcon(EyeIcon, "EyeOff")
export const ArrowRightLeft = createIcon(ArrowLeftRightIcon, "ArrowRightLeft")
export const MessageSquare = createIcon(Message01Icon, "MessageSquare")
export const GripVertical = createIcon(DragDropVerticalIcon, "GripVertical")
export const Pencil = createIcon(Edit03Icon, "Pencil")
export const Star = createIcon(StarIcon, "Star")
export const Stethoscope = createIcon(StethoscopeIcon, "Stethoscope")
export const Pill = createIcon(PillIcon, "Pill")
export const Building2 = createIcon(Building01Icon, "Building2")
export const MapPin = createIcon(Location03Icon, "MapPin")
export const Shield = createIcon(Shield01Icon, "Shield")
export const ShieldAlert = createIcon(Shield01Icon, "ShieldAlert")
export const FileText = createIcon(File01Icon, "FileText")
export const Filter = createIcon(FilterIconSvg, "Filter")
export { Filter as FilterIcon }
export const FilterHorizontal = createIcon(FilterHorizontalIconSvg, "FilterHorizontal")
export const Moon = createIcon(Moon02Icon, "Moon")
export const Sun = createIcon(Sun01Icon, "Sun")
export const Monitor = createIcon(ComputerIcon, "Monitor")
export const PanelLeft = createIcon(PanelLeftIcon, "PanelLeft")
export const Cake = createIcon(BirthdayCakeIcon, "Cake")
export const Medicine = createIcon(Medicine01Icon, "Medicine")
export const LayoutDashboard = createIcon(DashboardSquare01Icon, "LayoutDashboard")
export const Settings = createIcon(Settings01Icon, "Settings")
export const User = createIcon(UserCircleIcon, "User")
export const Heart = createIcon(HeartCheckIcon, "Heart")
export const ShieldCheck = createIcon(Shield01Icon, "ShieldCheck")
export const StickyNote = createIcon(StickyNote01Icon, "StickyNote")
export const StickyNote2 = createIcon(StickyNote02Icon, "StickyNote2")
export const CalendarClock = createIcon(Calendar01Icon, "CalendarClock")
export const CheckCircle2 = createIcon(CheckmarkCircle02Icon, "CheckCircle2")
export const Clock = createIcon(Clock01Icon, "Clock")
export const Globe = createIcon(GlobeIcon, "Globe")
export const UserMinus = createIcon(UserMinus01Icon, "UserMinus")
export const Share05 = createIcon(Share05Icon, "Share05")

// Health tracker category icons
export const CheckmarkBadge = createIcon(CheckmarkBadge01Icon, "CheckmarkBadge")
export const Aids = createIcon(AidsIcon, "Aids")
export const Drink = createIcon(DrinkIcon, "Drink")
export const Lungs = createIcon(LungsIcon, "Lungs")
export const Brain01 = createIcon(Brain01Icon, "Brain01")
export const Kidneys = createIcon(KidneysIcon, "Kidneys")
export const Bacteria = createIcon(BacteriaIcon, "Bacteria")
export const Blood = createIcon(BloodIcon, "Blood")
export const Cardiogram02 = createIcon(Cardiogram02Icon, "Cardiogram02")
export const Heartbreak = createIcon(HeartbreakIcon, "Heartbreak")
export const Brain02 = createIcon(Brain02Icon, "Brain02")
export const GiveBlood = createIcon(GiveBloodIcon, "GiveBlood")
export const Liver = createIcon(LiverIcon, "Liver")
export const AiBrain01 = createIcon(AiBrain01Icon, "AiBrain01")

// Coverage status icons
export const Loading01 = createIcon(Loading01Icon, "Loading01")
export const Exchange01 = createIcon(Exchange01Icon, "Exchange01")
export const CancelSquare = createIcon(CancelSquareIcon, "CancelSquare")
export const TaskRemove01 = createIcon(TaskRemove01Icon, "TaskRemove01")
export const Unavailable = createIcon(UnavailableIcon, "Unavailable")
export const UserMinus02 = createIcon(UserMinus02Icon, "UserMinus02")
export const UserBlock02 = createIcon(UserBlock02Icon, "UserBlock02")
export const Appointment02 = createIcon(Appointment02Icon, "Appointment02")
export const Mailbox01 = createIcon(Mailbox01Icon, "Mailbox01")
export const Signature = createIcon(SignatureIcon, "Signature")
export const SecurityLock = createIcon(SecurityLockIcon, "SecurityLock")
