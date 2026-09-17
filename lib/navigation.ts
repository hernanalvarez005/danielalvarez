import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  SprayCan,
  Sprout,
  Wheat,
  FlaskConical,
  Layers,
  Users,
  MapPinned,
  Package,
  UserCog,
  Tractor,
  Fuel,
  Wrench,
  Receipt,
  Landmark,
  Settings,
  ClipboardList,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  comingSoon?: boolean;
  /** Shown on the "Próximamente" page for this item. */
  description?: string;
}

export interface NavSection {
  label: string;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    label: "Inicio",
    items: [{ label: "Dashboard", href: "/dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Operaciones",
    items: [
      { label: "Pulverizaciones", href: "/pulverizaciones", icon: SprayCan },
      {
        label: "Siembra",
        href: "/proximamente/siembra",
        icon: Sprout,
        comingSoon: true,
        description: "Planificación y control de siembra: órdenes, densidad de siembra y monitoreo de lotes sembrados.",
      },
      {
        label: "Cosecha",
        href: "/proximamente/cosecha",
        icon: Wheat,
        comingSoon: true,
        description: "Registro de cosecha por lote, rendimientos y logística de camiones.",
      },
      {
        label: "Fertilización",
        href: "/proximamente/fertilizacion",
        icon: FlaskConical,
        comingSoon: true,
        description: "Órdenes de fertilización, dosis por nutriente y trazabilidad de aplicaciones.",
      },
      {
        label: "Otras labores",
        href: "/proximamente/otras-labores",
        icon: Layers,
        comingSoon: true,
        description: "Labores agrícolas adicionales que no encajan en un módulo dedicado.",
      },
    ],
  },
  {
    label: "Gestión",
    items: [
      { label: "Clientes", href: "/clientes", icon: Users },
      { label: "Campos y lotes", href: "/campos", icon: MapPinned },
      { label: "Productos", href: "/productos", icon: Package },
      { label: "Aplicadores", href: "/aplicadores", icon: UserCog },
    ],
  },
  {
    label: "Recursos",
    items: [
      {
        label: "Maquinaria",
        href: "/proximamente/maquinaria",
        icon: Tractor,
        comingSoon: true,
        description: "Inventario de maquinaria, horas de uso y disponibilidad por equipo.",
      },
      {
        label: "Combustible",
        href: "/proximamente/combustible",
        icon: Fuel,
        comingSoon: true,
        description: "Carga y consumo de combustible por equipo y por trabajo.",
      },
      {
        label: "Mantenimiento",
        href: "/proximamente/mantenimiento",
        icon: Wrench,
        comingSoon: true,
        description: "Planes de mantenimiento preventivo y órdenes de reparación de maquinaria.",
      },
    ],
  },
  {
    label: "Administración",
    items: [
      {
        label: "Facturación",
        href: "/proximamente/facturacion",
        icon: Receipt,
        comingSoon: true,
        description: "Facturación de trabajos realizados y conciliación con órdenes ejecutadas.",
      },
      {
        label: "Cuentas corrientes",
        href: "/proximamente/cuentas-corrientes",
        icon: Landmark,
        comingSoon: true,
        description: "Estado de cuenta por cliente: saldos, pagos y movimientos.",
      },
    ],
  },
  {
    label: "Sistema",
    items: [{ label: "Configuración", href: "/configuracion", icon: Settings }],
  },
];

export const ALL_NAV_ITEMS: NavItem[] = NAV_SECTIONS.flatMap((section) => section.items);

/**
 * Applicators work from a purpose-built mobile screen, not the
 * admin/engineer backoffice -- they get a deliberately minimal nav
 * instead of a role-filtered version of NAV_SECTIONS.
 */
export const APPLICATOR_NAV_SECTIONS: NavSection[] = [
  {
    label: "Inicio",
    items: [{ label: "Mis trabajos", href: "/mis-trabajos", icon: ClipboardList }],
  },
];
